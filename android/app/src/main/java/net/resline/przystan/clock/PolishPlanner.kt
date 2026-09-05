package net.resline.przystan.clock

import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone
import kotlin.math.floor
import kotlin.math.max

/** Native port of polishAnnouncementPlanner.ts. Fragment IDs remain the shared contract. */
class PolishPlanner(private val config: JSONObject) {
    data class Fragment(val id: String, var joinAfter: String? = null) {
        fun json() = JSONObject().put("id", id).apply { joinAfter?.let { put("joinAfter", it) } }
    }
    data class Plan(val text: String, val fragments: List<Fragment>, val generic: Boolean? = null) {
        fun json() = JSONObject().put("text", text).put("fragments", JSONArray(fragments.map { it.json() }))
            .apply { generic?.let { put("usesGenericDepartureLabel", it) } }
    }
    private fun hm(wall: Long, zone: TimeZone): Pair<Int, Int> {
        val c = Calendar.getInstance(zone).apply { timeInMillis = wall }
        return c.get(Calendar.HOUR_OF_DAY) to c.get(Calendar.MINUTE)
    }
    private fun digital(wall: Long, zone: TimeZone): String {
        val (h, m) = hm(wall, zone)
        return String.format(Locale.ROOT, "%02d:%02d", h, m)
    }
    private fun few(n: Long) = n % 10 in 2..4 && n % 100 !in 12..14
    private fun current(wall: Long, zone: TimeZone): List<Fragment> {
        val (h,m) = hm(wall, zone)
        return listOf(Fragment("fixed.jest.cont", "neutral-word")) +
            (if (h == 0 && m == 0) emptyList() else listOf(Fragment("hour.current.cont.$h", "neutral-word"))) +
            Fragment("minute.digital.final.$m")
    }
    fun integer(value: Long): MutableList<Fragment> {
        require(value in 0..9_007_199_254_740_991L)
        if (value == 0L) return mutableListOf(Fragment("number.unit.0"))
        val groups = mutableListOf<Int>()
        var remaining = value
        while (remaining > 0) { groups.add((remaining % 1000).toInt()); remaining /= 1000 }
        val scales = listOf("thousand", "million", "billion", "trillion", "quadrillion")
        val result = mutableListOf<Fragment>()
        for (i in groups.indices.reversed()) {
            val g = groups[i]
            if (g == 0) continue
            if (i == 0 || g != 1) {
                if (g >= 100) result.add(Fragment("number.hundreds.${g / 100 * 100}", "tight-word"))
                val r = g % 100
                if (r in 1..19) result.add(Fragment("number.unit.$r", "tight-word"))
                if (r >= 20) {
                    result.add(Fragment("number.tens.${r / 10 * 10}", if (r % 10 > 0) "tight-word" else null))
                    if (r % 10 > 0) result.add(Fragment("number.unit.${r % 10}", "tight-word"))
                }
            }
            if (i > 0) result.add(Fragment("number.scale.${scales[i-1]}.${if (g == 1) "one" else if (few(g.toLong())) "few" else "many"}", "tight-word"))
        }
        result.last().joinAfter = null
        return result
    }
    private fun count(n: Long, feminine: String): List<Fragment> {
        val fragments = integer(n)
        val last = fragments.last()
        if (feminine == "one" && n == 1L && last.id == "number.unit.1") fragments[fragments.lastIndex] = Fragment("number.minute.feminine.1", last.joinAfter)
        if (feminine == "two" && last.id == "number.unit.2") fragments[fragments.lastIndex] = Fragment("number.minute.feminine.2", last.joinAfter)
        return fragments
    }
    fun time(wall: Long, style: String, elapsed: Long = 0, end: Boolean = false, zone: TimeZone = TimeZone.getDefault()): Plan {
        val (h,m) = hm(wall, zone)
        if (style == "elapsed") {
            if (end) return Plan("Czas sesji minął! Jest ${digital(wall, zone)}.", listOf(Fragment("elapsed.sessionEnd.final", "sentence")) + current(wall, zone))
            val n = max(0, elapsed)
            val verb = if (n == 1L) "Minęła" else if (few(n)) "Minęły" else "Minęło"
            val noun = if (n == 1L) "minuta" else if (few(n)) "minuty" else "minut"
            val verbId = if (n == 1L) "minela" else if (few(n)) "minely" else "minelo"
            val number = count(n, if (n == 1L) "one" else if (few(n)) "two" else "none").onEach { it.joinAfter = "tight-word" }
            return Plan("$verb $n $noun. Jest ${digital(wall, zone)}", listOf(Fragment("elapsed.$verbId.cont", "tight-word")) + number + Fragment("elapsed.$noun.final", "sentence") + current(wall, zone))
        }
        val fragments = when (style) {
            "short" -> if (m == 0) listOf(Fragment("hour.short.final.$h")) else listOf(Fragment("hour.short.cont.$h", "neutral-word"), Fragment("minute.digital.final.$m"))
            "natural" -> {
                val current = if (h % 12 == 0) 12 else h % 12
                val next = h % 12 + 1
                when {
                    m == 0 && h == 0 -> listOf(Fragment("natural.midnight.final"))
                    m == 0 && h == 12 -> listOf(Fragment("natural.noon.final"))
                    m == 0 -> listOf(Fragment("hour.short.final.$current"))
                    m < 30 -> listOf(Fragment("natural.after.cont.$m", "neutral-word"), Fragment("hour.genitive.afterPo.final.$current"))
                    m == 30 -> listOf(Fragment("natural.wpolDo.cont", "neutral-word"), Fragment("hour.genitive.afterDo.final.$next"))
                    else -> listOf(Fragment("natural.before.cont.${60-m}", "neutral-word"), Fragment("hour.nominative.afterBefore.final.$next"))
                }
            }
            else -> listOf(Fragment("fixed.jestGodzina.cont", "neutral-word")) +
                (if (h == 0 && m == 0) emptyList() else listOf(Fragment("hour.precise.cont.$h", "neutral-word"))) + Fragment("minute.digital.final.$m")
        }
        return Plan(config.getJSONObject("timeTexts").getJSONArray(style).getString(h * 60 + m), fragments)
    }
    fun departure(seconds: Long, label: String, target: Long? = null, done: Boolean = false, zone: TimeZone = TimeZone.getDefault()): Plan {
        val rem = max(0, seconds)
        val labels = mapOf("wyjście z domu" to "leave_home", "spotkanie" to "meeting", "pociąg lub autobus" to "transit", "leki" to "medication", "gotowanie" to "cooking", "przerwa" to "break")
        val id = labels[label.trim().lowercase(Locale.forLanguageTag("pl-PL"))] ?: "generic"
        val f = mutableListOf<Fragment>()
        val text: String
        if (done || rem == 0L) {
            f.add(Fragment("departure.czasNa.cont", "colon"))
            f.add(Fragment("departure.label.$id.done", if (target != null) "sentence" else null))
            if (target != null) f.addAll(current(target, zone))
            text = "Czas na: $label!" + if (target != null) " Jest ${digital(target, zone)}." else ""
        } else if (rem < 60) {
            f.add(Fragment(if (rem <= 30) "departure.zaHalfMinute.cont" else "departure.lessThanMinute.cont", "colon"))
            f.add(Fragment("departure.label.$id.countdown"))
            text = if (rem <= 30) "Za pół minuty: $label." else "Mniej niż minuta do: $label."
        } else {
            val minutes = floor(rem / 60.0 + 0.5).toLong()
            if (minutes == 1L) f.add(Fragment("departure.zaMinute.cont", "colon"))
            else {
                f.add(Fragment("departure.za.cont", "tight-word"))
                f.addAll(count(minutes, if (few(minutes)) "two" else "none").onEach { it.joinAfter = "tight-word" })
                f.add(Fragment(if (few(minutes)) "departure.minuty.cont" else "departure.minut.cont", "colon"))
            }
            f.add(Fragment("departure.label.$id.countdown"))
            var suffix = ""
            if (target != null && rem >= 900) {
                f.last().joinAfter = "sentence"
                f.addAll(current(target - rem * 1000, zone))
                suffix = " Jest ${digital(target - rem * 1000, zone)}."
            }
            val prefix = if (minutes == 1L) "Za minutę" else "Za $minutes ${if (few(minutes)) "minuty" else "minut"}"
            text = "$prefix: $label.$suffix"
        }
        return Plan(text, f, id == "generic")
    }
}
