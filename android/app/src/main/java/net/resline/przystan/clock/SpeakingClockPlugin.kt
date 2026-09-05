package net.resline.przystan.clock

import android.app.Activity
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.WindowManager
import androidx.activity.result.ActivityResult
import androidx.core.content.ContextCompat
import com.getcapacitor.*
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONObject
import java.util.UUID

@CapacitorPlugin(name = "SpeakingClock")
class SpeakingClockPlugin : Plugin() {
    private val main = Handler(Looper.getMainLooper())
    private val runtime get() = ClockRuntime.get(context)
    private var attached = false
    private val observer: (JSONObject) -> Unit = { snapshot ->
        notifyListeners("status", JSObject.fromJSONObject(snapshot))
        setScreenAwake(snapshot)
    }
    override fun load() {
        main.post { runtime.observers.add(observer); attached = true }
    }
    private fun setScreenAwake(snapshot: JSONObject) {
        val awake = snapshot.getString("state") == "running" && snapshot.getJSONObject("settings").getBoolean("keepAwake")
        activity?.window?.let { window ->
            if (awake) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }
    @PluginMethod fun prepare(call: PluginCall) {
        main.post { runtime.prepare { call.resolve(JSObject.fromJSONObject(it)) } }
    }
    @PluginMethod fun getStatus(call: PluginCall) {
        main.post { call.resolve(JSObject.fromJSONObject(runtime.snapshot())) }
    }
    @PluginMethod fun command(call: PluginCall) {
        val action = call.getString("action") ?: return call.reject("unknown-command")
        main.post {
            if (action != "start" && action != "resume") {
                call.resolve(JSObject.fromJSONObject(runtime.execute(action, call.data)))
                return@post
            }
            val id = UUID.randomUUID().toString()
            runtime.requests[id] = { call.resolve(JSObject.fromJSONObject(it)) }
            try {
                ContextCompat.startForegroundService(context, Intent(context, SpeakingClockService::class.java)
                    .setAction(action).putExtra("args", call.data.toString()).putExtra("requestId", id))
                main.postDelayed({
                    if (runtime.requests.remove(id) != null) {
                        runtime.execute("stop", JSONObject())
                        call.reject("service-timeout")
                    }
                }, 15_000)
            } catch (e: Exception) {
                runtime.requests.remove(id)
                call.reject("service-unavailable", e)
            }
        }
    }
    @PluginMethod fun openBatterySettings(call: PluginCall) {
        main.post {
            try {
                activity.startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
                call.resolve()
            } catch (e: Exception) { call.reject("battery-settings-unavailable", e) }
        }
    }
    @PluginMethod fun exportDiagnostics(call: PluginCall) {
        val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
            .setType("application/x-ndjson").putExtra(Intent.EXTRA_TITLE, "przystan-zegarek-diagnostyka.jsonl")
        main.post { startActivityForResult(call, intent, "diagnosticsResult") }
    }
    @ActivityCallback private fun diagnosticsResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        if (result.resultCode != Activity.RESULT_OK) { call.resolve(); return }
        try {
            val uri = result.data?.data ?: error("no-document")
            context.contentResolver.openOutputStream(uri, "wt")!!.use { output -> runtime.diagnosticsFile.inputStream().use { it.copyTo(output) } }
            call.resolve()
        } catch (e: Exception) { call.reject("diagnostics-export-failed", e) }
    }
    override fun handleOnResume() {
        main.post { val s = runtime.snapshot(); setScreenAwake(s); notifyListeners("status", JSObject.fromJSONObject(s)) }
    }
    override fun handleOnDestroy() {
        main.post {
            if (attached) runtime.observers.remove(observer)
            attached = false
            activity?.window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            // No stop command: the service has an independent lifetime.
        }
    }
}
