package net.resline.przystan.clock

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import java.io.File
import java.util.TimeZone

class PolishPlannerTest {
    private fun canonical(value: Any?): String = when (value) {
        is JSONObject -> value.keys().asSequence().toList().sorted().joinToString(prefix = "{", postfix = "}") { it + ":" + canonical(value.get(it)) }
        is JSONArray -> (0 until value.length()).joinToString(prefix = "[", postfix = "]") { canonical(value.get(it)) }
        else -> value.toString()
    }
    @Test fun nativePlannerMatchesProductionTypeScript() {
        val config = JSONObject(File(System.getProperty("clock.assets"), "config.json").readText())
        val planner = PolishPlanner(config)
        val vectors = JSONArray(File(System.getProperty("clock.vectors")).readText())
        val utc = TimeZone.getTimeZone("UTC")
        assertTrue(vectors.length() > 6000)
        for (i in 0 until vectors.length()) {
            val v = vectors.getJSONObject(i)
            if (v.getString("kind") == "integer") {
                assertTrue("integer $i", canonical(v.getJSONArray("fragments")) == canonical(JSONArray(planner.integer(v.getLong("value")).map { it.json() })))
                continue
            }
            val actual = if (v.getString("kind") == "time") planner.time(v.getLong("timestamp"), v.getString("style"), v.optLong("elapsed"), v.optBoolean("end"), utc)
                else planner.departure(v.getLong("seconds"), v.getString("label"), if (v.isNull("target")) null else v.getLong("target"), zone = utc)
            val expected = v.getJSONObject("plan")
            assertTrue("vector $i: expected $expected, actual ${actual.json()}", canonical(expected) == canonical(actual.json()))
        }
    }
}
