package app.hemcan.mobile;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Hemcan adım sayar köprüsü: bugünün adımını döndürür ve ana ekran widget'ını günceller. */
@CapacitorPlugin(name = "HemcanSteps")
public class StepsPlugin extends Plugin {

    @PluginMethod
    public void setGoalNotify(PluginCall call) {
        StepStore.setGoalNotify(
            getContext(),
            Boolean.TRUE.equals(call.getBoolean("enabled", false)),
            call.getString("title", ""),
            call.getString("body", ""),
            call.getInt("goal", 10000)
        );
        call.resolve();
    }

    @PluginMethod
    public void today(final PluginCall call) {
        StepStore.refresh(
            getContext(),
            new StepStore.Result() {
                @Override
                public void done(boolean ok, int steps, String error) {
                    JSObject result = new JSObject();
                    result.put("ok", ok);
                    result.put("steps", steps);
                    result.put("days", StepStore.daysJson(getContext()));
                    if (error != null) result.put("error", error);
                    StepsWidget.refreshAll(getContext());
                    call.resolve(result);
                }
            }
        );
    }
}
