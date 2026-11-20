package app.hemcan.mobile;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import java.util.Iterator;
import java.util.TimeZone;
import java.util.TreeMap;
import org.json.JSONException;
import org.json.JSONObject;

/** Adım verisini cihazda (SharedPreferences) tutar; uygulama ve ana ekran widget'ı aynı kaynağı kullanır. */
public final class StepStore {

    public interface Result {
        void done(boolean ok, int steps, String error);
    }

    private static final String PREFS = "hemcan_steps";

    private StepStore() {}

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static TreeMap<String, Integer> loadDays(SharedPreferences sp) {
        TreeMap<String, Integer> days = new TreeMap<String, Integer>();
        try {
            JSONObject o = new JSONObject(sp.getString("days", "{}"));
            Iterator<String> it = o.keys();
            while (it.hasNext()) {
                String k = it.next();
                days.put(k, o.optInt(k, 0));
            }
        } catch (JSONException e) {
            // bozuk kayıt: boş başla
        }
        return days;
    }

    public static String daysJson(Context ctx) {
        JSONObject o = new JSONObject();
        try {
            for (java.util.Map.Entry<String, Integer> e : loadDays(prefs(ctx)).entrySet()) o.put(e.getKey(), e.getValue().intValue());
        } catch (JSONException e) {
            // yok say
        }
        return o.toString();
    }

    public static int today(Context ctx) {
        Integer v = loadDays(prefs(ctx)).get(StepMath.key(System.currentTimeMillis(), TimeZone.getDefault()));
        return v == null ? 0 : v.intValue();
    }

    public static boolean hasPermission(Context ctx) {
        if (Build.VERSION.SDK_INT < 29) return true;
        return ctx.getApplicationContext().checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED;
    }


    /** Hedef bildirimi ayarı (metinler uygulamadan gelir; kullanıcı kapattıysa enabled=false). */
    public static void setGoalNotify(Context ctx, boolean enabled, String title, String body, int goal) {
        prefs(ctx).edit()
            .putBoolean("goal_on", enabled)
            .putString("goal_title", title == null ? "" : title)
            .putString("goal_body", body == null ? "" : body)
            .putInt("goal", goal > 0 ? goal : 10000)
            .apply();
    }

    /** Günlük hedefe ulaşıldıysa (günde bir kez) bildirim gösterir; uygulama kapalıyken widget yenilemesinden de çalışır. */
    static void maybeNotifyGoal(Context ctx, int steps) {
        Context app = ctx.getApplicationContext();
        SharedPreferences sp = prefs(app);
        if (!sp.getBoolean("goal_on", false)) return;
        if (steps < sp.getInt("goal", 10000)) return;
        String day = StepMath.key(System.currentTimeMillis(), TimeZone.getDefault());
        if (day.equals(sp.getString("goal_day", ""))) return;
        String title = sp.getString("goal_title", "");
        String body = sp.getString("goal_body", "");
        if (title.length() == 0) return;
        if (Build.VERSION.SDK_INT >= 33
            && app.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = (NotificationManager) app.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && nm.getNotificationChannel("hemcan-reminders") == null) {
                nm.createNotificationChannel(new NotificationChannel("hemcan-reminders", "Hemcan", NotificationManager.IMPORTANCE_DEFAULT));
            }
        }
        int icon = app.getResources().getIdentifier("ic_stat_hemcan", "drawable", app.getPackageName());
        if (icon == 0) icon = app.getApplicationInfo().icon;
        Intent launch = app.getPackageManager().getLaunchIntentForPackage(app.getPackageName());
        PendingIntent pi = launch == null ? null : PendingIntent.getActivity(app, 5001, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder b = new NotificationCompat.Builder(app, "hemcan-reminders")
            .setSmallIcon(icon)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT);
        if (pi != null) b.setContentIntent(pi);
        try {
            NotificationManagerCompat.from(app).notify(5001, b.build());
            sp.edit().putString("goal_day", day).apply();
        } catch (SecurityException e) {
            // izin yok: sessizce vazgeç
        }
    }

    /** Yeni okumayı işler, kaydeder ve bugünün adımını döndürür. */
    public static synchronized int update(Context ctx, double total, double bootTime, long now) {
        SharedPreferences sp = prefs(ctx);
        TreeMap<String, Integer> days = loadDays(sp);
        StepMath.State st = new StepMath.State();
        String tot = sp.getString("total", null);
        if (tot != null) {
            try {
                st.has = true;
                st.total = Double.parseDouble(tot);
                st.boot = Double.parseDouble(sp.getString("boot", "0"));
                st.ts = Long.parseLong(sp.getString("ts", "0"));
            } catch (NumberFormatException e) {
                st.has = false;
            }
        }
        TimeZone tz = TimeZone.getDefault();
        StepMath.State ns = StepMath.merge(days, st, total, bootTime, now, tz);
        JSONObject o = new JSONObject();
        try {
            for (java.util.Map.Entry<String, Integer> e : days.entrySet()) o.put(e.getKey(), e.getValue().intValue());
        } catch (JSONException e) {
            // yok say
        }
        sp.edit()
            .putString("days", o.toString())
            .putString("total", String.valueOf(ns.total))
            .putString("boot", String.valueOf(ns.boot))
            .putString("ts", String.valueOf(ns.ts))
            .apply();
        Integer v = days.get(StepMath.key(now, tz));
        int todaySteps = v == null ? 0 : v.intValue();
        maybeNotifyGoal(ctx, todaySteps);
        return todaySteps;
    }

    /** Sensörü bir kez okur (en çok 4 sn), sonucu işler ve cb'ye bildirir. Ana iş parçacığında çağrılmalıdır. */
    public static void refresh(final Context ctx, final Result cb) {
        final Context app = ctx.getApplicationContext();
        if (!hasPermission(app)) {
            cb.done(false, today(app), "permission");
            return;
        }
        final SensorManager sm = (SensorManager) app.getSystemService(Context.SENSOR_SERVICE);
        final Sensor sensor = sm == null ? null : sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
        if (sensor == null) {
            cb.done(false, today(app), "no_sensor");
            return;
        }
        final boolean[] done = { false };
        final Handler handler = new Handler(Looper.getMainLooper());
        final SensorEventListener listener = new SensorEventListener() {
            @Override
            public void onSensorChanged(SensorEvent event) {
                if (done[0]) return;
                done[0] = true;
                sm.unregisterListener(this);
                long now = System.currentTimeMillis();
                double boot = (double) (now - SystemClock.elapsedRealtime());
                int steps = update(app, (double) event.values[0], boot, now);
                cb.done(true, steps, null);
            }

            @Override
            public void onAccuracyChanged(Sensor s, int accuracy) {}
        };
        if (!sm.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_NORMAL)) {
            cb.done(false, today(app), "register_failed");
            return;
        }
        handler.postDelayed(
            new Runnable() {
                @Override
                public void run() {
                    if (done[0]) return;
                    done[0] = true;
                    sm.unregisterListener(listener);
                    cb.done(false, today(app), "timeout");
                }
            },
            4000
        );
    }
}
