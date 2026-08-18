// ONE Global — günlük bildirim gönderici (Netlify Scheduled Function).
// Her ~15 dakikada bir çalışır (bkz. netlify.toml: functions."send-notifications".schedule).
// Netlify Blobs'ta kayıtlı her abone için, kendi saat diliminde şu anki
// saate göre hangi bildirimin sırası geldiyse onu gönderir:
//
//   uyanma saati            -> minnettarlık mesajı
//   uyanma + 15dk           -> spor hatırlatması (ayarlanabilir şınav/mekik)
//   uyanma + 30dk           -> beyin sağlığı ipucu (dönen bir havuzdan)
//   eve geliş saati         -> günü kapatma / iyi misin kontrolü
//   eve geliş + 60dk        -> kitap okuma hatırlatması (ayarlanabilir sayfa hedefi)
//   yatma saati - 60dk      -> diş fırçalama hatırlatması
//   yatma saati             -> günü kapatma / telefonu bırakma nudge'ı (açılır/kapanır)
//
// Not (dürüstlük payı): Bu, "gerçek zamanlı push" için gereken tüm sunucu
// tarafı altyapıyı (VAPID + web-push + Netlify Blobs + zamanlanmış fonksiyon)
// içerir ve mantığı elimden geldiğince test ettim, ama gerçek bir cihaza
// gerçek bir bildirim ulaştığını bu ortamdan doğrulayamadım — bunu ancak
// sen deploy edip telefonunda bildirimlere izin verdikten sonra görebiliriz.

const webpush = require('web-push');
const { getStore, connectLambda } = require('@netlify/blobs');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:one-app@example.com';

const WINDOW_MIN = 15;

const CONTENT = {
  tr: {
    wake: {
      title: 'Günaydın 🌅',
      body: "Bugün yine hayattasın — bunun için şükretmeyi unutma. Sevdiklerinle güzel vakit geçir, çünkü yarın sen ya da sevdiğin biri burada olmayabilir. O yüzden sonra değil, şimdi ve bugün. Hatırlatmamı istediğin bir şey var mı? Unutma, ben her gün buradayım.",
    },
    exercise: (p, s) => ({ title: 'Sabah sporu zamanı 💪', body: `Hadi başlayalım: ${p} şınav, ${s} mekik. Kendini nasıl hissettiğini merak ediyorum.` }),
    brain: {
      title: 'Küçük bir beyin egzersizi 🧠',
      body: '', // pool'dan seçilecek
    },
    home: {
      title: 'Günü kapatıyoruz 🙏',
      body: 'Çok şükür, bugünü de bitirdik. Umarım her şey yolundadır. Hatırlatmamı istediğin bir şey var mı?',
    },
    noonCheck: {
      title: 'Aklında bir şey var mı? 💭',
      body: 'Henüz hiç hatırlatma eklemedin. Hatırlatmamı istediğin bir şey var mı? Uygulamadaki Hatırlatmalarım listesine ekleyebilirsin.',
    },
    steps: {
      title: 'Günlük 10 bin adım 🚶',
      body: 'Günde 10 bin adım atmak sağlığın için çok önemli — iş bitimine kadar tamamlayabilecek misin? Değilsen, akşam işten sonra ya da eve varınca biraz yürüyüş yapmayı unutma :)',
    },
    reading: (pages) => ({ title: 'Kitap vakti 📖', body: `Bugün en az ${pages} sayfa okudun mu? Birkaç sayfa bile kendine güzel bir ara.` }),
    teeth: {
      title: 'Diş fırçalama zamanı 🦷',
      body: 'Dişlerini fırçaladın mı? Diş sağlığı çok önemli — ileriki sen teşekkür edecek :)',
    },
    eveningExercise: (p, s) => ({
      title: 'Küçük bir akşam hareketi 💪',
      body: `${p} şınav, ${s} mekik çek — sağlıklı ve güzel bir vücut için. İleriki sen, şu anki sana teşekkür edecek.`,
    }),
    bed: {
      title: 'İyi geceler 🌙',
      body: 'Günü kapatma vakti. Telefonu bırak, güzel bir uyku seni bekliyor. Yarın yeniden buradayım.',
    },
    reminder: { title: 'Hatırlatma ⏰' },
  },
  en: {
    wake: {
      title: 'Good morning 🌅',
      body: "You're alive again today — don't forget to be grateful for that. Spend real time with the people you love, because tomorrow you or someone you love might not be here. So not later — now, today. Anything you'd like me to remind you of? I'm here every day.",
    },
    exercise: (p, s) => ({ title: 'Morning workout time 💪', body: `Let's go: ${p} push-ups, ${s} sit-ups. Curious how you'll feel after.` }),
    brain: { title: 'A small brain exercise 🧠', body: '' },
    home: {
      title: 'Wrapping up the day 🙏',
      body: "Thank goodness, we made it through today too. I hope everything's alright. Is there anything you'd like me to remind you of?",
    },
    noonCheck: {
      title: 'Anything on your mind? 💭',
      body: "You haven't added any reminders yet. Is there anything you'd like me to remind you of? You can add it to your Reminders list in the app.",
    },
    steps: {
      title: '10,000 steps a day 🚶',
      body: "Walking 10,000 steps a day matters a lot for your health — can you finish by end of work? If not, don't forget a walk this evening after work or once you're home :)",
    },
    reading: (pages) => ({ title: 'Reading time 📖', body: `Did you read at least ${pages} pages today? Even a few pages is a nice moment for yourself.` }),
    teeth: {
      title: 'Brush your teeth 🦷',
      body: "Did you brush your teeth? Dental health matters — future you will thank you :)",
    },
    eveningExercise: (p, s) => ({
      title: 'A little evening movement 💪',
      body: `${p} push-ups, ${s} sit-ups — for a healthy, strong body. Future you will thank present you.`,
    }),
    bed: {
      title: 'Good night 🌙',
      body: "Time to close the day. Put the phone down — good sleep is waiting for you. I'll be here again tomorrow.",
    },
    reminder: { title: 'Reminder ⏰' },
  },
};

const BRAIN_TIPS = {
  tr: [
    'Bugün kullanmadığın elini biraz kullanmayı dene — dişini o elle fırçala mesela. Beynine farklı bir yoldan git.',
    'İşe ya da okula bugün farklı bir yoldan gitmeyi dene — beynin yeni yollar sever.',
    'Yeni bir kelime öğren ve bugün bir cümlede kullan.',
    'Bir dakika gözlerini kapatıp sadece etraftaki sesleri dinle.',
    'Bugün tanıdığın ama az konuştuğun biriyle kısa bir sohbet et.',
  ],
  en: [
    "Try using your non-dominant hand for something today — like brushing your teeth. Give your brain a new path.",
    'Take a different route to work or school today — your brain loves novelty.',
    'Learn one new word today and use it in a sentence.',
    'Spend one minute with your eyes closed just listening to the sounds around you.',
    'Have a short conversation today with someone you know but rarely talk to.',
  ],
};

function contentFor(lang) {
  return CONTENT[lang] || CONTENT.en;
}
function brainTipsFor(lang) {
  return BRAIN_TIPS[lang] || BRAIN_TIPS.en;
}

function toMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== 'string' || hhmm.indexOf(':') === -1) return null;
  var parts = hhmm.split(':');
  var h = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function nowInTz(tz) {
  try {
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).formatToParts(new Date());
    var map = {};
    parts.forEach(function (p) { map[p.type] = p.value; });
    var hour = map.hour === '24' ? 0 : parseInt(map.hour, 10);
    return { dateStr: map.year + '-' + map.month + '-' + map.day, minutes: hour * 60 + parseInt(map.minute, 10) };
  } catch (e) {
    var d = new Date();
    return { dateStr: d.toISOString().slice(0, 10), minutes: d.getUTCHours() * 60 + d.getUTCMinutes() };
  }
}

// diff = how many minutes ago `targetMin` was, relative to `nowMin` (wraps at 24h).
function minutesSince(nowMin, targetMin) {
  var diff = nowMin - targetMin;
  if (diff < 0) diff += 1440;
  return diff;
}
function inWindow(nowMin, targetMin, windowMin) {
  var diff = minutesSince(nowMin, targetMin);
  return diff >= 0 && diff < windowMin;
}

function dayOfYear(dateStr) {
  var d = new Date(dateStr + 'T00:00:00Z');
  var start = new Date(Date.UTC(d.getUTCFullYear(), 0, 0));
  return Math.floor((d - start) / 86400000);
}

// ayarlar.html'deki <input type="datetime-local"> alanından gelen
// "YYYY-MM-DDTHH:MM" biçimindeki, kullanıcının kendi cihaz saatine göre
// yerel bir zaman damgasını ayrıştırır. Zaman dilimi bilgisi taşımaz —
// kullanıcının record.timezone alanına göre yorumlanır (nowInTz ile aynı
// mantık).
function parseAt(at) {
  if (!at || typeof at !== 'string') return null;
  var m = at.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  var h = parseInt(m[2], 10);
  var mi = parseInt(m[3], 10);
  if (isNaN(h) || isNaN(mi)) return null;
  return { dateStr: m[1], minutes: h * 60 + mi };
}

// Hedef zaman şu ana kadar (bugün dahil, geçmişte kalan günler dahil)
// gelmiş mi? Fonksiyon her ~15 dakikada bir çalıştığı için "geçti mi"
// kontrolü yeterli — tekrarlı günlük hatırlatmaların aksine bunlar tek
// seferlik olduğu için pencere (window) kontrolüne gerek yok, gönderildikten
// sonra listeden tamamen kaldırılıyorlar.
function isDue(target, nowDateStr, nowMin) {
  if (target.dateStr < nowDateStr) return true;
  if (target.dateStr > nowDateStr) return false;
  return target.minutes <= nowMin;
}

async function sendPush(subscription, payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    // 404/410 = subscription expired/revoked by the browser — caller should drop it.
    return err && (err.statusCode === 404 || err.statusCode === 410) ? 'expired' : false;
  }
}

exports.handler = async (event) => {
  connectLambda(event || {});
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return { statusCode: 200, body: 'VAPID keys not configured — skipping (set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY in Netlify env vars).' };
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const store = getStore('one-subscribers');
  const { blobs } = await store.list();

  let sent = 0;
  let dropped = 0;

  for (const { key } of blobs) {
    const record = await store.get(key, { type: 'json' });
    if (!record || !record.subscription) continue;

    const tz = record.timezone || 'UTC';
    const lang = record.lang || 'en';
    const settings = record.settings || {};
    const { dateStr, minutes: nowMin } = nowInTz(tz);

    let state = record.state || { date: '' };
    if (state.date !== dateStr) {
      state = { date: dateStr, sentWake: false, sentExercise: false, sentBrain: false, sentNoonCheck: false, sentSteps: false, sentHome: false, sentReading: false, sentTeeth: false, sentEveningExercise: false, sentBed: false };
    }

    const wakeMin = toMinutes(settings.wakeTime);
    const homeMin = toMinutes(settings.homeTime);
    const bedMin = toMinutes(settings.bedTime);
    const c = contentFor(lang);

    const toSend = [];

    if (wakeMin !== null && !state.sentWake && inWindow(nowMin, wakeMin, WINDOW_MIN)) {
      toSend.push(['sentWake', c.wake]);
    } else if (wakeMin !== null && state.sentWake && !state.sentExercise && inWindow(nowMin, wakeMin + 15, WINDOW_MIN)) {
      toSend.push(['sentExercise', c.exercise(settings.pushups || 10, settings.situps || 20)]);
    } else if (wakeMin !== null && state.sentExercise && !state.sentBrain && inWindow(nowMin, wakeMin + 30, WINDOW_MIN)) {
      const tips = brainTipsFor(lang);
      const tip = tips[dayOfYear(dateStr) % tips.length];
      toSend.push(['sentBrain', { title: c.brain.title, body: tip }]);
    }

    // Öğlen 12:00 civarı: kullanıcı hiç hatırlatma eklemediyse nazikçe sor.
    const reminders = Array.isArray(record.reminders) ? record.reminders : [];
    if (!state.sentNoonCheck && reminders.length === 0 && inWindow(nowMin, 12 * 60, WINDOW_MIN)) {
      toSend.push(['sentNoonCheck', c.noonCheck]);
    }

    // Kullanıcının kendi eklediği, belirli bir zamana bağlı hatırlatmalar
    // (ayarlar.html'deki "Hatırlatmalarım" listesi, "at" alanı doluysa).
    // Zamanı geçmiş/gelmiş olanları ayıklıyoruz — bunlar tek seferlik,
    // gönderildikten (ya da başarısız da olsa denendikten) sonra listeden
    // düşecekler; "at" alanı boş olanlar (eski, zamansız notlar) hiç
    // dokunulmadan listede kalmaya devam eder.
    const dueReminders = [];
    const remainingReminders = [];
    for (const rem of reminders) {
      const target = rem && parseAt(rem.at);
      if (target && isDue(target, dateStr, nowMin)) {
        dueReminders.push(rem);
      } else {
        remainingReminders.push(rem);
      }
    }

    // Saat 13:00 civarı: günlük 10 bin adım hatırlatması (sabit saat).
    if (!state.sentSteps && inWindow(nowMin, 13 * 60, WINDOW_MIN)) {
      toSend.push(['sentSteps', c.steps]);
    }

    if (homeMin !== null && !state.sentHome && inWindow(nowMin, homeMin, WINDOW_MIN)) {
      toSend.push(['sentHome', c.home]);
    } else if (homeMin !== null && state.sentHome && !state.sentReading && inWindow(nowMin, homeMin + 60, WINDOW_MIN)) {
      toSend.push(['sentReading', c.reading(settings.pages || 5)]);
    }

    if (bedMin !== null && !state.sentTeeth && inWindow(nowMin, bedMin - 60, WINDOW_MIN)) {
      toSend.push(['sentTeeth', c.teeth]);
    } else if (bedMin !== null && state.sentTeeth && !state.sentEveningExercise && inWindow(nowMin, bedMin - 30, WINDOW_MIN)) {
      toSend.push(['sentEveningExercise', c.eveningExercise(settings.pushups || 10, settings.situps || 20)]);
    } else if (bedMin !== null && settings.notifyBedtime !== false && !state.sentBed && inWindow(nowMin, bedMin, WINDOW_MIN)) {
      toSend.push(['sentBed', c.bed]);
    }

    let expired = false;
    for (const [flag, notif] of toSend) {
      const result = await sendPush(record.subscription, notif);
      if (result === 'expired') { expired = true; break; }
      if (result === true) { sent++; state[flag] = true; } else { /* transient failure: leave flag false, retry next run */ }
    }

    // Zamanı gelmiş özel hatırlatmaları gönder. Başarılı olursa listeden
    // kalıcı olarak düşer (tek seferlik); geçici bir hata olursa (expired
    // değilse) bir sonraki çalıştırmada tekrar denenmek üzere listede kalır
    // — zamanı zaten geçtiği için isDue() true dönmeye devam edecektir.
    if (!expired) {
      for (const rem of dueReminders) {
        const result = await sendPush(record.subscription, { title: c.reminder.title, body: rem.text });
        if (result === 'expired') { expired = true; break; }
        if (result === true) { sent++; } else { remainingReminders.push(rem); }
      }
    }

    if (expired) {
      await store.delete(key);
      dropped++;
      continue;
    }

    const remindersChanged = remainingReminders.length !== reminders.length;
    if (toSend.length > 0 || remindersChanged) {
      record.state = state;
      if (remindersChanged) record.reminders = remainingReminders;
      await store.setJSON(key, record);
    }
  }

  return { statusCode: 200, body: `OK. sent=${sent} dropped=${dropped} checked=${blobs.length}` };
};
