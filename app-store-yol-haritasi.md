# ONE Global — App Store / Play Store Yol Haritası

*Son güncelleme: Ağustos 2026. Bu belge, mağaza kuralları ve ücretleri zamanla değiştiği için düzenli olarak (özellikle başvurudan hemen önce) Apple ve Google'ın kendi güncel geliştirici dokümantasyonundan teyit edilerek gözden geçirilmelidir.*

## 1. Mevcut durum

ONE Global şu an bir **PWA** (Progressive Web App) — tarayıcıda çalışan, "ana ekrana ekle" ile yüklenebilen, push bildirim gönderebilen bir web uygulaması. Native (gerçek) bir iOS/Android uygulaması değil. Bu, App Store ve Play Store'a girmeden önce çözülmesi gereken ilk teknik konu.

İki temel yol var:

- **PWA'yı sarmalamak** (önerilen ilk adım): Mevcut kodu değiştirmeden, PWA'yı bir native "kabuk" içine koyup mağazalara native bir uygulama gibi göndermek. Android'de buna Trusted Web Activity (TWA) denir; iOS'ta genelde Capacitor gibi bir araçla yapılır. En hızlı ve en ucuz yol budur.
- **Tam native yeniden yazım**: Swift/Kotlin ile sıfırdan yazmak. Çok daha uzun sürer, çok daha pahalıdır; ONE Global'ın bugünkü ölçeğinde gerekli değil.

Pratik araç önerisi: **PWABuilder** (Microsoft'un ücretsiz aracı, pwabuilder.com) — mevcut `manifest.json` ve service worker'ı okuyup Android için imzalanmış bir AAB/APK, iOS için bir Xcode proje şablonu üretebiliyor. ONE Global'ın manifest.json ve service-worker.js dosyaları zaten bu işe uygun durumda (bu oturumda ikonlar da tazelendi).

## 2. Google Play (Android) — daha ucuz ve daha hızlı yol

- **Ücret**: 25 ABD doları, tek seferlik (yıllık değil).
- **Yeni bireysel hesap kuralı**: 13 Kasım 2023'ten sonra açılan bireysel geliştirici hesapları, uygulamayı canlıya (production) almadan önce **en az 12 test kullanıcısıyla, kesintisiz en az 14 gün süren bir kapalı test (closed testing)** yapmak zorunda. 14 günden önce sistemden çıkan test kullanıcıları sayılmıyor. Süre dolunca 3 bölümlü bir "üretime hazır mıyım" formu dolduruluyor ve Google genelde 7 gün içinde inceliyor.
- **2026'da devreye giren "Android Geliştirici Doğrulaması" (Android Developer Verification)**: Google, sertifikalı Android cihazlara dağıtılan TÜM uygulamalar için (Play Store dışına — "sideloading" ile — yüklenenler dahil) geliştirici kimlik doğrulaması getiriyor. Mart 2026'da tüm geliştiriciler için tam konsol deneyimi açılıyor; 30 Eylül 2026'dan itibaren önce Brezilya, Endonezya, Singapur ve Tayland'da zorunlu hale geliyor (diğer bölgelere yayılması bekleniyor). Tam hesap için resmi kimlik doğrulaması gerekiyor; hobi/bireysel/küçük ölçekli kullanım için 20 cihaza kadar dağıtım yapılabilen **ücretsiz "sınırlı hesap"** seçeneği de var — ONE Global'ın erken aşaması için bu yeterli olabilir.
- **Pratik anlamı**: Play Store yolu Apple'dan hem daha ucuz hem daha hızlı başlanabilir, ama "12 test kullanıcısı + 14 gün" şartı yüzünden en azından 2 haftalık bir plana ihtiyaç var — bu süreyi gerçek kullanıcı geri bildirimi toplamak için de değerlendirebiliriz.

## 3. Apple App Store (iOS) — daha maliyetli ve daha titiz inceleme

- **Ücret**: Apple Developer Program, yıllık 99 ABD doları (yıl bitince yenilenmezse uygulama mağazadan kalkar).
- **Geliştirme ortamı**: Xcode, yani bir Mac gerektirir (ya da bulut tabanlı bir CI/derleme servisi — Codemagic, Ionic Appflow gibi — Mac'siz de mümkün ama ek maliyetli).
- **İnceleme kuralları — özellikle dikkat edilmesi gereken madde**: Apple'ın "4.2 Minimum Functionality" kuralı, "sadece bir web sitesini sarmalayan" uygulamaları reddedebiliyor. ONE Global'ın push bildirimleri, çevrimdışı önbellek (service worker) ve gerçek bir sohbet/rutin deneyimi olması bu açıdan işimize yarıyor, ama sarmalama sırasında native gezinme/paylaşım gibi platforma özgü küçük dokunuşlar eklemek incelemeyi kolaylaştırır.
- **Gizlilik**: App Store Connect'te doldurulması gereken bir "Gizlilik Nutrition Label" (uygulamanın topladığı veri kategorilerini beyan eden form) var — gizlilik.html'deki liste bu formu doldururken doğrudan referans olarak kullanılabilir.
- **Ödeme kuralları — hâlâ değişen bir alan**: Apple, dijital abonelikler için geleneksel olarak kendi "In-App Purchase" sistemini zorunlu kılar ve %15-30 komisyon alır. 2025'te (Epic v. Apple davası sonrası) ABD mağazasında uygulamaların harici bir web sitesine ödeme için yönlendirme yapmasına izin verilmeye başlandı, ancak bu kural bölgeye göre değişiyor ve hâlâ hukuki/politik olarak hareketli bir alan. **Stripe tabanlı ödeme akışımızı (bu oturumda kurulan iskelet) iOS uygulamasına native olarak bağlamadan önce, başvuru anındaki güncel Apple App Store İnceleme Kuralları'nın "Ödemeler" bölümünü mutlaka tekrar kontrol etmemiz gerekiyor** — burada yanlış bir varsayımla ilerlemek başvurunun reddine ya da hesabın askıya alınmasına yol açabilir.

## 4. Her iki mağaza için ortak ön koşullar

Aşağıdakilerin çoğu bu oturumda tamamlandı:

- Gizlilik Politikası → `gizlilik.html` (hazır, yayında bir URL'ye ihtiyaç var)
- Kullanım Şartları → `sartlar.html` (hazır)
- Destek sayfası/e-postası → `yardim.html` hazır, destek e-postası (`one.global.universal.1@gmail.com`) tanımlandı — mağaza başvurularında istenen destek URL'si olarak `yardim.html` kullanılabilir
- Uygulama ikonları → bu oturumda ONE Global'ın marka renkleriyle (camgöbeği/mor) yenilendi, maskable/any varyantlar dahil
- Mağaza için ayrıca gerekecekler (henüz yok): gerçek cihaz ekran görüntüleri (Play Store ve App Store farklı boyutlar ister), kısa/uzun mağaza açıklama metinleri, yaş derecelendirmesi anketi (her iki mağazada da doldurulan bir form; ONE Global'ın kendisi bir hedef kitle sınırı koymuyor ama yapay zeka sohbeti içerdiği için bu formda dürüstçe belirtilmeli), bir "destek URL'si" (yardim.html buna hizmet edebilir).

## 5. Önerilen sıralama

1. Önce mevcut PWA'yı gerçek kullanıcılarla test etmeye devam et (şu an bulunduğumuz aşama) — özellikle bildirimler, sohbet hafızası ve ödeme iskeletinin gerçek kullanımda nasıl davrandığını görmek için.
2. Destek e-postasını netleştir (gizlilik.html, sartlar.html, yardim.html'deki yer tutucuyu doldurmak için tek bir karar yeterli).
3. PWABuilder ile Android (Play Store) paketini oluştur — 25 dolarlık tek seferlik ücret ve 12 test kullanıcısı/14 gün şartıyla en ucuz, en hızlı giriş noktası budur.
4. Play Store sürecinde geçirilen 2 haftalık test süresini, Apple Developer Program'a kaydolup ($99/yıl) iOS sarmalama/inceleme hazırlığı yapmak için paralel kullan.
5. Her iki mağazaya da başvurmadan hemen önce, o günkü güncel ödeme/inceleme kurallarını (özellikle Apple'ın dış ödeme bağlantısı politikası ve Google'ın geliştirici doğrulama takvimi) tek tek teyit et — bu belge bir başlangıç noktasıdır, mağaza kuralları sık değişiyor.

## Kaynaklar

- [Apple Developer Program cost — genel bakış (2026)](https://appbuilder24.com/blog/apple-developer-account-needed)
- [Google Play — bireysel hesaplar için test gereksinimleri (resmi destek sayfası)](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- [Android Geliştirici Doğrulaması — resmi açıklama](https://support.google.com/android-developer-console/answer/16561738?hl=en)
- [Apple'ın ABD mağazasında harici ödeme bağlantılarına izin vermesi (TechCrunch, 2025)](https://techcrunch.com/2025/05/02/apple-changes-us-app-store-rules-to-let-apps-redirect-users-to-their-own-websites-for-payments)
- [PWA'yı App Store/Play Store'a taşıma — genel değerlendirme (2026)](https://www.mobiloud.com/blog/publishing-pwa-app-store)
