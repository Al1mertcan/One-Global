package app.hemcan.mobile;

import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
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

    /**
     * Bildirimler bazı telefonlarda (Xiaomi, Oppo, Vivo, Huawei, Samsung ...) pil tasarrufu yüzünden
     * gelmeyebilir. İlgili sistem ayarını açar: kind = "notifications" | "battery" | "app".
     */
    @PluginMethod
    public void openSettings(PluginCall call) {
        String kind = call.getString("kind", "app");
        String pkg = getContext().getPackageName();
        try {
            Intent i;
            if ("notifications".equals(kind)) {
                i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                i.putExtra(Settings.EXTRA_APP_PACKAGE, pkg);
            } else if ("battery".equals(kind)) {
                i = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
            } else {
                i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + pkg));
            }
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            try {
                Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + pkg));
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(i);
                call.resolve();
            } catch (Exception e2) {
                call.reject("Ayar ekranı açılamadı");
            }
        }
    }
}
