package net.resline.przystan.clock

import android.content.Intent
import android.os.SystemClock
import androidx.core.content.ContextCompat
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import net.resline.przystan.MainActivity
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

@RunWith(AndroidJUnit4::class)
class ClockServiceTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val context = instrumentation.targetContext
    private fun main(block: () -> Unit) = instrumentation.runOnMainSync(block)
    private fun await(timeoutMs: Long, condition: () -> Boolean) {
        val until = SystemClock.elapsedRealtime() + timeoutMs
        while (SystemClock.elapsedRealtime() < until) {
            var ready = false
            main { ready = condition() }
            if (ready) return
            Thread.sleep(100)
        }
        fail("Condition did not become true in $timeoutMs ms")
    }
    private fun shell(command: String) {
        instrumentation.uiAutomation.executeShellCommand(command).use { fd ->
            java.io.FileInputStream(fd.fileDescriptor).use { it.readBytes() }
        }
    }
    @Test fun actualPlaybackContinuesInDozeAfterActivityIsDestroyed() {
        val count = (InstrumentationRegistry.getArguments().getString("announcements")?.toInt() ?: 1).coerceIn(1, 120)
        lateinit var runtime: ClockRuntime
        val activity = ActivityScenario.launch(MainActivity::class.java)
        try {
            main { runtime = ClockRuntime.get(context) }
            // Explicit device setup is part of the test command; never change user battery preferences here.
            assumeTrue("Disable battery optimization for the test APK first", runtime.batteryReady())
            val prepared = CountDownLatch(1)
            main { runtime.prepare { prepared.countDown() } }
            assertTrue(prepared.await(15, TimeUnit.SECONDS))
            main {
                assertTrue(runtime.snapshot().getBoolean("voiceReady"))
                runtime.execute("stop", JSONObject())
                runtime.execute("settings", JSONObject().put("settings", JSONObject()
                    .put("mode", "continuous").put("intervalMinutes", 1).put("clockSync", false).put("keepAwake", false)))
                ContextCompat.startForegroundService(context, Intent(context, SpeakingClockService::class.java).setAction("start"))
            }
            await(10_000) { runtime.model.state == "running" }
            val run = runtime.model.runId
            activity.close()
            shell("dumpsys battery unplug")
            shell("input keyevent KEYCODE_SLEEP")
            shell("dumpsys deviceidle force-idle")
            assertTrue(shellOutput("dumpsys deviceidle").contains("mState=IDLE"))
            assertFalse(context.getSystemService(android.os.PowerManager::class.java).isInteractive)
            assertTrue(activeWakeLocks().contains("Przystan:SpeakingClock"))
            await(count * 60_000L + 20_000) {
                assertEquals(runtime.snapshot().toString(), "running", runtime.model.state)
                runtime.diagnosticsFile.readLines().map { JSONObject(it) }.count {
                    it.optString("runId") == run && it.optString("event") == "audio-end" && it.optString("result") == "completed"
                } >= count
            }
            val events = runtime.diagnosticsFile.readLines().map { JSONObject(it) }.filter { it.optString("runId") == run }
            val starts = events.filter { it.optString("event") == "audio-start" }
            assertEquals(count, starts.size)
            starts.forEach { start ->
                android.util.Log.i("AnnClockTestProof", start.toString())
                assertTrue(start.getLong("actualAudioStart") - start.getLong("scheduledAt") in 0..2000)
            }
            assertTrue(shellOutput("dumpsys deviceidle").contains("mState=IDLE"))
            assertFalse(context.getSystemService(android.os.PowerManager::class.java).isInteractive)
            main {
                assertEquals("running", runtime.model.state)
                assertNotNull(runtime.service)
                runtime.execute("pause", JSONObject())
                assertEquals("paused", runtime.model.state)
            }
            await(5000) { runtime.service == null }
            assertFalse(activeWakeLocks().contains("Przystan:SpeakingClock"))
            main {
                runtime.execute("stop", JSONObject())
                assertEquals("idle", runtime.model.state)
            }
            assertFalse(context.getSystemService(android.app.NotificationManager::class.java)
                .activeNotifications.any { it.id == SpeakingClockService.NOTIFICATION })
            // dumpsys also includes historical acquire/release events; inspect only active locks.
            assertFalse(activeWakeLocks().contains("Przystan:SpeakingClock"))
        } finally {
            ClockRuntime.get(context).diagnosticsFile.readLines().forEach { android.util.Log.i("AnnClockTestProof", it) }
            main { ClockRuntime.get(context).execute("stop", JSONObject()) }
            shell("dumpsys deviceidle unforce")
            shell("dumpsys battery reset")
            shell("input keyevent KEYCODE_WAKEUP")
            activity.close()
        }
    }
    private fun activeWakeLocks(): String {
        val dump = shellOutput("dumpsys power")
        assertTrue("Missing active wake-lock section", dump.contains("Wake Locks: size="))
        return dump.substringAfter("Wake Locks: size=").substringBefore("Suspend Blockers:")
    }
    @Test fun stopDuringSpeechCancelsAudioAndReleasesFocus() {
        val activity = ActivityScenario.launch(MainActivity::class.java)
        lateinit var runtime: ClockRuntime
        try {
            main { runtime = ClockRuntime.get(context) }
            assumeTrue("Disable battery optimization for the test APK first", runtime.batteryReady())
            val prepared = CountDownLatch(1)
            main { runtime.prepare { prepared.countDown() } }
            assertTrue(prepared.await(15, TimeUnit.SECONDS))
            main {
                runtime.execute("stop", JSONObject())
                ContextCompat.startForegroundService(context, Intent(context, SpeakingClockService::class.java).setAction("start"))
            }
            await(10_000) { runtime.model.state == "running" }
            val run = runtime.model.runId
            main { runtime.execute("test", JSONObject()) }
            await(5000) { runtime.diagnosticsFile.readLines().map { JSONObject(it) }.any {
                it.optString("runId") == run && it.optString("event") == "audio-start"
            } }
            main { runtime.execute("stop", JSONObject()) }
            await(5000) { runtime.service == null }
            val ends = runtime.diagnosticsFile.readLines().map { JSONObject(it) }.filter {
                it.optString("runId") == run && it.optString("event") == "audio-end"
            }
            assertEquals(1, ends.size)
            assertEquals("cancelled", ends.single().getString("result"))
            assertFalse(activeWakeLocks().contains("Przystan:SpeakingClock"))
            val audioDump = shellOutput("dumpsys audio")
            assertTrue(audioDump.contains("Audio Focus stack entries"))
            assertFalse(audioDump.substringAfter("Audio Focus stack entries").substringBefore("Events log:")
                .contains(context.packageName))
        } finally {
            main { ClockRuntime.get(context).execute("stop", JSONObject()) }
            activity.close()
        }
    }
    private fun shellOutput(command: String): String = instrumentation.uiAutomation.executeShellCommand(command).use { fd ->
        java.io.FileInputStream(fd.fileDescriptor).use { it.readBytes().toString(Charsets.UTF_8) }
    }
}
