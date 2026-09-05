package net.resline.przystan.clock

import android.content.Context
import android.media.*
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import org.json.JSONObject
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.security.MessageDigest
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger
import kotlin.math.*

/** Audio I/O is independent of the WebView. Each phrase is a complete PCM buffer. */
class VoiceAudio(private val context: Context, private val log: (JSONObject) -> Unit) {
    private val io = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())
    private val generation = AtomicInteger()
    private val manager = context.getSystemService(AudioManager::class.java)
    private val attrs = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build()
    @Volatile private var voice: ShortArray? = null
    @Volatile private var track: AudioTrack? = null
    private var manifest: JSONObject? = null
    private var config: JSONObject? = null
    private var focus: AudioFocusRequest? = null
    private var activeCompletion: ((String) -> Unit)? = null
    private val focusListener = AudioManager.OnAudioFocusChangeListener { change ->
        if (change < 0) main.post { cancel("audio-focus-lost") }
    }
    val ready get() = voice != null
    fun prepare(completion: (String?) -> Unit) {
        if (ready) { completion(null); return }
        io.execute {
            val error = try {
                val m = JSONObject(context.assets.open("clock/manifest.json").bufferedReader().use { it.readText() })
                require(m.getInt("schemaVersion") == 1 && m.getString("grammarVersion") == "pl-clock-fragments-v1") { "manifest-invalid" }
                require(m.getInt("channels") == 1 && m.getInt("sourceSampleRateHz") == RATE) { "manifest-invalid" }
                val size = m.getInt("pcmBytes")
                require(size > 0 && size.toLong() * 2 <= 48 * 1024 * 1024 && size % 2 == 0) { "memory-limit" }
                val bytes = context.assets.open("clock/voice.pcm").use { input ->
                    val buffer = ByteArray(size)
                    var offset = 0
                    while (offset < size) {
                        val n = input.read(buffer, offset, size - offset)
                        require(n > 0) { "pack-incomplete" }
                        offset += n
                    }
                    require(input.read() == -1) { "manifest-invalid" }
                    buffer
                }
                val hash = MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
                require(hash == m.getString("pcmSha256")) { "integrity-failed" }
                val fragments = m.getJSONObject("fragments")
                require(fragments.length() == 337) { "pack-incomplete" }
                fragments.keys().forEach { id ->
                    val f = fragments.getJSONObject(id)
                    val start = f.getLong("startFrame"); val count = f.getLong("frameCount")
                    require(start >= 0 && count > 0 && start + count <= size / 2) { "manifest-invalid" }
                }
                val decoded = ShortArray(size / 2)
                ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer().get(decoded)
                config = JSONObject(context.assets.open("clock/config.json").bufferedReader().use { it.readText() })
                manifest = m
                voice = decoded
                null
            } catch (e: Exception) { e.message ?: "decode-failed" }
            main.post { completion(error) }
        }
    }
    fun cancel(reason: String = "cancelled") {
        generation.incrementAndGet()
        try { track?.pause(); track?.flush() } catch (_: Exception) { }
        abandonFocus()
        val completion = activeCompletion
        activeCompletion = null
        completion?.invoke(reason)
    }
    private fun abandonFocus() {
        if (Build.VERSION.SDK_INT >= 26) focus?.let { manager.abandonAudioFocusRequest(it) }
        else @Suppress("DEPRECATION") manager.abandonAudioFocus(focusListener)
        focus = null
    }
    private fun requestFocus(): Boolean {
        val result = if (Build.VERSION.SDK_INT >= 26) {
            val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                .setAudioAttributes(attrs).setAcceptsDelayedFocusGain(false)
                .setOnAudioFocusChangeListener(focusListener, main).build()
            focus = request
            manager.requestAudioFocus(request)
        } else {
            @Suppress("DEPRECATION")
            manager.requestAudioFocus(focusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
        }
        return result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
    }
    fun play(plan: PolishPlanner.Plan, settings: JSONObject, runId: String, scheduledAt: Long, completion: (String) -> Unit) {
        cancel()
        if (!ready) { completion("voice-not-ready"); return }
        if (manager.mode in listOf(AudioManager.MODE_IN_CALL, AudioManager.MODE_IN_COMMUNICATION, AudioManager.MODE_RINGTONE)) {
            completion("call-active"); return
        }
        if (!requestFocus()) { abandonFocus(); completion("audio-focus-denied"); return }
        if (manager.getStreamVolume(AudioManager.STREAM_MUSIC) == 0 || manager.isStreamMute(AudioManager.STREAM_MUSIC)) {
            abandonFocus(); completion("media-muted"); return
        }
        activeCompletion = completion
        val token = generation.get()
        io.execute {
            var output: AudioTrack? = null
            val result = try {
                val pcm = render(plan, settings)
                require(pcm.any { it.toInt() != 0 }) { "media-muted" }
                if (token != generation.get()) return@execute
                output = AudioTrack.Builder().setAudioAttributes(attrs)
                    .setAudioFormat(AudioFormat.Builder().setSampleRate(RATE).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).setEncoding(AudioFormat.ENCODING_PCM_16BIT).build())
                    .setBufferSizeInBytes(pcm.size * 2).setTransferMode(AudioTrack.MODE_STATIC).build()
                // MODE_STATIC starts in STATE_NO_STATIC_DATA until the first write.
                require(output.state != AudioTrack.STATE_UNINITIALIZED) { "audio-init-failed" }
                require(output.write(pcm, 0, pcm.size, AudioTrack.WRITE_BLOCKING) == pcm.size) { "audio-write-failed" }
                require(output.state == AudioTrack.STATE_INITIALIZED) { "audio-init-failed" }
                if (token != generation.get()) return@execute
                track = output
                val started = SystemClock.elapsedRealtime()
                output.play()
                var firstFrame = false
                while (token == generation.get() && output.playbackHeadPosition < pcm.size) {
                    val frames = output.playbackHeadPosition
                    if (!firstFrame && frames > 0) {
                        firstFrame = true
                        // Observed frame progress, not merely a successful call to play().
                        log(JSONObject().put("event", "audio-start").put("runId", runId).put("scheduledAt", scheduledAt)
                            .put("actualAudioStart", System.currentTimeMillis() - frames * 1000L / RATE))
                    }
                    require(SystemClock.elapsedRealtime() - started < pcm.size * 1000L / RATE + 5000) { "audio-stalled" }
                    Thread.sleep(10)
                }
                if (token == generation.get()) "completed" else "cancelled"
            } catch (e: Exception) { e.message ?: "audio-failed" }
            finally {
                if (track === output) track = null
                try { output?.stop() } catch (_: Exception) { }
                output?.release()
            }
            main.post {
                if (token != generation.get()) return@post
                abandonFocus()
                val done = activeCompletion; activeCompletion = null
                done?.invoke(result)
            }
        }
    }
    private fun render(plan: PolishPlanner.Plan, s: JSONObject): ShortArray {
        val samples = voice ?: error("voice-not-ready")
        val fragments = manifest!!.getJSONObject("fragments")
        val volume = s.getDouble("volume")
        val withChime = s.getBoolean("chimeEnabled") && s.getDouble("chimeVolume") > 0
        val prefix = ((if (withChime) 0.81 else 0.0) * RATE).toInt() + (0.08 * RATE).toInt()
        val lengths = plan.fragments.map { fragments.getJSONObject(it.id).getInt("frameCount") + (GAPS[it.joinAfter] ?: 0.0).times(RATE).roundToInt() }
        val total = prefix + lengths.sum()
        require(total in 1..(RATE * 120)) { "phrase-too-long" }
        val result = ShortArray(total)
        if (withChime) renderChime(result, s.getString("chimeTone"), s.getDouble("chimeVolume"))
        var cursor = prefix
        for ((i, p) in plan.fragments.withIndex()) {
            val fragment = fragments.getJSONObject(p.id)
            val start = fragment.getInt("startFrame"); val count = fragment.getInt("frameCount")
            val fade = min((0.006 * RATE).toInt(), count / 4).coerceAtLeast(1)
            for (frame in 0 until count) {
                val envelope = min(1.0, min(frame.toDouble() / fade, (count - frame).toDouble() / fade))
                result[cursor + frame] = (samples[start + frame] * volume * envelope).roundToInt().coerceIn(-32768, 32767).toShort()
            }
            cursor += lengths[i]
        }
        return result
    }
    private fun renderChime(result: ShortArray, tone: String, volume: Double) {
        val components = config!!.getJSONObject("chimes").getJSONObject(tone).getJSONArray("components")
        for (i in 0 until (0.76 * RATE).toInt()) {
            val t = i.toDouble() / RATE
            val envelope = when {
                t < 0.04 -> 0.0001 + (volume - 0.0001) * t / 0.04
                t < 0.16 -> volume * 0.3.pow((t - 0.04) / 0.12)
                else -> volume * 0.3 * (0.0001 / (volume * 0.3)).pow((t - 0.16) / 0.6)
            }
            var value = 0.0
            repeat(components.length()) { n ->
                val c = components.getJSONObject(n)
                val wave = sin(2 * PI * c.getDouble("frequency") * t)
                value += (if (c.optString("type") == "triangle") 2 / PI * asin(wave) else wave) * c.getDouble("gain")
            }
            result[i] = (value * envelope * 32767).roundToInt().coerceIn(-32768, 32767).toShort()
        }
    }
    companion object {
        const val RATE = 24000
        val GAPS = mapOf("tight-word" to 0.018, "neutral-word" to 0.065, "colon" to 0.12, "sentence" to 0.24)
    }
}
