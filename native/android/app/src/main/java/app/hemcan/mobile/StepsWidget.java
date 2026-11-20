package app.hemcan.mobile;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import java.text.NumberFormat;
import java.util.Locale;

/** Ana ekran adım widget'ı: günlük adım, km ve kcal (halka hedefi: 10.000 adım). */
public class StepsWidget extends AppWidgetProvider {

    private static final int GOAL = 10000;

    @Override
    public void onUpdate(final Context context, final AppWidgetManager manager, final int[] ids) {
        paintAll(context);
        final PendingResult pending = goAsync();
        StepStore.refresh(
            context,
            new StepStore.Result() {
                @Override
                public void done(boolean ok, int steps, String error) {
                    try {
                        paintAll(context);
                    } finally {
                        pending.finish();
                    }
                }
            }
        );
    }

    /** Uygulama veya sensör yeni değer okuyunca tüm widget'ları saklanan değerle yeniler. */
    public static void refreshAll(Context context) {
        paintAll(context);
    }

    private static void paintAll(Context context) {
        Context app = context.getApplicationContext();
        AppWidgetManager manager = AppWidgetManager.getInstance(app);
        int[] ids = manager.getAppWidgetIds(new ComponentName(app, StepsWidget.class));
        for (int i = 0; i < ids.length; i++) paint(app, manager, ids[i]);
    }

    private static void paint(Context ctx, AppWidgetManager manager, int id) {
        int steps = StepStore.today(ctx);
        RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.widget_steps);
        rv.setTextViewText(R.id.w_steps, NumberFormat.getInstance(Locale.getDefault()).format(steps));
        rv.setProgressBar(R.id.w_ring, GOAL, Math.min(steps, GOAL), false);
        rv.setTextViewText(R.id.w_km, String.format(Locale.getDefault(), "%.2f km", steps * 0.00075));
        rv.setTextViewText(R.id.w_kcal, Math.round(steps * 0.03) + " kcal");
        rv.setViewVisibility(R.id.w_hint, StepStore.hasPermission(ctx) ? android.view.View.GONE : android.view.View.VISIBLE);
        Intent launch = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        if (launch != null) {
            PendingIntent pi = PendingIntent.getActivity(ctx, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            rv.setOnClickPendingIntent(R.id.w_root, pi);
        }
        manager.updateAppWidget(id, rv);
    }
}
