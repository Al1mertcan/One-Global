package app.hemcan.mobile;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;
import java.util.TreeMap;

/**
 * Hemcan adım hesabı (Android bağımlılığı yok; yerelde test edilebilir).
 * Donanım adım sayacı telefon açıldığından beri toplamı verir; burada günlere bölünür.
 */
final class StepMath {

    static final class State {
        boolean has = false;
        double boot = 0;
        double total = 0;
        long ts = 0;
    }

    private static final long HOUR = 3600000L;

    private StepMath() {}

    static String key(long t, TimeZone tz) {
        Calendar c = Calendar.getInstance(tz);
        c.setTimeInMillis(t);
        return String.format(Locale.US, "%04d-%02d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
    }

    static long startOfDay(long t, TimeZone tz) {
        Calendar c = Calendar.getInstance(tz);
        c.setTimeInMillis(t);
        c.set(Calendar.HOUR_OF_DAY, 0);
        c.set(Calendar.MINUTE, 0);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        return c.getTimeInMillis();
    }

    private static void add(TreeMap<String, Integer> days, String k, int n) {
        if (n <= 0) return;
        Integer cur = days.get(k);
        days.put(k, (cur == null ? 0 : cur) + n);
    }

    /** Okumalar arası adımları, aradaki günlere "uyanık saatler"e (06:00-24:00) göre dağıtır. */
    static void distribute(TreeMap<String, Integer> days, long t0, long t1, long delta, TimeZone tz) {
        if (delta <= 0) return;
        Calendar cur = Calendar.getInstance(tz);
        cur.setTimeInMillis(startOfDay(t0, tz));
        List<String> keys = new ArrayList<String>();
        List<Long> ws = new ArrayList<Long>();
        long totalW = 0;
        int guard = 0;
        while (cur.getTimeInMillis() <= t1 && guard++ < 62) {
            long ds = cur.getTimeInMillis();
            long a = Math.max(t0, ds + 6 * HOUR);
            long b = Math.min(t1, ds + 24 * HOUR);
            long w = Math.max(0L, b - a);
            keys.add(key(ds + 12 * HOUR, tz));
            ws.add(w);
            totalW += w;
            cur.add(Calendar.DAY_OF_MONTH, 1);
        }
        if (keys.isEmpty()) {
            add(days, key(t1, tz), (int) delta);
            return;
        }
        if (totalW == 0) {
            add(days, keys.get(keys.size() - 1), (int) delta);
            return;
        }
        long given = 0;
        for (int i = 0; i < keys.size(); i++) {
            long part = (i == keys.size() - 1) ? delta - given : Math.round((double) delta * ws.get(i) / totalW);
            given += part;
            add(days, keys.get(i), (int) part);
        }
    }

    /** Yeni sensör okumasını işler; günlük toplamları günceller ve yeni durumu döndürür. */
    static State merge(TreeMap<String, Integer> days, State st, double total, double boot, long now, TimeZone tz) {
        String today = key(now, tz);
        if (st == null || !st.has) {
            if (boot >= startOfDay(now, tz)) {
                days.put(today, (int) Math.round(total));
            } else if (!days.containsKey(today)) {
                days.put(today, 0);
            }
        } else {
            boolean rebooted = Math.abs(boot - st.boot) > 120000 || total < st.total;
            double delta = rebooted ? total : total - st.total;
            distribute(days, st.ts, now, Math.max(0L, Math.round(delta)), tz);
            if (!days.containsKey(today)) days.put(today, 0);
        }
        String cut = key(now - 62L * 24 * HOUR, tz);
        List<String> drop = new ArrayList<String>();
        for (String k : days.keySet()) if (k.compareTo(cut) < 0) drop.add(k);
        for (String k : drop) days.remove(k);
        State ns = new State();
        ns.has = true;
        ns.boot = boot;
        ns.total = total;
        ns.ts = now;
        return ns;
    }
}
