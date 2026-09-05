package net.resline.przystan.clock

import android.content.Context
import android.os.*
import android.provider.Settings
import android.util.AtomicFile
import org.json.JSONObject
import java.io.File
import java.util.TimeZone
import java.util.concurrent.CopyOnWriteArraySet

/** Process-level owner. Activities/plugins only attach observers and send commands. */
class ClockRuntime private constructor(private val context: Context) {
    private val main = Handler(Looper.getMainLooper())
    private val config = JSONObject(context.assets.open("clock/config.json").bufferedReader().use { it.readText() })
    val model = ClockModel(config.getJSONObject("settings"))
    private val planner = PolishPlanner(config)
    private val stateFile = AtomicFile(File(context.filesDir, "speaking-clock-v1.json"))
    val diagnosticsFile = File(context.filesDir, "speaking-clock-diagnostics.jsonl")
    private val power = context.getSystemService(PowerManager::class.java)
    private val boot get() = Settings.Global.getInt(context.contentResolver, Settings.Global.BOOT_COUNT, -1)
    private val wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Przystan:SpeakingClock").apply { setReferenceCounted(false) }
    private var lastLockRenewal = 0L
    private var persistedAtLoad: JSONObject? = null
    private var revision = 0L
    private var generation = 0L
    private var pendingStartGeneration = 0L
    fun reserveStart(): Long = ++pendingStartGeneration
    fun isStartCurrent(token: Long) = token == pendingStartGeneration
    fun cancelPendingStart() { pendingStartGeneration++ }
    private var voiceError: String? = null
    private var error: String? = null
    private var lastText: String? = null
    private var outcome: JSONObject? = null
    private var playing = false
    private var preparing = false
    private val preparationWaiters = mutableListOf<(JSONObject) -> Unit>()
    val observers = CopyOnWriteArraySet<(JSONObject) -> Unit>()
    val requests = mutableMapOf<String, (JSONObject) -> Unit>()
    var service: SpeakingClockService? = null
    private val audio = VoiceAudio(context, ::log)
    private val ticker = object : Runnable {
        override fun run() {
            if (model.state != "running") return
            if (!batteryReady()) {
                execute("pause", JSONObject())
                model.interrupted = true
                error = "battery-required"
                persist(); publish(); return
            }
            holdCpu()
            tick()
            publish()
            if (model.state == "running") main.postDelayed(this, 1000)
        }
    }
    init {
        try {
            if (stateFile.baseFile.exists()) {
                val raw = JSONObject(stateFile.openRead().bufferedReader().use { it.readText() })
                persistedAtLoad = raw
                model.restore(raw, boot, wall(), mono(), false)
            }
        } catch (_: Exception) { error = "state-unreadable"; model.interrupted = true }
        log(JSONObject().put("event", "process-start").put("device", Build.MANUFACTURER + " " + Build.MODEL)
            .put("androidApi", Build.VERSION.SDK_INT).put("boot", boot).put("version", "1.0"))
    }
    fun batteryReady() = power.isIgnoringBatteryOptimizations(context.packageName)
    fun prepare(done: (JSONObject) -> Unit) {
        preparationWaiters.add(done)
        if (preparing) return
        preparing = true
        audio.prepare { failure ->
            voiceError = failure
            preparing = false
            publish()
            val waiters = preparationWaiters.toList(); preparationWaiters.clear()
            waiters.forEach { it(snapshot()) }
        }
    }
    private fun holdCpu() {
        if (model.state != "running") return
        val now = mono()
        if (!wakeLock.isHeld || now - lastLockRenewal >= 5 * 60_000) {
            wakeLock.acquire(10 * 60_000L)
            lastLockRenewal = now
        }
    }
    private fun releaseCpu() { if (wakeLock.isHeld) wakeLock.release() }
    private fun beginTicking() {
        main.removeCallbacks(ticker)
        holdCpu()
        main.post(ticker)
    }
    fun execute(action: String, args: JSONObject): JSONObject {
        check(Looper.myLooper() == Looper.getMainLooper())
        val w = wall(); val m = mono()
        val wasTerminal = model.terminalPending
        try {
            error = null
            when (action) {
                "start", "resume" -> {
                    require(service != null) { "service-unavailable" }
                    require(audio.ready) { "voice-not-ready" }
                    require(batteryReady()) { "battery-required" }
                    if (action == "start") model.start(w, m) else model.resume(w, m)
                    if (model.state == "running") beginTicking()
                }
                "pause" -> {
                    cancelPendingStart()
                    generation++
                    audio.cancel(); playing = false
                    model.pause(w, m)
                    main.removeCallbacks(ticker); releaseCpu()
                }
                "stop" -> {
                    cancelPendingStart()
                    generation++
                    audio.cancel(); playing = false
                    model.stop(); outcome = null
                    main.removeCallbacks(ticker); releaseCpu()
                    context.getSystemService(android.app.NotificationManager::class.java)
                        .cancel(SpeakingClockService.NOTIFICATION)
                }
                "settings" -> model.update(args.getJSONObject("settings"), w, m)
                "adjust" -> model.adjust(args.getInt("minutes"), w, m)
                "test" -> {
                    require(audio.ready) { "voice-not-ready" }
                    announce(planner.time(w, model.settings.getString("formatStyle"), model.elapsed(m) / 60_000, zone = model.zone), w, false)
                }
                else -> throw IllegalArgumentException("unknown-command")
            }
            if (wasTerminal && !model.terminalPending && model.state == "running") {
                generation++; audio.cancel(); playing = false
            }
            persistedAtLoad = null
            persist()
            if (action in listOf("settings", "adjust")) tick()
        } catch (e: Exception) {
            error = e.message ?: "clock-error"
            log(JSONObject().put("event", "command-failed").put("action", action).put("reason", error))
            if (action == "start" || action == "resume") {
                generation++; audio.cancel(); playing = false
                model.pause(w, m); model.interrupted = true
                main.removeCallbacks(ticker); releaseCpu()
            }
        }
        log(JSONObject().put("event", "command").put("action", action).put("state", model.state).put("runId", model.runId))
        service?.updateNotification()
        if (model.state != "running") service?.endForeground(model.state == "paused")
        publish()
        return snapshot()
    }
    /** Only Android's sticky-service recreation may resume a persisted running run. */
    fun recoverFromSystem(done: () -> Unit) {
        val raw = persistedAtLoad
        persistedAtLoad = null
        if (raw == null || raw.optString("state") != "running") { done(); return }
        val token = reserveStart()
        prepare {
            if (!isStartCurrent(token) || service == null) { done(); return@prepare }
            try {
                model.restore(raw, boot, wall(), mono(), true)
                require(audio.ready && batteryReady()) { "background-not-ready" }
                if (model.state == "running") beginTicking()
            } catch (e: Exception) {
                model.pause(wall(), mono()); model.interrupted = true; error = e.message
            }
            persist(); publish(); done()
        }
    }
    private fun tick() {
        if (playing) return
        val due = model.tick(wall(), mono()) ?: return
        // Durable mark before playback prevents duplicate delivery after recreation.
        if (!persist()) return
        val plan = if (model.mode == "departure") planner.departure(due.remainingSeconds,
            model.settings.getJSONObject("departure").getString("label"), model.target(), due.terminal, model.zone)
            else planner.time(wall(), if (due.terminal) "elapsed" else model.settings.getString("formatStyle"), model.elapsed(mono()) / 60_000, due.terminal, model.zone)
        announce(plan, due.scheduledAt, due.terminal)
    }
    private fun announce(plan: PolishPlanner.Plan, scheduledAt: Long, terminal: Boolean) {
        generation++
        val token = generation
        audio.cancel()
        playing = true
        lastText = plan.text
        val runId = model.runId
        log(JSONObject().put("event", "scheduled").put("scheduledAt", scheduledAt).put("runId", runId).put("terminal", terminal))
        audio.play(plan, JSONObject(model.settings.toString()), runId, scheduledAt) { result ->
            log(JSONObject().put("event", "audio-end").put("scheduledAt", scheduledAt).put("runId", runId).put("result", result))
            if (token != generation) return@play
            playing = false
            outcome = JSONObject().put("status", if (result == "completed") "completed" else if (result == "cancelled") "cancelled" else "failed")
                .put("attempts", 1).put("visibilityState", "unknown").apply { if (result != "completed") put("errorCode", result) }
            if (terminal && model.runId == runId && model.state == "running") {
                model.stop(); main.removeCallbacks(ticker); releaseCpu()
                service?.updateNotification(); service?.endForeground(false)
            }
            persist(); publish()
        }
        service?.updateNotification()
        publish()
    }
    fun timeChanged() {
        model.timeChanged(wall(), mono(), TimeZone.getDefault())
        persist(); tick(); service?.updateNotification(); publish()
    }
    fun noisy() {
        if (model.state == "running") {
            execute("pause", JSONObject()); model.interrupted = true; error = "audio-route-disconnected"
            persist(); publish()
        } else audio.cancel("audio-route-disconnected")
    }
    fun onServiceDestroyed(host: SpeakingClockService) {
        if (service !== host) return
        service = null
        if (model.state == "running") {
            generation++; audio.cancel(); playing = false
            model.pause(wall(), mono()); model.interrupted = true
            main.removeCallbacks(ticker); persist()
        }
        releaseCpu(); publish()
    }
    fun snapshot(): JSONObject {
        val w = wall(); val m = mono()
        return JSONObject().put("revision", ++revision).put("state", model.state).put("settings", JSONObject(model.settings.toString()))
            .put("voiceReady", audio.ready).put("voiceError", voiceError ?: JSONObject.NULL)
            .put("protection", if (batteryReady()) "ready" else "battery-required")
            .put("interrupted", model.interrupted).put("error", error ?: JSONObject.NULL)
            .put("currentTime", w).put("nextAnnouncementTime", if (model.state == "idle") JSONObject.NULL else model.next(w, m))
            .put("elapsedSeconds", model.elapsed(m) / 1000)
            .put("secondsUntilNext", if (model.state == "idle") 0 else maxOf(0L, kotlin.math.ceil((model.next(w, m) - w) / 1000.0).toLong()))
            .put("lastAnnouncementText", lastText ?: JSONObject.NULL).put("speechOutcome", outcome ?: JSONObject.NULL)
            .apply { if (model.mode != "continuous" && model.state != "idle") put("secondsRemaining", model.remaining(w, m)).put("totalSeconds", model.total()) }
    }
    fun publish() {
        val state = snapshot()
        observers.forEach { it(state) }
    }
    private fun persist(): Boolean {
        var stream: java.io.FileOutputStream? = null
        return try {
            stream = stateFile.startWrite()
            stream.write(model.save(boot, mono()).toString().toByteArray())
            stateFile.finishWrite(stream)
            true
        } catch (_: Exception) {
            stateFile.failWrite(stream)
            error = "state-write-failed"
            generation++; audio.cancel(); playing = false
            model.pause(wall(), mono()); model.interrupted = true
            main.removeCallbacks(ticker); releaseCpu()
            service?.endForeground(model.state == "paused")
            publish()
            false
        }
    }
    @Synchronized fun log(event: JSONObject) {
        try {
            event.put("recordedAt", wall())
            if ((context.applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
                android.util.Log.i("PrzystanClock", event.toString())
            }
            if (diagnosticsFile.length() > 2 * 1024 * 1024) {
                val bytes = diagnosticsFile.readBytes()
                val tail = bytes.copyOfRange(bytes.size / 2, bytes.size).toString(Charsets.UTF_8).substringAfter('\n', "")
                diagnosticsFile.writeText(tail)
            }
            diagnosticsFile.appendText(event.toString() + "\n")
        } catch (_: Exception) { /* Diagnostics cannot prevent clock commands. */ }
    }
    companion object {
        @Volatile private var instance: ClockRuntime? = null
        @Synchronized fun get(context: Context): ClockRuntime = instance ?: ClockRuntime(context.applicationContext).also { instance = it }
        fun wall() = System.currentTimeMillis()
        fun mono() = SystemClock.elapsedRealtime()
    }
}
