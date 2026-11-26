# Hemcan — Android bildirimleri sunucudan gönder (Firebase) kurulum rehberi

**Ne işe yarıyor?** Bazı telefon markaları (Xiaomi, Huawei, Oppo, Vivo, Samsung güç tasarrufu…) uygulamanın telefonda planladığı bildirimleri siliyor. Bu kurulumdan sonra Android'de rutin, günün sözü ve hatırlatma bildirimleri **sunucudan, Google'ın bildirim servisi üzerinden** gönderilir; telefon uyurken ve uygulama kapalıyken de ulaşır. Firebase bildirim servisi **ücretsizdir**.

**Güvenlik kuralı:** Aşağıdaki "hizmet hesabı" dosyası bir şifre gibidir. Kimseye gönderme, sohbete yapıştırma, GitHub'a yükleme. Yalnızca Netlify'ın ayar sayfasına kendin yapıştıracaksın.

> Kurulum yapılmazsa hiçbir şey bozulmaz: uygulama eskisi gibi telefondaki yerel bildirimleri kullanır. Kurulum bittiğinde otomatik olarak sunucu bildirimine geçer.

## 1. Firebase projesi oluştur
1. https://console.firebase.google.com adresine Google hesabınla gir → **Proje ekle** (Add project).
2. Ad: `Hemcan`. **Google Analytics'i kapat** (gerekmiyor) → **Proje oluştur**.

## 2. Android uygulamasını ekle ve `google-services.json` indir
1. Projenin ana sayfasında **Android simgesine** (Android uygulaması ekle) tıkla.
2. **Android paket adı:** tam olarak şunu yaz: `app.netlify.cheery_rolypoly_540555.twa`
   (Play Console'daki uygulamanın paket adı budur; farklı yazılırsa bildirim gelmez.)
3. Takma ad: `Hemcan`. SHA-1 alanı boş kalabilir. **Uygulamayı kaydet**.
4. **google-services.json** dosyasını indir. Sonraki adımları (Gradle vb.) atla; onları ben hazırladım → **Konsola devam et**.
5. Bu dosyayı GitHub'da depoya yükle: `native/android/app/` klasörünü aç → **Add file → Upload files** → `google-services.json` → **Commit changes**.
   (Bu dosya gizli değildir; yüklemekte sakınca yok. Netlify "AIza..." anahtarını sır sanıp derlemeyi durdurabilir; `netlify.toml` içindeki `SECRETS_SCAN_OMIT_PATHS` satırı bunu engeller.)

## 3. Sunucu anahtarını oluştur ve Netlify'a ekle
1. Firebase → sol üstte dişli → **Proje ayarları** → **Hizmet hesapları** (Service accounts) sekmesi → **Yeni özel anahtar oluştur** (Generate new private key) → **Anahtar oluştur**. Bir `.json` dosyası iner.
2. Aynı sayfada **Cloud Messaging** sekmesine bak: "Firebase Cloud Messaging API (V1)" **Etkin** olmalı. Değilse üç nokta → *Google Cloud Console'da yönet* → **Etkinleştir**.
3. Netlify → Hemcan sitesi → **Site configuration → Environment variables → Add a variable**:
   - Key: `FIREBASE_SERVICE_ACCOUNT`
   - Value: indirdiğin `.json` dosyasını Not Defteri ile aç, **tüm içeriği** (`{` ile başlayıp `}` ile biten) kopyalayıp yapıştır.
   - Scopes: Functions dahil hepsi seçili kalsın → **Create variable**.
4. Netlify → **Deploys → Trigger deploy → Deploy site** (ayarın geçerli olması için).
5. İndirdiğin `.json` dosyasını sil; bir yerde saklama.

## 4. Yeni sürümü derle
1. Bu paketi GitHub'a yükle (site otomatik yayına girer).
2. GitHub → Releases → yeni etiket (ör. `android-3`) → Codemagic `android-release` derlemesi başlar → `.aab` dosyasını Play Console'da **Kapalı test (Alpha)** sürümüne yükle.

## 5. Denemek için
1. Telefonda yeni sürümü aç → **Ayarlar → bildirimleri aç** (izin ver).
2. **Otomasyonlar**'dan 10 dakika sonrasına bir hatırlatma ekle.
3. Uygulamayı **tamamen kapat** (son uygulamalardan kaydırarak at). Bildirim gelmeli. Sunucu her 5 dakikada bir kontrol ettiği için en fazla ~5 dakika gecikebilir.
4. Gelmezse: Netlify → **Logs → Functions → send-notifications** sayfasında hata var mı bak; `FIREBASE_SERVICE_ACCOUNT` doğru yapıştırıldı mı ve paket adı birebir aynı mı kontrol et.

## 6. Google Play'de yapılacak
- **Uygulama içeriği → Veri güvenliği:** "Cihaz veya diğer kimlikler"i **toplanıyor** olarak işaretle (amaç: uygulama işlevselliği — bildirim; şifrelenmiş aktarım; silme isteği mümkün). Gizlilik politikası güncellendi (yeni "Android uygulaması" bölümü); siteyle birlikte yayına girer.

## Bilinen sınırlar
- Sunucu bildirimleri en fazla ~5 dakika gecikebilir (kontrol aralığı).
- Sunucudan gelen bildirimlerde **su düğmeleri** (250 ml / 500 ml / 1 L) yoktur; bildirime basınca uygulama açılır.
- Güne karşılama bildirimi sunucudan geldiğinde **ad içermez** ("Günaydın ☀️"): adın yalnızca telefonda durur, sunucuya gönderilmez (gizlilik kararı).
- 10.000 adım tebriği telefonda kalır (yerel).
- Bu yöntem pil kısıtlayan markalarda çok daha güvenilirdir; ancak "uygulamayı zorla durdur" yapılmış telefonlarda hiçbir yöntem çalışmaz.
- iPhone değişmedi (yerel bildirimler).
