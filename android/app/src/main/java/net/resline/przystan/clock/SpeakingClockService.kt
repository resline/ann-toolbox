package net.resline.przystan.clock

import android.app.*
import android.content.*
import android.media.AudioManager
import android.media.MediaMetadata
import android.media.session.MediaSession
import android.media.session.PlaybackState
import android.os.*
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import android.content.pm.ServiceInfo
import net.resline.przystan.MainActivity
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

class SpeakingClockService : Service() {
    private lateinit var runtime: ClockRuntime
    private lateinit var session: MediaSession
    private var stopping = false
    private val receiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == AudioManager.ACTION_AUDIO_BECOMING_NOISY) runtime.noisy()
            else runtime.timeChanged()
        }
    }
    override fun onCreate() {
        super.onCreate()
        runtime = ClockRuntime.get(this)
        runtime.service = this
        session = MediaSession(this, "PrzystanClock").apply {
            setCallback(object : MediaSession.Callback() {
                override fun onPlay() { dispatch("resume") }
                override fun onPause() { runtime.execute("pause", JSONObject()) }
                override fun onStop() { runtime.execute("stop", JSONObject()) }
            }, Handler(Looper.getMainLooper()))
            isActive = true
        }
        if (Build.VERSION.SDK_INT >= 26) {
            getSystemService(NotificationManager::class.java).createNotificationChannel(
                NotificationChannel(CHANNEL, "Mówiący zegarek", NotificationManager.IMPORTANCE_LOW).apply {
                    description = "Sterowanie aktywnym zegarkiem"
                    setSound(null, null)
                })
        }
        ContextCompat.registerReceiver(this, receiver, IntentFilter().apply {
            addAction(Intent.ACTION_TIME_CHANGED); addAction(Intent.ACTION_TIMEZONE_CHANGED)
            addAction(AudioManager.ACTION_AUDIO_BECOMING_NOISY)
        }, ContextCompat.RECEIVER_NOT_EXPORTED)
    }
    override fun onBind(intent: Intent?): IBinder? = null
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        stopping = false
        val requestId = intent?.getStringExtra("requestId")
        try {
            ServiceCompat.startForeground(this, NOTIFICATION, notification(),
                if (Build.VERSION.SDK_INT >= 29) ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK else 0)
            if (intent == null) {
                runtime.recoverFromSystem {
                    updateNotification()
                    if (runtime.model.state != "running") endForeground(runtime.model.state == "paused")
                }
            } else {
                val action = intent.action ?: "resume"
                if (action != "start" && action != "resume") {
                    val snapshot = runtime.execute(action, JSONObject())
                    if (requestId != null) runtime.requests.remove(requestId)?.invoke(snapshot)
                    return START_NOT_STICKY
                }
                val token = runtime.reserveStart()
                runtime.prepare {
                    val snapshot = if (runtime.isStartCurrent(token) && runtime.service === this && !stopping)
                        runtime.execute(action, JSONObject(intent.getStringExtra("args") ?: "{}")) else runtime.snapshot()
                    if (requestId != null) runtime.requests.remove(requestId)?.invoke(snapshot)
                }
            }
        } catch (e: Exception) {
            runtime.log(JSONObject().put("event", "service-failed").put("reason", e.javaClass.simpleName))
            val state = runtime.execute("pause", JSONObject()).put("error", "service-unavailable").put("protection", "unavailable")
            if (requestId != null) runtime.requests.remove(requestId)?.invoke(state)
            endForeground(false)
        }
        return START_STICKY
    }
    private fun dispatch(action: String) {
        ContextCompat.startForegroundService(this, Intent(this, SpeakingClockService::class.java).setAction(action))
    }
    private fun actionIntent(action: String, id: Int): PendingIntent {
        val intent = Intent(this, SpeakingClockService::class.java).setAction(action)
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        return if (Build.VERSION.SDK_INT >= 26) PendingIntent.getForegroundService(this, id, intent, flags)
            else PendingIntent.getService(this, id, intent, flags)
    }
    private fun notification(): Notification {
        val m = runtime.model
        val playing = m.state == "running"
        val next = m.next(ClockRuntime.wall(), ClockRuntime.mono())
        val text = if (playing) "Następny komunikat: ${SimpleDateFormat("HH:mm", Locale.forLanguageTag("pl-PL")).format(Date(next))}"
            else if (m.state == "paused") "Zegarek wstrzymany" else "Przygotowuję zegarek…"
        val content = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val builder = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(this, CHANNEL) else Notification.Builder(this)
        session.setMetadata(MediaMetadata.Builder().putString(MediaMetadata.METADATA_KEY_TITLE, "Przystań — Czas")
            .putString(MediaMetadata.METADATA_KEY_ARTIST, text).build())
        session.setPlaybackState(PlaybackState.Builder().setState(if (playing) PlaybackState.STATE_PLAYING else PlaybackState.STATE_PAUSED, 0, if (playing) 1f else 0f)
            .setActions(PlaybackState.ACTION_PLAY or PlaybackState.ACTION_PAUSE or PlaybackState.ACTION_STOP).build())
        return builder.setSmallIcon(net.resline.przystan.R.drawable.ic_clock_notification)
            .setContentTitle("Przystań — Czas").setContentText(text).setContentIntent(content)
            .setOnlyAlertOnce(true).setOngoing(playing).setVisibility(Notification.VISIBILITY_PUBLIC)
            .setCategory(Notification.CATEGORY_TRANSPORT)
            .addAction(Notification.Action.Builder(null, if (playing) "Pauza" else "Wznów", actionIntent(if (playing) "pause" else "resume", 1)).build())
            .addAction(Notification.Action.Builder(null, "Zatrzymaj", actionIntent("stop", 2)).build())
            .setStyle(Notification.MediaStyle().setMediaSession(session.sessionToken).setShowActionsInCompactView(0, 1))
            .build()
    }
    fun updateNotification() {
        if (!stopping) getSystemService(NotificationManager::class.java).notify(NOTIFICATION, notification())
    }
    fun endForeground(keepPausedNotification: Boolean) {
        if (stopping) return
        stopping = true
        stopForeground(if (keepPausedNotification) STOP_FOREGROUND_DETACH else STOP_FOREGROUND_REMOVE)
        stopSelf()
    }
    override fun onTaskRemoved(rootIntent: Intent?) {
        // Swiping the Activity away is not a request to stop the clock.
        runtime.log(JSONObject().put("event", "activity-task-removed").put("state", runtime.model.state))
    }
    override fun onDestroy() {
        unregisterReceiver(receiver)
        session.isActive = false; session.release()
        runtime.onServiceDestroyed(this)
        super.onDestroy()
    }
    companion object { const val CHANNEL = "speaking-clock"; const val NOTIFICATION = 2401 }
}
