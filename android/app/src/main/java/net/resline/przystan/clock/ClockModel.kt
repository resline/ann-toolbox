package net.resline.przystan.clock

import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar
import java.util.TimeZone
import java.util.UUID
import kotlin.math.ceil
import kotlin.math.max

/** Pure scheduling model. The service is the sole writer, on its main looper. */
class ClockModel(defaults: JSONObject, var zone: TimeZone = TimeZone.getDefault()) {
    var settings = JSONObject(defaults.toString()); private set
    var state = "idle"; private set
    var runId = ""; private set
    var interrupted = false
    var terminalPending = false; private set
    private var accumulated = 0L
    private var startedMono = 0L
    private var nextMono = 0L
    private var nextWall = 0L
    private var relativeRemaining = 0L
    private var resetOnResume = false
    private var departureTarget = 0L
    private var departureSpan = 0L
    private val milestones = mutableSetOf<Int>()
    val mode get() = settings.getString("mode")
    val interval get() = settings.getInt("intervalMinutes")
    val synced get() = settings.getBoolean("clockSync")
    private val departure get() = settings.getJSONObject("departure")
    fun elapsed(mono: Long) = max(0, accumulated + if (state == "running") mono - startedMono else 0)
    fun remaining(wall: Long, mono: Long): Long = when (mode) {
        "departure" -> max(0, (departureTarget - wall) / 1000)
        "focus" -> max(0, settings.getLong("focusDurationMinutes") * 60 - elapsed(mono) / 1000)
        else -> max(0, ceil((next(wall, mono) - wall) / 1000.0).toLong())
    }
    fun total() = when (mode) {
        "departure" -> departureSpan
        "focus" -> settings.getLong("focusDurationMinutes") * 60
        else -> 3600L
    }
    fun next(wall: Long, mono: Long): Long {
        if (state == "idle") return 0
        if (mode == "departure") {
            val rem = remaining(wall, mono)
            val future = thresholds().firstOrNull { it * 60L < rem && it !in milestones }
            return if (future == null) departureTarget else departureTarget - future * 60_000L
        }
        val cadence = if (synced) nextWall else wall + if (state == "paused") relativeRemaining else nextMono - mono
        val finale = wall + max(0, settings.getLong("focusDurationMinutes") * 60_000 - elapsed(mono))
        return if (mode == "focus") minOf(cadence, finale) else cadence
    }
    fun target() = departureTarget
    fun thresholds(): List<Int> {
        if (departure.getBoolean("smartDensity")) return listOf(120,90,60,45,30,20,15,10,5,4,3,2,1,0)
        val custom = departure.optJSONArray("customMilestonesMinutes")
        if (custom != null && custom.length() > 0) return (0 until custom.length()).map { custom.getInt(it) }.plus(0).distinct().sortedDescending()
        val every = departure.optInt("intervalMinutes", 2).coerceAtLeast(1)
        return (0..720 step every).reversed().toList()
    }
    private fun markPast(wall: Long, mono: Long) {
        milestones.clear()
        val rem = remaining(wall, mono)
        milestones.addAll(thresholds().filter { it > 0 && it * 60L >= rem })
    }
    private fun resetCadence(wall: Long, mono: Long) {
        nextMono = mono + interval * 60_000L
        relativeRemaining = interval * 60_000L
        nextWall = nextBoundary(wall, interval, zone)
    }
    fun start(wall: Long, mono: Long) {
        if (state == "running") return
        if (state == "paused") { resume(wall, mono); return }
        runId = UUID.randomUUID().toString()
        accumulated = 0
        startedMono = mono
        terminalPending = false
        interrupted = false
        resetOnResume = false
        state = "running"
        if (mode == "departure") {
            departureTarget = targetTimestamp(wall, departure.getString("targetTime"), zone)
            departureSpan = max(1, remaining(wall, mono))
            markPast(wall, mono)
        }
        resetCadence(wall, mono)
    }
    fun pause(wall: Long, mono: Long) {
        if (state != "running") return
        accumulated = elapsed(mono)
        relativeRemaining = max(0, nextMono - mono)
        state = "paused"
        // A finale is not replayed after a user pauses halfway through it.
        if (terminalPending) { stop(); return }
    }
    fun resume(wall: Long, mono: Long) {
        if (state != "paused") return
        startedMono = mono
        state = "running"
        interrupted = false
        if (mode == "departure") markPast(wall, mono)
        if (resetOnResume) resetCadence(wall, mono)
        else if (synced) nextWall = nextBoundary(wall, interval, zone)
        else nextMono = mono + relativeRemaining
        resetOnResume = false
    }
    fun stop() {
        state = "idle"
        terminalPending = false
        accumulated = 0
        interrupted = false
        nextWall = 0
        nextMono = 0
        milestones.clear()
    }
    fun update(patch: JSONObject, wall: Long, mono: Long) {
        val next = merge(settings, patch)
        validate(next)
        require(state == "idle" || next.getString("mode") == mode) { "mode-locked" }
        val changedCadence = next.getInt("intervalMinutes") != interval || next.getBoolean("clockSync") != synced
        val dep = next.getJSONObject("departure")
        val changedTarget = dep.getString("targetTime") != departure.getString("targetTime")
        val changedDepartureCadence = dep.getBoolean("smartDensity") != departure.getBoolean("smartDensity") ||
            dep.optInt("intervalMinutes", 2) != departure.optInt("intervalMinutes", 2) ||
            dep.optJSONArray("customMilestonesMinutes")?.toString() != departure.optJSONArray("customMilestonesMinutes")?.toString()
        settings = next
        if (terminalPending && mode == "focus" && remaining(wall, mono) > 0) terminalPending = false
        if (state != "idle" && mode == "departure") {
            if (changedTarget) {
                departureTarget = targetTimestamp(wall, dep.getString("targetTime"), zone)
                departureSpan = max(1, remaining(wall, mono))
                if (remaining(wall, mono) > 0) terminalPending = false
            }
            if (changedTarget || changedDepartureCadence) markPast(wall, mono)
        } else if (changedCadence) {
            if (state == "running") resetCadence(wall, mono)
            if (state == "paused") resetOnResume = true
        }
    }
    fun adjust(minutes: Int, wall: Long, mono: Long) {
        require(minutes in -1440..1440) { "invalid-adjustment" }
        when (mode) {
            "departure" -> {
                if (state == "idle") {
                    val parts = departure.getString("targetTime").split(':').map(String::toInt)
                    val value = Math.floorMod(parts[0] * 60 + parts[1] + minutes, 1440)
                    update(JSONObject().put("departure", JSONObject().put("targetTime", "%02d:%02d".format(value / 60, value % 60))), wall, mono)
                } else {
                    departureTarget += minutes * 60_000L
                    departureSpan = max(1, departureSpan + minutes * 60L)
                    if (remaining(wall, mono) > 0) terminalPending = false
                    val calendar = Calendar.getInstance(zone).apply { timeInMillis = departureTarget }
                    settings.getJSONObject("departure").put("targetTime", "%02d:%02d".format(calendar.get(Calendar.HOUR_OF_DAY), calendar.get(Calendar.MINUTE)))
                    markPast(wall, mono)
                }
            }
            "focus" -> update(JSONObject().put("focusDurationMinutes", (settings.getInt("focusDurationMinutes") + minutes).coerceIn(1, 1440)), wall, mono)
            else -> update(JSONObject().put("intervalMinutes", (interval + minutes).coerceIn(1, 60)), wall, mono)
        }
    }
    data class Due(val scheduledAt: Long, val terminal: Boolean, val remainingSeconds: Long)
    fun tick(wall: Long, mono: Long): Due? {
        if (state != "running" || terminalPending) return null
        if (mode == "departure") {
            val rem = remaining(wall, mono)
            val reached = thresholds().filter { rem <= it * 60L && it !in milestones }
            if (reached.isEmpty()) return null
            val scheduled = departureTarget - reached.last() * 60_000L
            milestones.addAll(reached)
            terminalPending = rem == 0L
            return Due(scheduled, terminalPending, rem)
        }
        if (mode == "focus" && remaining(wall, mono) == 0L) {
            terminalPending = true
            return Due(wall - max(0, elapsed(mono) - settings.getLong("focusDurationMinutes") * 60_000), true, 0)
        }
        val next = next(wall, mono)
        if (wall < next) return null
        resetCadence(wall, mono)
        return Due(next, false, 0)
    }
    fun timeChanged(wall: Long, mono: Long, newZone: TimeZone) {
        zone = newZone
        if (state != "idle" && synced && mode != "departure") nextWall = nextBoundary(wall, interval, zone)
        // Departure retains the already selected absolute occurrence; never rolls an active run to tomorrow.
    }
    fun save(boot: Int, mono: Long? = null) = JSONObject().put("schema", 1).put("boot", boot).put("settings", settings)
        .put("elapsedAtSave", if (mono == null) accumulated else elapsed(mono))
        .put("relativeAtSave", if (mono == null || state != "running") relativeRemaining else max(0, nextMono - mono))
        .put("state", state).put("runId", runId).put("accumulated", accumulated).put("startedMono", startedMono)
        .put("nextMono", nextMono).put("nextWall", nextWall).put("relativeRemaining", relativeRemaining)
        .put("resetOnResume", resetOnResume).put("departureTarget", departureTarget).put("departureSpan", departureSpan)
        .put("milestones", JSONArray(milestones.toList())).put("terminalPending", terminalPending).put("interrupted", interrupted)
    fun restore(raw: JSONObject, boot: Int, wall: Long, mono: Long, systemRestart: Boolean) {
        require(raw.getInt("schema") == 1) { "state-schema" }
        validate(raw.getJSONObject("settings"))
        settings = JSONObject(raw.getJSONObject("settings").toString())
        state = raw.getString("state")
        require(state in listOf("idle", "paused", "running")) { "state-invalid" }
        runId = raw.optString("runId")
        accumulated = raw.optLong("accumulated")
        startedMono = raw.optLong("startedMono")
        nextMono = raw.optLong("nextMono")
        nextWall = raw.optLong("nextWall")
        relativeRemaining = raw.optLong("relativeRemaining")
        resetOnResume = raw.optBoolean("resetOnResume")
        departureTarget = raw.optLong("departureTarget")
        departureSpan = raw.optLong("departureSpan")
        milestones.clear()
        raw.optJSONArray("milestones")?.let { array -> repeat(array.length()) { milestones.add(array.getInt(it)) } }
        terminalPending = raw.optBoolean("terminalPending")
        interrupted = raw.optBoolean("interrupted")
        if (terminalPending) { stop(); interrupted = true; return }
        if (state == "running" && (!systemRestart || boot != raw.optInt("boot", -1))) {
            accumulated = raw.optLong("elapsedAtSave", accumulated)
            relativeRemaining = raw.optLong("relativeAtSave", relativeRemaining)
            // Explicit reopen uses the checkpoint; sticky recreation includes the process gap.
            if (boot != raw.optInt("boot", -1)) resetOnResume = true
            state = "paused"
            interrupted = true
        }
        if (mode == "departure" && state == "running" && departureTarget < wall) {
            // tick emits one terminal event, never a backlog of milestones.
            milestones.remove(0)
        }
    }
    companion object {
        fun merge(base: JSONObject, patch: JSONObject): JSONObject {
            val result = JSONObject(base.toString())
            patch.keys().forEach { key ->
                require(result.has(key) || (key == "customMilestonesMinutes" && base.has("smartDensity"))) { "unknown-setting" }
                val value = patch.get(key)
                result.put(key, if (value is JSONObject && result.optJSONObject(key) != null) merge(result.getJSONObject(key), value) else value)
            }
            return result
        }
        fun validate(s: JSONObject) {
            require(s.getInt("intervalMinutes") in 1..60 && s.getDouble("intervalMinutes") == s.getInt("intervalMinutes").toDouble()) { "invalid-interval" }
            require(s.getInt("focusDurationMinutes") in 1..1440 && s.getDouble("focusDurationMinutes") == s.getInt("focusDurationMinutes").toDouble()) { "invalid-duration" }
            require(s.getString("mode") in listOf("continuous", "focus", "departure")) { "invalid-mode" }
            require(s.getString("formatStyle") in listOf("natural", "precise", "short", "elapsed")) { "invalid-style" }
            require(s.getString("chimeTone") in listOf("gentle", "warm", "bright")) { "invalid-chime" }
            for (key in listOf("volume", "chimeVolume")) require(s.getDouble(key).isFinite() && s.getDouble(key) in 0.0..1.0) { "invalid-volume" }
            s.getBoolean("clockSync"); s.getBoolean("keepAwake"); s.getBoolean("chimeEnabled")
            val d = s.getJSONObject("departure")
            require(Regex("(?:[01][0-9]|2[0-3]):[0-5][0-9]").matches(d.getString("targetTime"))) { "invalid-target" }
            require(d.getString("label").length <= 500) { "invalid-label" }
            d.getBoolean("smartDensity")
            require(d.optInt("intervalMinutes", 2) in 1..60) { "invalid-departure-interval" }
            d.optJSONArray("customMilestonesMinutes")?.let { a ->
                require(a.length() <= 1441) { "too-many-milestones" }
                repeat(a.length()) { require(a.getInt(it) in 0..1440) { "invalid-milestone" } }
            }
        }
        fun nextBoundary(wall: Long, interval: Int, zone: TimeZone): Long {
            val c = Calendar.getInstance(zone).apply { timeInMillis = wall }
            val nextMinute = (c.get(Calendar.MINUTE) / interval + 1) * interval
            c.set(Calendar.SECOND, 0); c.set(Calendar.MILLISECOND, 0); c.set(Calendar.MINUTE, nextMinute)
            while (c.timeInMillis <= wall) c.add(Calendar.MINUTE, interval)
            return c.timeInMillis
        }
        fun targetTimestamp(wall: Long, hhmm: String, zone: TimeZone): Long {
            val parts = hhmm.split(':').map(String::toInt)
            val c = Calendar.getInstance(zone).apply {
                timeInMillis = wall; set(Calendar.HOUR_OF_DAY, parts[0]); set(Calendar.MINUTE, parts[1]); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
            }
            if (c.timeInMillis < wall - 60_000) c.add(Calendar.DATE, 1)
            return c.timeInMillis
        }
    }
}
