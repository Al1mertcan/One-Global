# Hemcan — iPhone (App Store) rehberi

*Hazırlanma: Kasım 2026. Apple ve Codemagic ekranları/kuralları zamanla değişir; bir adım burada yazdığım gibi görünmüyorsa adın amacını takip et ve bana yaz.*

## Bu pakette ne var, ne yok

**Hazır olanlar** (hepsi bu repoda):

- `native/` — iOS uygulama kabuğu (Capacitor). Bir Xcode projesi içerir; Mac'te açman gerekmiyor.
- `native.js` — uygulamaya özel katman. Web sitesinde hiçbir şey yapmaz; yalnızca iPhone uygulamasında çalışır.
- `codemagic.yaml` — bulutta (Codemagic servisinde) uygulamayı derleyip TestFlight'a yükleyen ayar dosyası.
- `store/` klasörü (zip'te ayrı verildi) — mağaza metinleri ve iPhone ekran görüntüleri.

**iPhone'da web sürümünden farklı olanlar** (bilerek):

| Konu | iPhone uygulaması |
|---|---|
| Bildirimler | Telefonun kendi yerel bildirimleri. Sunucuya abonelik gönderilmez. Günlük rutin, su, hatırlatmalarım çalışır. |
| "Bugünün iyi haberleri" bildirimi | Yok (zaten sunucudan gelen bir bildirimdi, iPhone'da ilk sürümde yok). Haberler uygulama içinde görünür. |
| Su bildirimindeki düğmeler (bardak, 500 ml, 1 lt) | Bildirime uzun basınca/çekince görünür. |
| Hemcan Plan (10 TL) sayfası | Gizli. Ödeme altyapısı yok; Apple'ın dijital ürün kuralları ayrı bir konu. |
| E-postayla giriş bağlantısı | Gizli (iPhone uygulaması için gereksiz). |
| İnternet yokken | Ekranlar, simgeler ve yazı tipleri uygulamanın içinde; internetsiz açılır. Haberler ve üye sayacı için internet gerekir. |
| Bildirim dilleri | Türkçe ve İngilizce (web'dekiyle aynı); diğer diller İngilizceye düşer. |

## Adım adım

### 1. Apple Developer kaydı (sen)

1. https://developer.apple.com/programs/enroll adresini aç.
2. 2 adımlı doğrulaması açık bir Apple Hesabıyla giriş yap (yoksa oluştur).
3. **Bireysel (Individual)** seç. Yasal adın kullanılır ve App Store'da "satıcı" olarak görünür.
4. Apple kimlik doğrulaması isterse eşinin iPhone'undaki **Apple Developer** uygulamasını kullan.
5. Yıllık 99 USD (yerel para birimiyle gösterilir) ödemesi. Onay genelde 1–3 gün sürer.

### 2. Uygulama kimliğini ve kaydını oluştur (sen, onaydan sonra)

1. developer.apple.com → **Certificates, Identifiers & Profiles → Identifiers → +** → *App IDs* → *App*.
   - Description: `Hemcan`
   - Bundle ID: **Explicit**, değer: `app.hemcan.mobile`
   - Özel yetenek (capability) seçme.
2. appstoreconnect.apple.com → **Apps → +  → New App**:
   - Platform: iOS, Ad: `Hemcan`, Ana dil: Türkçe
   - Bundle ID: `app.hemcan.mobile`, SKU: `hemcan-ios-1`

> Bundle ID'yi değiştirmek istersen ilk yüklemeden **önce** söyle. `native/capacitor.config.json` ve `codemagic.yaml` içindeki değeri birlikte güncellerim.

### 3. App Store Connect API anahtarı (sen)

App Store Connect → **Users and Access → Integrations → App Store Connect API → Team Keys → +**. Rol: *App Manager*. Şunları not et:
**Issuer ID**, **Key ID** ve indirdiğin **.p8 dosyası** (yalnızca bir kez indirilebilir, kaybetme; kimseyle paylaşma, bana da gönderme).

### 4. Codemagic (sen)

1. https://codemagic.io → GitHub ile giriş yap, `One-Global` deposunu ekle. Kişisel hesapta ayda 500 ücretsiz Mac dakikası var.
2. **Teams → Personal Account → Integrations → Developer Portal → Connect** ile az önceki Issuer ID, Key ID ve .p8'i ekle. Anahtara verdiğin ad **tam olarak** `hemcan-appstore` olmalı (`codemagic.yaml` bu adı kullanıyor).
3. Bu repoya güncelleme zip'ini yükledikten sonra GitHub'da **Releases → Draft a new release** ile `ios-1` adında bir etiket (tag) oluştur. Codemagic derlemeyi kendisi başlatır. İstersen Codemagic'ten elle de başlatabilirsin.
4. Derleme başarılı olursa uygulama **TestFlight'a** otomatik yüklenir (işlenmesi birkaç dakika sürebilir). Hata olursa günlüğün son 30 satırını bana yapıştır.

> Yeni bir derleme için yeni bir etiket (`ios-2`, `ios-3`...) oluştur. Derleme numarası otomatik artar.

### 5. iPhone'da dene (eşinin telefonu)

1. App Store Connect → **Users and Access** → eşinin Apple Hesabı e-postasını davet et (rol: *Developer* yeterli).
2. **TestFlight → Internal Testing →** yeni grup → eşini ve kendini ekle.
3. Eşinin iPhone'una **TestFlight** uygulamasını kur, davetten Hemcan'ı yükle.

Deneme listesi:

- [ ] Açılış: koyu ekran, simge doğru, ilk açılış ekranı geliyor.
- [ ] Uçak modunda aç: ekranlar ve simgeler düzgün mü?
- [ ] Ayarlar → bildirimlere izin ver → izin penceresi çıkıyor mu?
- [ ] Rutin saatlerini birkaç dakika sonrasına ayarla; bildirim geliyor mu?
- [ ] Su bildirimine uzun bas → bardak/500 ml/1 lt düğmeleri çıkıyor; birine basınca su kaydı artıyor mu?
- [ ] Hatırlatmalarım: 2 dakika sonrasına bir hatırlatma ekle; geliyor mu?
- [ ] Bildirimi kapat → bekleyen bildirimler iptal oluyor mu?
- [ ] Cüzdan: gelir/gider ekle, limit koy, yedek al, uygulamayı kapat-aç: kayıtlar duruyor mu?
- [ ] İyi haberler kartları sağa-sola kayıyor, bir habere basınca uygulama içi tarayıcı açılıyor mu?
- [ ] Dil değiştir (Türkçe/İngilizce/Arapça).
- [ ] Ayarlar → Verilerini sil: her şey sıfırlanıyor mu?
- [ ] Hemcan Plan satırı ve e-posta ile giriş **görünmüyor** mu?

### 6. Mağaza sayfası ve gönderim (sen + ben)

`store/` klasöründe hazır: `app-store-metin.md` (ad, alt başlık, açıklama, anahtar kelimeler, inceleme notu, gizlilik cevapları taslağı) ve iPhone ekran görüntüleri (`6.9/` ve `6.1/` klasörleri). App Store Connect'te şunlar da gerekir:

- **Destek URL'si:** `https://cheery-rolypoly-540555.netlify.app/yardim.html`
- **Gizlilik politikası URL'si:** `https://cheery-rolypoly-540555.netlify.app/gizlilik.html`
- **Fiyat:** Ücretsiz. **Uygulama içi satın alma yok.**
- **Yaş derecelendirmesi anketi** (sorulara dürüst yanıt ver; içerik açısından 4+ çıkması beklenir).
- **App Privacy:** `app-store-metin.md` içindeki taslağa bak.
- TestFlight derlemesini seç, **İncelemeye gönder.**

## Gönderimden önce karar vermen gereken şeyler

Bunlar kodla çözülmeyen, Apple incelemesini etkileyebilecek konular. Hiçbirini senin adına değiştirmedim.

1. **"Yakında" içerikleri.** Ana ekrandaki "Hemcan Yapay Zekâ — Yakında" kartı ve "Cihazlar" sekmesi ("henüz yok, yol haritası") bitmemiş içerik gibi okunabilir. Apple tamamlanmamış/"yakında" içeriği sık sık reddeder (App Review 2.1). Öneri: iPhone sürümünde bu ikisini gizle. İstersen ayarlarım.
2. **Hedefler sayfası.** Gerçek bir doktorun adı ve "ilaçsız tedavi" gibi tıbbi iddialar içeren bir hedef var. Tıbbi iddia ve gerçek kişi adı inceleme için riskli. Öneri: iPhone sürümünde bu sayfayı gizle ya da o hedefi kaldır/yumuşat. Mağaza ekran görüntülerinde bu sayfayı kullanmadım.
3. **Bağış/paylaşım cümleleri.** Ana ekrandaki "Hemcan ailesi" kartında gelirin bir kısmının paylaşılacağı yazıyor. Bu, kendi kazancından yapacağın bir söz olarak kalabilir; yalnızca dilin "otomatik dağıtılıyor" gibi olmamasına dikkat et. Kart zaten uygulamanın bağış toplamadığını belirtiyor.
4. **Gizlilik politikası** avukat incelemesinden geçmedi ve yalnızca Türkçe. iPhone için kısa bir bölüm ekledim. Apple, politika metninin App Privacy cevaplarınla tutarlı olmasını bekler. IP adresinin "kısa süre kaydedilmesi" cümlesini netleştirmek gerekebilir (ne kadar, nerede).
5. **Gelecekte ücretli plan.** iPhone uygulamasında dijital abonelik satarsan Apple'ın kendi ödeme sistemi (In-App Purchase) ve komisyonu devreye girer. Bu sürümde plan sayfası gizli, yani bu konu şimdilik yok.

## Sık karşılaşılabilecek sorunlar

- **"Bundle ID bulunamadı" / imzalama hatası:** 2. adımdaki Bundle ID'nin birebir `app.hemcan.mobile` olduğunu ve Codemagic'teki anahtar adının `hemcan-appstore` olduğunu kontrol et.
- **TestFlight'ta derleme görünmüyor:** Apple'ın işlemesi 10–30 dakika sürebilir; e-posta gelir.
- **Bildirim gelmiyor:** iPhone Ayarlar → Bildirimler → Hemcan izinli mi? Odak (Focus) modu açık mı?
- **Yeni haber uygulamada görünmüyor:** Haberler siteden çekilir; `iyi-haberler.json` GitHub'a yüklenince uygulama güncellemesi gerekmez.

## Bu dosyalar ne işe yarar (teknik özet)

- `native/package.json`, `native/capacitor.config.json`: kabuğun ayarı (uygulama adı, bundle ID, açılış rengi).
- `native/scripts/sync-web.js`: derleme sırasında site dosyalarını kabuğa kopyalar; Tailwind, simgeler ve yazı tiplerini uygulamanın içine gömer (web sitesi etkilenmez).
- `native/ios/`: Xcode projesi (simge, açılış ekranı, yalnızca iPhone, yalnızca dikey).
- `codemagic.yaml`: bulut derleme tarifi.
