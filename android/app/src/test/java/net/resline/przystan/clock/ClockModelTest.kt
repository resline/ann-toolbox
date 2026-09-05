package net.resline.przystan.clock

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import java.io.File
import java.util.TimeZone

class ClockModelTest {
    private val utc = TimeZone.getTimeZone("UTC")
    private val wall = 1_767_268_800_000L // 2026-01-01 12:00 UTC
    private fun model(mode: String = "continuous", synced: Boolean = false): ClockModel {
        val s = JSONObject(File(System.getProperty("clock.assets"), "config.json").readText()).getJSONObject("settings")
        s.put("mode", mode).put("clockSync", synced)
        return ClockModel(s, utc)
    }
    @Test fun intervalSurvivesWallClockJump() {
        val m = model(); m.start(wall, 1000)
        m.timeChanged(wall + 3600_000, 2000, utc)
        assertNull(m.tick(wall + 3600_000, 2000))
        assertNotNull(m.tick(wall + 3600_000 + 299_000, 301_000))
        assertNull(m.tick(wall + 3600_000 + 299_000, 301_000))
    }
    @Test fun liveIntervalStartsFromChangeWithoutStoppingRun() {
        val m = model(); m.start(wall, 1000)
        val id = m.runId
        m.update(JSONObject().put("intervalMinutes", 1), wall + 20_000, 21_000)
        assertEquals("running", m.state); assertEquals(id, m.runId)
        assertNull(m.tick(wall + 79_999, 80_999))
        assertNotNull(m.tick(wall + 80_000, 81_000))
    }
    @Test fun syncedChangeUsesFutureBoundary() {
        val m = model(synced = true); m.start(wall, 1000)
        m.update(JSONObject().put("intervalMinutes", 1), wall + 20_000, 21_000)
        assertEquals(wall + 60_000, m.next(wall + 20_000, 21_000))
    }
    @Test fun pauseFreezesFocusButNotDeparture() {
        val m = model("focus"); m.start(wall, 1000)
        m.pause(wall + 60_000, 61_000)
        assertEquals(1440L, m.remaining(wall + 600_000, 601_000))
        m.resume(wall + 600_000, 601_000)
        assertEquals(1380L, m.remaining(wall + 660_000, 661_000))
        val d = model("departure")
        d.update(JSONObject().put("departure", JSONObject().put("targetTime", "12:20")), wall, 1000)
        d.start(wall, 1000); d.pause(wall + 60_000, 61_000)
        assertEquals(600L, d.remaining(wall + 600_000, 601_000))
    }
    @Test fun resumeKeepsRemainingRelativeInterval() {
        val m = model(); m.start(wall, 1000)
        m.pause(wall + 60_000, 61_000); m.resume(wall + 600_000, 601_000)
        assertEquals(wall + 840_000, m.next(wall + 600_000, 601_000))
    }
    @Test fun pausedCadenceChangeStartsAtResume() {
        val m = model(); m.start(wall, 1000); m.pause(wall + 60_000, 61_000)
        m.update(JSONObject().put("intervalMinutes", 1), wall + 100_000, 101_000)
        m.resume(wall + 200_000, 201_000)
        assertEquals(wall + 260_000, m.next(wall + 200_000, 201_000))
    }
    @Test fun missedDepartureMilestonesAreCoalescedAndFinaleIsOnce() {
        val m = model("departure")
        m.update(JSONObject().put("departure", JSONObject().put("targetTime", "12:20")), wall, 1000)
        m.start(wall, 1000)
        assertNotNull(m.tick(wall + 17 * 60_000, 1000 + 17 * 60_000))
        assertNull(m.tick(wall + 17 * 60_000, 1000 + 17 * 60_000))
        assertTrue(m.tick(wall + 20 * 60_000, 1000 + 20 * 60_000)!!.terminal)
        assertNull(m.tick(wall + 21 * 60_000, 1000 + 21 * 60_000))
    }
    @Test fun processRecoveryPreservesRunAndMissedHistory() {
        val m = model(); m.start(wall, 1000); m.tick(wall + 300_000, 301_000)
        val r = model(); r.restore(m.save(3), 3, wall + 350_000, 351_000, true)
        assertEquals("running", r.state)
        assertEquals(m.runId, r.runId)
        assertNull(r.tick(wall + 350_000, 351_000))
        assertNotNull(r.tick(wall + 600_000, 601_000))
    }
    @Test fun restartOrForceStopRequiresUserResume() {
        val m = model(); m.start(wall, 1000)
        for ((boot, system) in listOf(4 to true, 3 to false)) {
            val r = model(); r.restore(m.save(3), boot, wall + 60_000, 61_000, system)
            assertEquals("paused", r.state); assertTrue(r.interrupted)
        }
    }
    @Test fun pendingFinaleIsNeverReplayedAfterCrash() {
        val m = model("focus"); m.start(wall, 1000)
        assertTrue(m.tick(wall + 25 * 60_000, 1000 + 25 * 60_000)!!.terminal)
        val r = model(); r.restore(m.save(3), 3, wall + 30 * 60_000, 1000 + 30 * 60_000, true)
        assertEquals("idle", r.state); assertTrue(r.interrupted)
        assertNull(r.tick(wall + 30 * 60_000, 1000 + 30 * 60_000))
    }
    @Test fun sixtyMinuteGapDoesNotEndRun() {
        val m = model(); m.update(JSONObject().put("intervalMinutes", 60), wall, 1000); m.start(wall, 1000)
        assertNull(m.tick(wall + 59 * 60_000, 1000 + 59 * 60_000))
        assertEquals("running", m.state)
        assertNotNull(m.tick(wall + 60 * 60_000, 1000 + 60 * 60_000))
    }
    @Test fun nextAnnouncementIncludesFinaleBeforeRegularInterval() {
        val m = model("focus")
        m.update(JSONObject().put("focusDurationMinutes", 1).put("intervalMinutes", 5), wall, 1000)
        m.start(wall, 1000)
        assertEquals(wall + 60_000, m.next(wall, 1000))
        assertNull(m.tick(wall + 59_999, 60_999))
        assertTrue(m.tick(wall + 60_000, 61_000)!!.terminal)
    }
    @Test fun extendingFocusDuringFinaleCancelsTerminalState() {
        val m = model("focus"); m.start(wall, 1000)
        assertTrue(m.tick(wall + 25 * 60_000, 1000 + 25 * 60_000)!!.terminal)
        m.adjust(5, wall + 25 * 60_000, 1000 + 25 * 60_000)
        assertFalse(m.terminalPending)
        assertEquals(300L, m.remaining(wall + 25 * 60_000, 1000 + 25 * 60_000))
    }
    @Test fun forceStoppedFocusRestoresCheckpointWithoutCountingStoppedTime() {
        val m = model("focus"); m.start(wall, 1000)
        val saved = m.save(3, 61_000)
        val r = model(); r.restore(saved, 3, wall + 3600_000, 3601_000, false)
        assertEquals("paused", r.state)
        assertEquals(1440L, r.remaining(wall + 3600_000, 3601_000))
    }
    @Test fun modeCannotChangeWhileRunningAndInvalidInputIsAtomic() {
        val m = model(); m.start(wall, 1000)
        for (patch in listOf(JSONObject().put("mode", "focus"), JSONObject().put("intervalMinutes", 0))) {
            try { m.update(patch, wall, 1000); fail("Accepted invalid settings") } catch (_: IllegalArgumentException) { }
        }
        assertEquals("continuous", m.mode); assertEquals(5, m.interval)
    }
}
