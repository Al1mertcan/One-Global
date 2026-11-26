# Hemcan — Kasım 2026 yeni özellikler (notlar)

## SON GÜNCELLEME: Fotoğraftan kalori (Haiku ile) + "Hemcan ailesi" sayacı düzeltmesi
- **Fotoğraftan kalori artık en uygun maliyetli modelle başlıyor** (`claude-haiku-5-5`). Yetmezse KOD DEĞİŞTİRMEDEN Netlify ortam değişkeni `PHOTO_KCAL_MODEL=claude-sonnet-5-5` (bir üst model) yaz → yeniden deploy. Geri dönmek için değişkeni sil.
- **Açmak için** (Netlify → Site configuration → Environment variables): `ANTHROPIC_API_KEY` ve `PHOTO_KCAL_ENABLED=1`. Anahtarı kimseyle/sohbette paylaşma. İsteğe bağlı: `PHOTO_KCAL_MONTHLY_PER_USER` (kişi başı aylık hak, varsayılan 100), `PHOTO_KCAL_IP_PER_HOUR` (10), `PHOTO_KCAL_DAILY_CAP` (tüm site günlük tavan, 300).
- **Kişi başı aylık hak:** yalnızca kayıtlı üyeler kullanabilir; ekranda "Bu ay kalan fotoğraf hakkın: N" görünür. Yapay zeka hata verirse o fotoğrafın hakkı geri verilir. Ay, Türkiye saatine göre değişir.
- **Henüz YOK:** ücretli plana bağlama (Pro kontrolü). Uygulamada sunucu tarafında doğrulanan bir abonelik/ödeme sistemi olmadığı için hak, plana göre değil herkese eşit (varsayılan 100/ay) verilir. Ödeme sistemi kurulunca plana göre hak (70/120/170 TL paketleri vb.) eklenir. O zamana dek maliyeti `PHOTO_KCAL_MONTHLY_PER_USER` ve günlük tavanla sınırla; Anthropic faturasını izle.
- **Sayaç ("Hemcan ailesi") — "—" görünüyordu:** "—" sunucudan sayı alınamadığı anlamına gelir. Uygulama artık son bilinen sayıyı saklayıp gösteriyor, 3/10/30 sn sonra kendiliğinden yeniden deniyor, sayıya dokununca da yeniden deniyor ve altında nedenin kısa kodunu yazıyor (ör. `HTTP 502`, `network`, `offline`). Hizmet çalışanı artık `/api/` isteklerini önbelleğe almıyor ve hata cevaplarını saklamıyor (v24). Sunucu tarafı (`member-count.js`) depo başlatılamazsa okunur `store-unavailable` kodu döndürüyor. Ekranda kod görünürse: `HTTP 5xx` → Netlify → Logs → Functions → member-count kaydına bak (Blobs/kredi/kota sorunu olabilir); `network` → cihazın internetini veya sitenin açık olup olmadığını kontrol et.

---

## EN SON EKLENEN: Kaza namazı + günlük sudoku + günlük genel kültür (sıralamalı)
- **Kaza namazı (`kaza.html`/`kaza.js`):** yıl/ay/gün gir (yıl=365, ay=30 gün) → her vakit için borç otomatik hesaplanır (10 yıl 5 ay = 3.800 gün → 5 vakit × 3.800). Her vakitte "Kıldım (−1)" ve "+" düğmesi, sayıya dokunup elle düzenleme, ilerleme çubuğu, bugün kılınan, seçilebilir hızla tahmini bitiş süresi. Yalnızca telefonda (`one-kaza`). Dinî hüküm vermez, sadece sayaçtır (sayfada yazıyor). Ana ekranda Sağlık ve iyi oluş içinde "Kaza namazı" kutusu var.
- **Günlük sudoku (`sudoku.html`):** kolay/orta/zor, **herkese aynı gün aynı bulmaca** (tarihten üretilir, tek çözümlü). Süre sınırı yok; "Başla"da sayaç çalışır, uygulama arka plana gidince durur. Not (kalem), geri al, sil, çakışma kırmızı. Gün başına seviye başına tek hak.
- **Günlük genel kültür (`genelkultur.html`):** 10 soru, soru başına 30 sn; işaretlenmezse süre dolunca otomatik sonraki soru. 133 soruluk havuzdan her gün aynı 10 soru (aynı tur içinde tekrar yok). En çok doğru, eşitlikte en hızlı. Sorular `mola-data.js` ile ortak (Mola sayfasındaki mini yarışma da bu havuzu kullanır).
- **Sıralama (sunucu: `netlify/functions/daily.js`):** İSİMSİZ. Kişi bitirdiği günün sonucunu **ertesi gün 01:00'de (Türkiye saati)** "X kişiden N. sıradasınız" olarak görür (1. ise tebrik metni). Gün Türkiye saatine göre 00:00'da değişir; gece yarısını aşan oyun ertesi gün 00:59'a kadar gönderilebilir. Yalnızca kayıtlı üyeler (`one-members`, "Ücretsiz Başla" ile oluşan kayıt) sıralamaya girer; kayıt yoksa uygulama bir kez kaydeder. X = o gün o oyunu bitirenlerin sayısı (her seviye ayrı sayılır).
- **Gizlilik:** sunucuya yalnızca rastgele teknik kimlik (sha256 özeti olarak saklanır), oyun, gün ve sonuç gider; `gizlilik.html` güncellendi. Kaza namazı sayıları sunucuya gitmez.
- **Hile koruması (dürüst not):** kimlik doğrulaması yok, soru bankası herkese açık. Sunucu: tek hak (ilk "start" anı kayıtlı), sudoku çözümünü kendisi üretip doğrular, süreyi sunucunun geçen süresiyle sınırlar ve insanüstü hız tabanı uygular (kolay 45, orta 70, zor 100 sn); genel kültürde cevapları sunucu değerlendirir, süreyi kendisi ölçer (en az 25 sn, 7 dakikadan uzun süren deneme sıralamaya alınmaz). Kararlı biri yine de hile yapabilir; sıralama eğlence amaçlıdır. Katılımcı az olduğu sürece "N kişiden 1." anlamı sınırlıdır (ilk günlerde 1-2 kişi olabilir; bu normal).
- **Senin yapacakların:** (1) GitHub'a yükle — yeni dosyalar: `kaza.*`, `sudoku.*`, `genelkultur.*`, `daily-core.js`, `daily-net.js`, `netlify/functions/daily.js`, `_daily-core.js`, `_trivia-bank.js`. Netlify'da ek ayar GEREKMEZ (Blobs zaten kullanılıyor). (2) Hizmet çalışanı v23. (3) **`daily-core.js` ile `netlify/functions/_daily-core.js` birebir aynı kalmalı** (testte kontrol ediliyor); soru eklersen `mola-data.js` ve `_trivia-bank.js` birlikte güncellenmeli (aynı sıra, aynı doğru şık). (4) Sudoku ve soruların ilk günkü sıralamasını telefonda dene; günlük sonuçlar ertesi gün 01:00 sonrası görünür.

---

## Bir önceki: Sağlık ve iyi oluş (7 özellik)
Ana ekranda (Asistan sekmesi) "Sağlık ve iyi oluş" kartları: Ruh hali günlüğü, Nefes & Uyku, Alışkanlıklar, Ekrandan mola, Yürüyüş & Koşu. Su kaydı ve Kalori kartları mevcut sayfalarında geliştirildi. Hepsinin verisi yalnızca telefonda durur (`one-*` anahtarları; Ayarlar'daki "verilerimi sil" hepsini siler). Yeni metinler Türkçe + İngilizce (`wb-strings.js`).

- **Ruh hali + kısa günlük (`gunluk.html`):** 5 ruh hali, 14 etiket, günün sorusu, 300 karakterlik not; 7 günlük grafik, ay takvimi, seri, kişisel içgörüler (en az 8 kayıttan sonra), son 30 günü panoya kopyalama. Ruh hali düşükse destek kartı; kriz hattı vaadi yok, tıbbi iddia yok.
- **Nefes, meditasyon, uyku sesleri (`nefes.html`):** 4-7-8, kutu, sakinleşme, eşit nefes; meditasyon zamanlayıcısı (aralık çanı); 8 uyku sesi + 5 hazır karışım + zamanlayıcı/yumuşak kapanış + "Ekranı karart". Sesler dosya değil, cihazda üretilir (telif sorunu yok). **Sınır:** Android'de uygulama arka plana atılırsa/ekran kilitlenirse WebView sesi durur; bu yüzden "Ekranı karart" ve ekran uyanık tutma var. Gerçek arka plan sesi için ileride yerel "ön plan servisi" yazılmalı (şimdilik YOK).
- **Alışkanlık serisi + evcil dost (`aliskanlik.html`):** günlere göre alışkanlıklar, otomatik işaretleme (su hedefi, ruh hali kaydı, 1 dk nefes), seri, yıldız → yumurtadan "Efsane"ye 5 aşama, renk/aksesuar açılımı. Özgün çizim (SVG); kaçırılan gün için suçlayıcı dil yok.
- **Su (asistan.html #su):** bardak ızgarası, hedef (500-6000 ml) ve bardak boyutu ayarı, 7 günlük geçmiş ve seri. Eski `one-water` biçimi ve bildirimden "+bardak" akışı aynen çalışır.
- **Ekrandan mola (`mola.html`):** 20-20-20 göz molası sayacı, günün sorusu, 20 bilmece, 5 soruluk mini yarışma (43 soru). İçerik `mola-data.js`'te; üretici betik tutulmuyor, dosyayı doğrudan düzenleyebilirsin.
- **Yürüyüş/koşu/bisiklet GPS (`yuruyus.html`):** mesafe, süre, tempo/hız, tahmini kalori (kilo ayarlanır), rota çizimi (harita sağlayıcısı yok), geçmiş, yarım kalan kaydı kurtarma. GPS sıçraması/araç hızı/zayıf sinyal filtrelenir. **Sınır:** yalnızca uygulama açıkken kayıt (arka plan konum izni bilerek istenmiyor); ekran uyanık tutulur. Eklenti: `@capacitor/geolocation` (`native/package.json` + lock güncellendi), Android konum izni + iOS `NSLocationWhenInUseUsageDescription` eklendi.
- **Fotoğraftan kalori (`kalori.html` + `netlify/functions/photo-calorie.js`):** KAPALI gelir. Düğmeler yalnızca sunucu `enabled:true` derse görünür. Her fotoğraf için ilk kullanımda onay kartı; fotoğraf 1024 px'e küçültülür, saklanmaz. Maliyet koruması: IP başına saatte 10, tüm site günde 300 (env ile değişir); sınır deposu çökerse istek reddedilir.

### Bu özellikler için SENİN yapacakların
1. GitHub'a yükle (site otomatik yayına girer). Hizmet çalışanı sürümü v22 oldu; eski kullanıcılarda önbellek kendiliğinden yenilenir.
2. **Fotoğraftan kalori'yi açmak istersen** (istemezsen hiçbir şey yapma, kapalı kalır): Netlify → Site configuration → Environment variables: `ANTHROPIC_API_KEY` (sohbet için eklediysen aynı anahtar) + `PHOTO_KCAL_ENABLED=1`. İstersen `PHOTO_KCAL_IP_PER_HOUR` ve `PHOTO_KCAL_DAILY_CAP` ile sınırları değiştir. Anahtarı kimseyle paylaşma, sohbete yazma. Her fotoğraf gerçek para harcar (tutar Anthropic'in güncel fiyatına ve modele göre değişir); önce küçük bir günlük sınırla başla ve Anthropic faturanı izle.
3. **Codemagic:** yeni yerel eklenti (`@capacitor/geolocation`) var → yeni etiket at (Android: sıradaki `android-release` çalıştırması, iOS: bir sonraki `ios-N`). `npm ci` kilit dosyasından kurar; `cap sync` Gradle/Podfile'ı kendisi günceller.
4. **Google Play → Uygulama içeriği → Veri güvenliği:** "Konum → Yaklaşık/Kesin konum" ekle: toplanır ama **paylaşılmaz**, cihazda işlenir, isteğe bağlı (yürüyüş kaydı). Fotoğraftan kalori'yi AÇARSAN: "Fotoğraflar" → paylaşılır (yapay zekâ sağlayıcısına), isteğe bağlı, depolanmaz. Konum izni beyanı formunda "ön planda, kullanıcı başlatınca" de.
5. **App Store Connect → App Privacy:** Konum (yalnızca uygulama açıkken, cihazda) ve (açarsan) Fotoğraflar. Info.plist metinleri hazır (konum, kamera, fotoğraf kitaplığı).
6. Gerçek telefonda dene: GPS kaydı (açık havada), uyku sesleri (ekran karartma), bildirimden su ekleme, widget'lar. Bunların hiçbiri gerçek cihazda denenmedi; testler tarayıcıda sahte konum/ses ile yapıldı.

### Bilinen sınırlar (yeni özellikler)
- Android Java/Gradle/Pod tarafı bu ortamda derlenemedi; yeni eklenti ilk Codemagic derlemesinde doğrulanacak.
- GPS kaydı arka planda sürmez; uygulama kapanırsa "yarım kalan kayıt" kartı çıkar.
- Uyku sesleri arka planda/ekran kilidinde durabilir (yukarıya bak).
- Kalori tahminleri (yazıdan da fotoğraftan da) kabadır; sağlık/diyet tavsiyesi değildir. Ruh hali günlüğü tıbbi bir araç değildir.
- Yeni metinler yalnızca Türkçe ve İngilizce; diğer dillerde İngilizce görünür.
- Mola içeriği (soru/bilmece) Türkçe ve İngilizce ayrı yazıldı; eklemek için `mola-data.js`'e aynı biçimde satır ekle.

## Neler eklendi
- **Rutin yönlendirmesi (`rutin.html`):** formdan sonra uyanış, eve geliş ve yatış saati sorulur (uyku süresi bilgisiyle); "Şimdilik geç" mümkün. Saatleri hiç ayarlamamış kullanıcıya ana sayfada "Günlük rutinini ayarla" kartı çıkar.
- **Açılış formu:** ad, soyad, e-posta (yalnızca telefonda `one-profile`). Üstte "Günaydın Ali" selamlaması.
- **Kalori takibi (`kalori.html`, `kalori.js`):** serbest metin → otomatik kcal. 650+ kayıt: içecek, yemek, salata, tatlı, abur cubur, çikolata/bar, cips, diyet/light ürünler. Günlük sınır, gün sonu tebrik / "yarın başaracaksın" mesajı. Değerler yaklaşıktır.
- **Adım sayar:** otomatik (elle giriş yok). Android: telefonun donanım adım sayacı, iPhone: Core Motion. Hedef 10.000 adım; hedefe ulaşınca tebrik bildirimi.
- **Android ana ekran widget'ı:** halka + adım, km, kcal (`StepsWidget`).
- **Bildirim seçimi (Ayarlar → "Hangi bildirimleri alayım?"):** her bildirim ayrı açılıp kapanır.
- **Günün sözü:** her gün 10:00, daha vurucu 100 özgün söz (tr + en); aynı söz ~3,5 ay sonra başa sarar.
- **Tekrarlayan hatırlatmalar:** tek sefer, her gün, haftada bir, ayda bir, N saatte bir (1/2/3/4/6/8/12). "Saatte bir" 23:00–07:00 arası susar; önümüzdeki saatler önceden kurulur, uygulama açıldıkça yenilenir (Android ~2 gün, iPhone ~6 bildirim). Ayın 29–31'inde başlayan aylık hatırlatma kısa aylarda o ayın son gününe kayar (sunucu bildirimi) ya da atlanır (telefon bildirimi).
- **Güne karşılama:** uyanma saatinde "Günaydın, Ali ☀️" bildirimi (alarm değil), varsayılan AÇIK; Ayarlar'dan kapatılır. Selamlama: 05:00'e kadar "İyi geceler", sonra Günaydın / İyi günler / İyi akşamlar, adın önünde virgül.
- **Yeni bildirim saatleri:** okuma = eve geliş + 2 saat, akşam sporu = yatmadan 1 saat önce, diş fırçalama = yatmadan yarım saat önce.
- **Sekmeler:** Bellek ve Cihazlar kaldırıldı; alt menü: Asistan, Hemcan, Hedefler, Otomasyon.
- **Kalori:** birden çok yiyecek virgül / "ve" / "ile" / "+" / alt satır ile ayrılır; ayırıcı yazılmasa da yeni miktar ("3 yumurta 400 gr tavuk") yeni yiyecek sayılır. Giriş ipucuna uyarı eklendi.
- **Bildirimler gelmiyor mu? (Android):** Ayarlar'da bildirim ve pil ayarlarını açan düğmeler. Manifestte sensör/donanım özellikleri "zorunlu değil" yapıldı (Play'de daha çok cihaz).
- **Günlük haber hazırlığı:** her sabah ~09:33'te sohbete 1-3 yeni haber + güncellenmiş iyi-haberler.json gelir; sen GitHub'a yüklersin. Liste 5-10 haber (hedef 8). Ölçüt "umut / gülümseme testi": doğanın toparlanması, sağlıkta net kazanımlar, sıcak insan-hayvan hikâyeleri. Taze haber azsa 2026 başından en güzelleri eklenir. Her haber kaynak sayfasından doğrulanır; ön aşama bilimsel bulgular kesin tedavi gibi yazılmaz.
- **Android sunucu bildirimi (Firebase):** pil kısıtlayan markalarda bildirimler kaybolmasın diye rutin / söz / hatırlatmalar sunucudan Google bildirim servisiyle gönderilir. Kurulum: `FIREBASE-REHBERI.md`. Kurulmazsa uygulama yerel bildirimlerle çalışmaya devam eder. Netlify zamanlayıcısı 5 dakikada bir çalışır.
- **Spor / kitap bildirimleri:** günlük / aylık / yıllık toplamlar.
- **Hemcan sekmesi (`hemcan.html`):** "Hemcan ailesi" (üye sayacı, hedefler) ve "Hemcan ne demek?" yalnızca burada; ana sayfadan kaldırıldı.
- **Düzeltmeler:** hatırlatmalar artık silinmiyor (zamanı geçenler "Gönderildi" olur, yedeği tutulur); üye sayacı kaydı beklenip doğrulanıyor, kaydı hiç ulaşmamış cihazlar uygulama açılınca bir kez daha deniyor; sunucu sayacı üye listesinden kendini düzeltiyor (5 dk'da bir), hız sınırı hata verirse kayıt engellenmiyor, sayaç önbelleğe alınmıyor. Sunucu düzeltmesi için GitHub'a yükleme şart.
- Açılış ekranı 6 sn → 3 sn.

## Yayın öncesi yapılacaklar
1. GitHub'a yükle (GitHub Desktop). Site otomatik yayına girer.
2. **Firebase kurulumu (yalnızca Android sunucu bildirimi için):** `FIREBASE-REHBERI.md` — `google-services.json` + Netlify'da `FIREBASE_SERVICE_ACCOUNT`.
3. Codemagic: Android için `android-release`, iOS için `ios-3` etiketi.
4. **Google Play → Uygulama içeriği:** "Fiziksel aktivite" iznini (ACTIVITY_RECOGNITION) kullandığını belirt; veri cihazda kalır. **Veri güvenliği:** Firebase kullanıldığında "Cihaz veya diğer kimlikler" toplanıyor olarak işaretlenmeli (bildirim adresi).
5. **App Store Connect:** Hareket ve Fitness (NSMotionUsageDescription) metni Info.plist'te hazır; App Privacy'de değişiklik gerekmez (veri cihazda kalır).

## Bilinen sınırlar (dürüst not)
- Adım sayar, widget ve alarm **gerçek telefonda denenmedi**; ilk testi sende olacak.
- Android widget'ı ve 10 bin adım tebrigi, uygulama kapalıyken widget yenilendiğinde (~30 dk) veya uygulama açılınca çalışır. Widget eklenmemişse tebrik uygulamayı açınca gelir.
- iPhone'da widget yok (ayrı bir Apple eklentisi gerekir); iPhone'da adım uygulama açılınca okunur.
- Günün sözü bildirimleri önceden planlanır: Android 14 gün, iPhone 7 gün; uygulama bu süre içinde açılmazsa durur.
- Firebase kodu (Android Java/Gradle) derlenemedi, yalnızca JS tarafı test edildi: ilk derlemede Codemagic günlüğünü kontrol et. Sunucu bildirimi ~5 dk gecikebilir, su düğmeleri yoktur, güne karşılamada ad yoktur.
- Alarm bildirimi dakikalarca kayabilir (pil tasarrufu); gerçek çalar saat yerine geçmez.
- Yeni metinler yalnızca Türkçe ve İngilizce; diğer 19 dilde İngilizce görünür.
- Üye sayacı canlı sitede sandbox'tan denenemedi: yayından sonra sayıyı gerçekte uygulamayı açan kişi sayısıyla karşılaştır.
