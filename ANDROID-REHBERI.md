# Hemcan — Android (Google Play) yerel uygulama rehberi

*Hazırlanma: Kasım 2026. Codemagic ve Play Console ekranları zamanla değişebilir; bir adım burada yazdığım gibi görünmüyorsa adın amacını takip et ve bana yaz.*

## Ne değişiyor?

Şu an Google Play'deki Hemcan, Chrome'un içinde açılan bir "TWA"dır. Bu pakette aynı uygulama, iPhone'dakine benzer **yerel bir kabuğa** (Capacitor) taşınıyor:

| Konu | Eski (TWA, Chrome'a bağlı) | Yeni (yerel kabuk) |
|---|---|---|
| Açılış | Chrome başlar, sonra site yüklenir | Koyu açılış ekranı + simge, ekranlar telefonun içinden açılır |
| İnternetsiz | Açılmayabilir | Ekranlar, simgeler, yazı tipleri uygulamanın içinde; haberler ve üye sayacı için internet gerekir |
| Bildirimler | Web push (Chrome ve sunucuya bağlı) | Telefonun kendi yerel bildirimleri: günlük rutin, su, hatırlatmalarım internetsiz de gelir; açılışta ve telefon yeniden başlayınca yeniden kurulur |
| Veriler | Chrome'un site deposunda (Chrome verisi silinirse gider) | Uygulamanın kendi deposunda |
| "Bugünün iyi haberleri" bildirimi | Var (sunucudan) | Yok (iPhone'daki gibi); haberler uygulama içinde görünür |
| Hemcan Plan (10 TL) sayfası | Var | Gizli (ödeme altyapısı yok) |

Paket kimliği (`app.netlify.cheery_rolypoly_540555.twa`) ve imza anahtarı **aynı** kaldığı için bu, Play'deki mevcut uygulamanın **güncellemesi** olarak yüklenir.

> **Önemli:** Eski sürümdeki cüzdan ve su kayıtları yeni uygulamaya **taşınmaz** (veriler Chrome'un deposundaydı). Güncellemeden önce Cüzdan → dışa aktar (CSV) ile yedek al. Test kullanıcılarına da bunu söyle.

## Adım adım

### 1. Dosyaları GitHub'a yükle (sen)

Verdiğim zip'i ayıkla ve içindekileri `One-Global` deposuna yükle (daha önce yaptığın gibi). `native/android/` klasörü ve `codemagic.yaml` yeni.

### 2. Codemagic'e imza anahtarını yükle (sen)

1. https://codemagic.io → GitHub ile giriş yap, `One-Global` deposunu ekle (iPhone için yaptıysan bu zaten hazırdır).
2. **Teams → Personal Account → Code signing identities → Android keystores → Upload keystore**.
3. Dosya: PWABuilder'ın verdiği **`signing.keystore`** (zip'ten ayıkladığın).
4. **Reference name:** tam olarak `hemcan-upload`
5. Şifreler ve alias: `signing-key-info.txt` dosyasından kopyala-yapıştır (**keystore password**, **key alias**, **key password**). Bunları kimseye, bana da yazma.

> Bu `signing.keystore` Play'e daha önce yüklediğin anahtardır. **Başka bir anahtar kullanırsan Play güncellemeyi reddeder.** Dosyanın bir yedeğini güvenli bir yerde sakla.

### 3. Derlemeyi başlat (sen)

GitHub'da **Releases → Draft a new release** ile `android-1` adında bir etiket (tag) oluştur. Codemagic derlemeyi kendisi başlatır (Codemagic'ten elle de başlatabilirsin: `android-release` iş akışı). Süre yaklaşık 10 dakika. Başarılı olursa **Artifacts** bölümünde `app-release.aab` görünür, indir.

> Derleme numarası otomatik artar; Play'e giden sürüm kodu `100 + derleme numarası` olur (şu an Play'de 2). Yeni derleme için `android-2`, `android-3`… etiketi oluştur.
> Kişisel Codemagic hesabında ücretsiz dakika kotası vardır; Linux derlemelerinin bu kotaya nasıl sayıldığını Codemagic'in fiyat sayfasından kontrol et. Derleme "kota yetersiz" derse aşağıdaki "Codemagic olmadan" bölümüne bak.

### 4. Play Console'a yükle (sen)

**Test et ve yayınla → Kapalı test → Yeni sürüm oluştur →** `.aab` dosyasını yükle → sürüm adı `1.1.0` otomatik gelir → sürüm notu: "Yerel Android uygulamasına geçildi: daha hızlı açılış ve daha güvenilir bildirimler." → **Kaydet → Sürümü incele → Kapalı test olarak sun.**

Google bu paketi **bildirim izinleri** (POST_NOTIFICATIONS, cihaz yeniden başlayınca bildirimleri kurmak için RECEIVE_BOOT_COMPLETED) ile görecek. Tam zamanlı alarm izni **istenmiyor** (Play bunu yalnızca alarm/takvim uygulamalarına tanır); bu yüzden bildirimler dakikalar içinde kayabilir.

### 5. Telefonda dene (sen)

- [ ] Play Store'dan güncelle (ya da kaldırıp yeniden yükle); ana ekranda ad **Hemcan**, simge doğru.
- [ ] Açılış: koyu açılış ekranı, beyaz çakma yok.
- [ ] Uçak modunda aç: ekranlar ve simgeler düzgün.
- [ ] Ekranın üstü/altı: durum çubuğu ve gezinme çubuğuyla çakışma yok, alt sekme çubuğu tam görünüyor.
- [ ] Ayarlar → bildirimlere izin ver: Android 13+ telefonda izin penceresi çıkıyor.
- [ ] Rutin saatlerini 3-5 dakika sonrasına ayarla: bildirim geliyor, durum çubuğunda küçük Hemcan simgesi var.
- [ ] Su bildirimini aşağı çek: bardak/500 ml/1 lt düğmeleri çıkıyor; basınca su kaydı artıyor.
- [ ] Hatırlatmalarım: 2-3 dakika sonrasına bir hatırlatma ekle; geliyor.
- [ ] Telefonu yeniden başlat; bir sonraki rutin bildirimi yine geliyor.
- [ ] Geri tuşu: önceki ekrana dönüyor; ana ekranda uygulamadan çıkıyor.
- [ ] Cüzdan: kayıt ekle, uygulamayı kapat-aç: kayıtlar duruyor.
- [ ] İyi haberler kartları sağa-sola kayıyor, haberi açınca uygulama içi tarayıcı açılıyor.
- [ ] Hemcan Plan satırı **görünmüyor**.

Bazı telefonlarda (Xiaomi, Oppo, Samsung gibi) pil tasarrufu uygulamayı kısıtlar ve bildirimler gecikir: Ayarlar → Uygulamalar → Hemcan → Pil → "Kısıtlama yok". Bunu test kullanıcılarına da söylemek iyi olur.

## Codemagic olmadan (yedek yol)

Bilgisayarında **Android Studio** kurulu ise: `native` klasöründe `npm ci`, `node scripts/sync-web.js`, `npx cap sync android` çalıştır; Android Studio'da `native/android` klasörünü aç → **Build → Generate Signed App Bundle** → `signing.keystore` ile imzala. Aynı `.aab` çıkar.

## Mağaza sayfasıyla ilgili not

Play mağaza metninde "Hemcan Plan: 1 hafta ücretsiz, sonra ayda 10 TL" yazıyor, ama bu sürümde plan sayfası gizli ve ödeme yok. İncelemeci metinle uygulamayı karşılaştırır; ödeme çalışana kadar bu cümleyi çıkarman ya da ödeme hazır olunca tekrar eklemen en güvenlisi. Dijital abonelik için Play'in kendi faturalandırması (Google Play Faturalandırma) gerekebilir; Stripe yalnızca web için serbesttir.

## Dosyalar ne işe yarar (teknik özet)

- `native/android/`: Android Studio / Gradle projesi (simge, açılış ekranı, izinler, tema).
- `native/android/app/build.gradle`: paket kimliği, sürüm adı `1.1.0`, sürüm kodu `100 + derleme numarası`, Codemagic'ten gelen imza bilgilerini kullanır.
- `native.js`: Android'de bildirim kanalı oluşturur ve hatırlatmaları kesin alarm istemeden planlar.
- `codemagic.yaml`: `android-release` iş akışı (`android-*` etiketiyle tetiklenir).
