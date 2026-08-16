# ONE Global

Dünyanın her yerinde, ayda sadece 1 birim (yerel para biriminin 1 birimi)
ile kullanılabilecek kişisel yapay zeka asistanı — FireVibe'da tasarlanan
"Nexora" projesinin temelleri üzerine inşa edildi. Gerçek sayfa-arası
gezinme, kurulabilir bir PWA (Progressive Web App) yapısı, gerçek bir Claude
yapay zeka sohbet motoru, 21 dilde arayüz, 139 para birimli bir plan
ekranı, gerçek push bildirimleriyle çalışan bir günlük rutin/hatırlatma
sistemi, ana ekranda her gün tazelenen "dünyadan iyi haberler" bölümü,
ücretsiz denemeli bir karşılama ekranı ve ana ekranda gerçek zamanlı bir
üye sayacı + 1 milyon üyede aktifleşecek %90 bağış hedefi içerir.

## İçerik

- `hosgeldin.html` — Karşılama/onboarding ekranı: "İlk 1 hafta ücretsiz"
  mesajı ve "Ücretsiz Başla" düğmesi; ilk kez gelen herkesin gördüğü ekran
- `asistan.html` — Ana ekran (yapay zeka sohbeti burada)
- `otomasyonlar.html` — Gerçek günlük rutin bildirimlerinin listesi (dürüst
  sürüm — bkz. "Otomasyonlar, Bellek, Cihazlar: dürüstlük denetimi")
- `bellek.html` — Gerçek, kalıcı sohbet geçmişi (dürüst sürüm)
- `cihazlar.html` — "Henüz yok" diyen dürüst bir bilgi ekranı (dürüst sürüm)
- `abonelik.html` — ONE Global Plan: "ayda sadece 1 birim" fiyatlandırma ekranı +
  gerçek Stripe ödeme akışına bağlı "Abone ol" düğmesi (bkz. "Gerçek ödeme
  altyapısı — Stripe")
- `ayarlar.html` — Bildirimler & Rutin, Hesabın (e-posta ile giriş/senkron),
  Verilerin (indir/sil) bölümleri
- `gizlilik.html`, `sartlar.html`, `yardim.html` — Gizlilik Politikası,
  Kullanım Şartları, Yardım/SSS sayfaları
- `i18n.js` — 21 dilli metin katmanı (tercih tarayıcıda saklanır)
- `currencies.js` — 139 para birimi + tarayıcı diline göre otomatik tahmin
- `netlify/functions/chat.js` — Sohbet kutusunu Claude API'sine bağlar; artık
  kalıcı sohbet geçmişi de tutuyor (GET/POST/DELETE, bkz. "Bellek")
- `netlify/functions/subscribe.js`, `unsubscribe.js` — bildirim aboneliği
  kaydı (Netlify Blobs)
- `netlify/functions/send-notifications.js` — zamanlanmış fonksiyon, her 15
  dakikada bir çalışıp sırası gelen bildirimleri gönderir
- `netlify/functions/good-news.js` — ana ekrandaki "Bugünün iyi haberleri"
  bölümünü besler; Claude'un web arama aracıyla günde bir kez (dil başına)
  gerçek, güncel iyi haberler toplar ve önbelleğe alır
- `netlify/functions/member-count.js` — ana ekrandaki gerçek üye sayacını
  besler; her yeni "Ücretsiz Başla" tıklamasını bir kez sayar, bot/sahte-
  kayıt korumalı (bkz. "Üye sayacı — bot koruması")
- `netlify/functions/create-checkout-session.js`, `stripe-webhook.js` —
  gerçek ödeme altyapısı iskeleti (bkz. "Gerçek ödeme altyapısı — Stripe")
- `netlify/functions/auth-request.js`, `auth-verify.js` — e-posta ile giriş
  / cihazlar arası senkron iskeleti (bkz. "E-posta ile giriş ve cihazlar
  arası senkron")
- `manifest.json`, `service-worker.js`, `icons/` — PWA + push bildirim
  desteği; ikonlar ONE Global'ın kendi marka renkleriyle (camgöbeği/mor) yenilendi
- `index.html` — Kök adrese girildiğinde, daha önce onboarding'i tamamlamış
  mı diye bakıp `hosgeldin.html` veya `asistan.html`'e yönlendirir
- `LICENSE.md` — Telif hakkı/mülkiyet notu (bkz. "Fikri mülkiyet ve koruma")
- `app-store-yol-haritasi.md` — App Store / Play Store'a çıkış için adım
  adım, güncel (2026) bir yol haritası

**Kaldırılanlar:** `canl-kontrol.html`, `otomasyon-detay.html`, `onay.html`
— bunlar FireVibe şablonundan kalma, hiçbir gerçek işlevi olmayan tamamen
sahte demo ekranlarıydı (uzaktan cihaz kontrolü gibi ONE Global'ın yapmadığı
şeyleri yapıyormuş gibi gösteriyorlardı) ve artık hiçbir yerden
bağlanmadıkları için dosyalar tamamen silindi.

## Kurulum — 2 parça, ikisi de Netlify ortam değişkeni gerektirir

Güvenlik nedeniyle hiçbir anahtar bu pakete gömülmez; ikisini de Netlify'ın
"Site configuration → Environment variables" sayfasından kendin eklemen
gerekiyor.

### 1) Gerçek yapay zeka sohbeti

1. https://console.anthropic.com/settings/keys adresinden bir API anahtarı al.
2. Netlify'da değişken ekle: İsim `ANTHROPIC_API_KEY`, Değer: aldığın anahtar.

### 2) Push bildirimleri (Bildirimler & Rutin ekranı)

Senin için bir VAPID anahtar çifti ürettim (push bildirimlerinin kimlik
doğrulaması için gerekli, herhangi bir hesaba bağlı değil, sadece bu
uygulamaya özel). Netlify'da şu iki değişkeni ekle:

```
VAPID_PUBLIC_KEY=BA7Bk293hs0UT0ttbxRiH608XSYkoWeMAJM_HYTzWou3B1l-b2XMCzq-dXIwuHc88HDmmwaGcXUSnlqutBHhKKQ
VAPID_PRIVATE_KEY=mxbVCBj6FWHd4dHS-70rBl5HorvnbrSD1trkut7KoOM
```

(Genel/public anahtar zaten `ayarlar.html` içine gömülü — sadece özel/private
anahtarı Netlify'a eklemen yeterli, ama ikisini birden eklemek daha güvenli
ve tutarlı.) Bu anahtarları başka bir yerle paylaşma; sızarsa yeni bir çift
üretip her ikisini de (Netlify + `ayarlar.html` içindeki `VAPID_PUBLIC_KEY`
sabiti) güncellemen yeterli.

Her iki değişkeni de ekledikten sonra siteyi yeniden deploy et (bu klasörü
tekrar sürükle-bırak).

### 3) Gerçek ödeme (isteğe bağlı — hazır olduğunda ekle)

`abonelik.html`'deki "Abone ol" düğmesi artık gerçek bir Stripe Checkout
akışına bağlı, ama bu iki ortam değişkenini eklemeden hiçbir şey
bozulmaz — düğme mevcut dürüst "tasarım önizlemesi" notunu göstermeye
devam eder. Hazır olduğunda:

1. https://dashboard.stripe.com adresinden bir Stripe hesabı aç.
2. Netlify'da değişken ekle: `STRIPE_SECRET_KEY` (Stripe panelindeki gizli
   anahtar, `sk_test_...` ile test edip sonra `sk_live_...`'a geçebilirsin).
3. Webhook'u aktive etmek istersen (abonelik durumunu otomatik takip etmek
   için): Stripe panelinde bir webhook uç noktası ekle
   (`https://<siten>/.netlify/functions/stripe-webhook`), oradan aldığın
   imza anahtarını `STRIPE_WEBHOOK_SECRET` olarak Netlify'a ekle.

Detaylı teknik notlar `netlify/functions/create-checkout-session.js` ve
`stripe-webhook.js` dosyalarının içinde (Türkçe yorum satırları olarak).

### 4) E-posta ile giriş / cihazlar arası senkron (isteğe bağlı)

`ayarlar.html`'deki "Hesabın" bölümü, e-postana tek kullanımlık bir giriş
bağlantısı göndererek verilerini (sohbet geçmişi, rutin ayarların) başka
bir cihazdan da açabilmeni sağlıyor — ama bunun için bir e-posta gönderim
hesabı gerekiyor. Hazır olduğunda:

1. https://resend.com adresinden ücretsiz bir hesap aç (aylık ücretsiz
   kotası var), bir gönderen alan adı doğrula.
2. Netlify'da iki değişken ekle: `RESEND_API_KEY` (Resend panelinden) ve
   `AUTH_FROM_EMAIL` (örn. `ONE Global <giris@senin-alan-adin.com>`).

Bu iki değişken yoksa "Bağlantı gönder" düğmesi dürüstçe "e-posta ile
giriş henüz aktif değil" der — sahte bir "gönderildi" onayı asla vermez.

## Bildirim sistemi nasıl çalışıyor

`ayarlar.html`'de kullanıcı uyanma/eve geliş/yatma saatlerini ve spor/okuma
hedeflerini girip "Bildirimlere izin ver"e bastığında, tarayıcı bir push
aboneliği oluşturur ve bu bilgi `subscribe.js` üzerinden Netlify Blobs'a
kaydedilir. `send-notifications.js` adlı zamanlanmış fonksiyon (netlify.toml
içinde `*/15 * * * *` — her 15 dakikada bir) her abonenin kendi saat
diliminde şu anki saate bakıp sırası gelen bildirimi gönderir:

- uyanma saati → minnettarlık mesajı (hayatta olmaya şükür, sevdiklerinle
  vakit geçirme hatırlatması)
- uyanma + 15 dk → spor (ayarlanabilir şınav/mekik sayısı)
- uyanma + 30 dk → beyin sağlığı ipucu (dönen bir havuzdan — farklı el
  kullanma, farklı yoldan gitme gibi)
- eve geliş saati → günü kapatma / "her şey yolunda mı" kontrolü
- eve geliş + 60 dk → okuma hatırlatması (ayarlanabilir sayfa hedefi)
- yatmadan 60 dk önce → diş fırçalama hatırlatması
- yatmadan 30 dk önce → küçük bir akşam sporu
- yatma saati → günü bırakma / telefonu bırakma nudge'ı

`ayarlar.html` ayrıca uyku döngüsü (~90 dk/döngü + ~15 dk uykuya dalma
süresi) hesabına göre alternatif yatış/kalkış saatleri önerir — bu genel bir
tahmindir, tıbbi tavsiye yerine geçmez.

**Dürüstlük payı — test sınırları:** Bu sistemin sunucu tarafı mantığını
(zaman dilimi hesabı, hangi bildirimin sırası geldiği, Netlify Blobs okuma/
yazma, VAPID anahtar çiftinin matematiksel geçerliliği) elimden geldiğince
doğruladım, ama bu ortamda gerçek bir telefona gerçek bir push bildirimi
ulaştığını **test edemedim** — bunun için gerçek bir cihaz, gerçek bir
deploy ve gerçek internet gerekiyor (bu oturumun kendi ağ erişimi kısıtlı).
Deploy ettikten ve telefonunda bildirimlere izin verdikten sonra ilk gerçek
doğrulama sende olacak. Bir şey ters giderse (bildirim gelmiyor, hata
mesajı vs.) bana durumu anlat, birlikte hata ayıklarız.

**Kapsam notu — bildirim dili:** Bildirim içerikleri şu an sadece Türkçe ve
İngilizce olarak yazıldı (uygulamanın kendi arayüzü 21 dil olsa da). Diğer
diller otomatik olarak İngilizce'ye düşer. Genişletmek istersen aynı desen
(`netlify/functions/send-notifications.js` içindeki `CONTENT`/`BRAIN_TIPS`
nesneleri) diğer dillere de kolayca eklenebilir.

## Ana ekrandaki "Bugünün iyi haberleri"

Asistan ekranının en üstünde, her gün (bugün ve dünden) dünyadan gerçek,
doğrulanabilir iyi haberleri/olumlu gelişmeleri gösteren bir bölüm var —
amaç senin istediğin gibi "bu zor dünya hayatında yüzleri güldürmek ve iyi
hissettirmek". Ayrı bir haber API'sine kaydolmana gerek yok: bu özellik,
sohbet için zaten kurduğun aynı `ANTHROPIC_API_KEY`'i kullanıyor. Claude'un
kendi web arama aracıyla gerçek zamanlı arama yapıp 5 haber seçiyor ve
kullanıcının seçtiği dilde kısa, sıcak bir özet olarak sunuyor.

**Nasıl çalışıyor:** `netlify/functions/good-news.js`, `/api/good-news?lang=xx`
adresine gelen her istekte önce Netlify Blobs'taki önbelleğe bakıyor (o
gün + o dil için daha önce üretilmiş mi, 20 saatten eski değil mi). Varsa
direkt onu döndürüyor, yoksa Claude'a arama yaptırıp sonucu önbelleğe
yazıyor. Yani kaç kullanıcı açarsa açsın, dil başına günde sadece **1 kez**
gerçek arama yapılıyor — ne kullanıcı sayısı ne de sayfa yenileme sayısı
maliyeti artırmıyor.

**Maliyet notu:** Web arama aracı kullanım başına küçük bir ücrete tabi
(bu yazının yazıldığı tarihte yaklaşık 1000 aramada 10 dolar — güncel
fiyat için Anthropic'in fiyatlandırma sayfasına bakabilirsin). Günlük
önbellekleme sayesinde pratikte bu, desteklenen 21 dil için günde en fazla
21 arama demek (yani ayda birkaç dolar seviyesinde, kullanıcı sayısı
milyonlarca da olsa değişmiyor).

**Dürüstlük payı — test sınırları:** Fonksiyonun istek/cevap mantığını
(önbellekten okuma, önbellek süresi dolunca yeniden üretme, dil koduna
göre önbellek anahtarı ayırma, Claude'un cevabındaki JSON'u ayrıştırma,
markdown kod bloğu içine sarılmış JSON'u da yakalayabilme, hatalı/bozuk
JSON veya API hatası durumunda düzgün hata mesajı dönme) taklit/mock
modüllerle test ettim ve hepsi beklendiği gibi çalıştı. Asistan
ekranındaki gösterim tarafını da (haberler geldiğinde kartların doğru
oluşması, hata durumunda uyarı mesajının görünmesi) tarayıcı testiyle
doğruladım. Ama bu ortamda çalışan bir `ANTHROPIC_API_KEY` olmadığı için
Claude'un **gerçek** web aramasının kalitesini/gerçek cevap formatını
(gerçek haberleri bulup bulamayacağını, her zaman temiz JSON döndürüp
döndürmeyeceğini) bu sandbox'tan doğrulayamadım — bunun ilk gerçek testi,
deploy ettikten sonra sende olacak. Nadiren de olsa Claude beklenmedik bir
formatta cevap verirse (ör. JSON'un içine fazladan metin sıkıştırırsa) o
gün için hata mesajı görünür, ertesi gün önbellek yenilendiğinde normale
döner; bir şey ters giderse bana söyle, birlikte bakarız.

## Karşılama ekranı ve "ilk 1 hafta ücretsiz"

Uygulamayı ilk kez açan herkes önce `hosgeldin.html`'i görüyor: "Şu anki ve
gelecekteki seni düşünen, iyi hissettirecek tek uygulama" başlığı, "İlk 1
hafta ücretsiz" rozeti ve "Ücretsiz Başla" düğmesi. Bastığında kişi doğrudan
ana ekrana giriyor; bir daha aynı cihazda bu ekranı görmüyor (tercihi
tarayıcıda hatırlanıyor). `abonelik.html` (ONE Global Plan) ekranında da aynı
"ilk hafta ücretsiz" mesajı tutarlılık için tekrar ediliyor.

**Neden 1 gün değil, 1 hafta önerdim:** Bana sorduğunda iki seçenek
arasında kaldın — ilk gün ücretsiz mi, ilk hafta mı. Ben 1 haftayı önerdim
ve öyle kodladım, sebebi şu: ONE Global'ın asıl değeri günlük bir döngüde ortaya
çıkıyor (sabah minnettarlık bildirimi, spor, akşam kontrolü, okuma,
diş fırçalama hatırlatması gibi) — 1 günde bu döngünün sadece küçük bir
parçası yaşanır, kişi tam resmi göremeden karar vermiş olur. Ayrıca "1
hafta ücretsiz" pazarda çok daha tanıdık ve güven verici bir standarttır
(çoğu abonelik uygulaması bunu kullanır), "1 gün" ise fiyatı çok
ucuzlatıyormuş hissi yerine tersine güvensizlik ("neden bu kadar kısa?")
uyandırabilir. İstersen bunu tek satırlık bir değişiklikle 1 güne
çevirebilirim — `i18n.js` içindeki `onboardTrial`/`planTrialBadge`/
`planTrialLine` anahtarlarını (21 dilin hepsinde) güncellemem yeterli.

**Dürüstlük payı:** Şu an gerçek bir ödeme/faturalama sistemi olmadığı
için (bkz. "1 birim/ay fiyatlandırma ekranı" bölümü) "deneme süresi"
kavramı henüz teknik olarak zorlanmıyor — yani birisi 1 hafta sonra da
uygulamayı normal şekilde kullanmaya devam edebilir, kimseden otomatik
para çekilmiyor zaten. Bu, gerçek ödeme altyapısı kurulduğunda (Stripe
vb.) birlikte tamamlanması gereken bir sonraki adım.

## Çok dillilik (21 dil)

Sağ üstteki dil seçiciyle Türkçe, İngilizce, İspanyolca, Fransızca, Almanca,
Portekizce, İtalyanca, Rusça, Arapça, Hintçe, Bengalce, Çince, Japonca,
Korece, Endonezce, Vietnamca, Tayca, Urduca, Svahili, Lehçe ve Felemenkçe
arasında geçiş yapılabiliyor. İlk açılışta tarayıcı diline göre otomatik
tahmin ediliyor, sonra tercih hatırlanıyor. Arapça ve Urduca için sayfa
otomatik olarak sağdan sola (RTL) yazılır — bu ilk sürümde sadece metin
yönünü kapsar, ikon/kart düzeninin tam aynalanması ayrı bir iş.

Kapsam notu: gerçekten "tüm diller" (~7000) pratik değil; bu 21 dil dünya
nüfusunun büyük çoğunluğunu kapsıyor. Şu an tam olarak Asistan ve Plan
ekranlarında uygulandı; aynı `data-i18n` deseni diğer ekranlara da (Otomasyonlar,
Bellek, Cihazlar) kolayca genişletilebilir.

## "1 birim/ay" fiyatlandırma ekranı — 139 para birimi

`abonelik.html`, neredeyse her ülkenin resmi para birimini (139 tanesi)
listeleyen bir açılır menü sunuyor; kullanıcının tarayıcı diline göre en
olası para birimi otomatik seçiliyor (VPN veya çok dilli tarayıcı ayarları
yanıltabilir, bu yüzden kullanıcı her zaman elle değiştirebilir).

Bu ekran **gerçek bir ödeme almaz** — bunun için ayrı bir ödeme altyapısı
(Stripe gibi, ülkeye göre yerel ödeme sağlayıcıları) ve her ülkede yasal/
vergisel uyum gerekir. Şu an sadece vizyonu göstermek için tasarlanmıştır.

### Türkiye'ye özel fiyat: 10 TL/ay

Bilinçli bir karar olarak, Türkiye'deki (TRY) kullanıcılar için aylık ücret
1 birim yerine **10 TL** olarak ayarlandı; dünyanın geri kalanı hâlâ "yerel
para biriminin 1 birimi/ay" modelinde kalıyor. Bu istisna, iki dosyada
`PRICE_OVERRIDES` adında bir eşleme olarak tutuluyor ve ikisi de senkron
tutulmalı:

- `currencies.js` → `getPrice(code)` — sadece **istemci tarafında önizleme**
  içindir (abonelik ekranındaki para birimi listesi ve fiyat önizlemesi).
- `netlify/functions/create-checkout-session.js` → `PRICE_OVERRIDES` —
  Stripe'a gönderilen **gerçek tahsilat tutarını** belirleyen taraf budur.

Yeni bir ülkeye özel fiyat eklemek/değiştirmek istersen, her iki dosyadaki
`PRICE_OVERRIDES` nesnesine aynı para birimi kodunu eklemen yeterli — ama
ikisini de güncellemeyi unutma, yoksa kullanıcıya gösterilen önizleme ile
gerçekte tahsil edilen tutar birbirini tutmaz. Türkçe (`tr`) arayüz
metinleri (`i18n.js`, `planPill`/`planHeadline`/`planSub`/`onboardTrial`
anahtarları ve `abonelik.html`/`asistan.html`/`hosgeldin.html`'deki eşleşen
sabit metinler) bu değişiklikle birlikte "her yerde 1 birim" yerine
"Türkiye'de 10 TL, diğer ülkelerde 1 birim" şeklinde güncellendi — diğer 20
dil değişmedi, çünkü onlar için fiyat hâlâ doğru.

## İhtiyaç sahipleriyle paylaşım — canlı üye sayacı ve 1 milyon hedefi

Ana ekranın en tepesinde artık gerçek bir "ONE Global ailesi" sayacı var.
`hosgeldin.html`'de biri "Ücretsiz Başla"ya her bastığında,
`netlify/functions/member-count.js` bu kişiyi bir kez sayıyor (aynı
kişi/cihaz ikinci kez sayılmıyor — tarayıcıda saklanan benzersiz bir
kimlikle kontrol ediliyor). Bu sayı **gerçektir**; rastgele veya sahte
artan bir animasyon değildir — sadece gerçekten "Ücretsiz Başla"ya basan
insanlarla büyür.

1 milyon üyeye ulaşana kadar ana ekranda şu mesaj görünür: "1 milyona
ulaştığımızda, her ay gelirin %90'ı ihtiyaç sahipleriyle paylaşılmaya
başlayacak." 1 milyona ulaşıldığı an mesaj otomatik değişir: "%90 şu an
paylaşılıyor, sıradaki hedef 1 milyar üye." Yani bu senin sözlerinle bire
bir örtüşüyor: "gerçekten bu olduğunda da gerekli herşeyi yapıp devam
ederiz."

**Çok önemli bir netlik notu:** Bu sayaç 1 milyona ulaştığında ekran
metni otomatik değişse de, **gerçek para dağıtımı otomatik başlamıyor** —
bunun için ayrı bir ödeme/bağış altyapısı (hangi kuruluşlara, hangi
yöntemle, hangi ülkelerde yasal olarak nasıl dağıtılacağı) kurulması
gerekiyor. O gün geldiğinde bunu birlikte, gerçek bir plan olarak kuracağız
— tıpkı senin dediğin gibi. Şimdilik bu sayı ve mesaj, vizyonu somut ve
şeffaf şekilde göstermek için var; henüz "%90 otomatik olarak birine
gönderiliyor" anlamına gelmiyor.

**Ölçeklenebilirlik notu (dürüstlük payı):** Sayaç, Netlify Blobs
üzerinde basit bir "oku - 1 artır - yaz" mantığıyla çalışıyor; çok düşük/
orta trafik için tamamen yeterli. Gerçekten aynı anda binlerce kişi tam
olarak aynı anda katılırsa, teorik olarak birkaç kayıt çakışıp
sayılmayabilir (bu bir banka hesabı değil, motivasyonel/şeffaflık amaçlı
bir sayı olduğu için bu risk kabul edilebilir düzeyde). Gerçekten
milyonlarca eşzamanlı kullanıcıya ulaştığımızda (ki bu tam da hedefimiz),
bunu gerçek bir sayaç altyapısına (ör. Redis) taşımamız gerekecek — o
noktaya geldiğimizde bunu da birlikte yapacağız.

## Sohbet uç noktasında hız sınırı (maliyet koruması)

"uygulamamız dünyaya açılmaya hazır mı?" diye sorduğunda fark ettiğim,
gözden kaçmış bir gerçek eksikti: üye sayacına bot koruması eklerken
`chat.js`'e aynı korumayı eklemeyi unutmuşum. Sohbet uç noktasının her
çağrısı gerçek bir Anthropic API ücreti demek — hız sınırı olmadan biri
basit bir script ile bu uç noktayı saniyede onlarca kez çağırıp faturanı
ciddi şekilde şişirebilirdi. Şimdi düzeltildi: aynı IP'den 10 dakikada en
fazla 20 mesaj kabul ediliyor (gerçek bir sohbet temposu için bolca
yeterli). Aynı dürüstlük payı burada da geçerli — %100 sağlam bir bot
koruması değil, kararlı biri çok sayıda IP ile yine aşabilir; gerçek
ölçekte Cloudflare gibi bir katman veya kullanıcı başına aylık mesaj
kotası daha güçlü bir sonraki adım olur.

## Üye sayacı — bot/sahte-kayıt koruması

"sence uygulamada eksik birşey kaldı mı?" diye sorduğunda bulduğum ilk
eksik buydu: üye sayacı hiçbir korumaya sahip değildi, bir kişi basit bir
script ile sayacı istediği kadar şişirebilirdi (özellikle 1 milyon hedefi
düşünülünce bu ciddi bir sorun). Şimdi iki katman koruma var:

1. Kimlik formatı kontrolü — sayaç sadece gerçekten `hosgeldin.html`'in
   ürettiği türden bir kimlikle artırılabiliyor, rastgele bir metinle değil.
2. IP bazlı hız sınırı — aynı IP adresinden saatte en fazla 5 yeni kayıt
   kabul ediliyor.

**Dürüstlük payı:** Bu, basit bir script saldırısını durdurur ama kararlı
biri çok sayıda farklı IP kullanarak (proxy/botnet ile) yine de aşabilir —
%100 sağlam bir bot koruması değil. Gerçek bir captcha/insan doğrulaması
(Cloudflare Turnstile gibi, ücretsiz) çok daha güçlü bir sonraki adım
olur; istersen birlikte kuralım.

## Bellek — gerçek, kalıcı sohbet geçmişi

Eski `bellek.html` FireVibe şablonundan kalma, tamamen uydurma bir
ekrandı: var olmayan bir "Deniz" kullanıcısı hakkında sahte "öğrenilen
bilgiler" ve sahte güven yüzdeleri gösteriyordu. Bunu tamamen kaldırıp
yerine **gerçek** bir şey koydum: `chat.js` artık her konuşmayı (en
fazla son 40 mesaj) Netlify Blobs'ta saklıyor; `bellek.html` bu gerçek
geçmişi gösteriyor ve istersen tek tıkla tamamen silebiliyorsun. Asistan
ekranı da sayfa yenilendiğinde bu geçmişi geri yüklüyor, yani sohbetin
bağlamı kayıp gitmiyor.

## Otomasyonlar, Cihazlar ve ana ekran: dürüstlük denetimi

"eksiksiz devam edelim" dediğinde, Bellek dışında Otomasyonlar ve
Cihazlar sekmelerini de dikkatle inceledim ve ikisinin de (ayrıca ana
ekranın bir kısmının) **tamamen sahte, FireVibe şablonundan kalma demo
içerik** olduğunu buldum — uzaktan bilgisayar/telefon kontrolü, otomatik
e-posta gönderimi, takvim erişimi gibi ONE Global'ın yapmadığı ve yapmayı
planlamadığımız şeyleri yapıyormuş gibi gösteriyorlardı. Bunu olduğu gibi
bırakmak gerçek bir kullanıcıyı yanıltabilirdi, o yüzden:

- **Otomasyonlar** artık gerçek: `ayarlar.html`'de kurduğun bildirim
  rutinini (uyanma/eve geliş/yatma saatlerine göre) gerçek zamanlarıyla
  listeliyor — uydurma bir "Zoom toplantısı özeti" otomasyonu değil.
- **Cihazlar** artık dürüst bir "henüz yok" ekranı: ONE Global'ın şu an gerçekten
  neler yapabildiğini/yapamadığını açıkça anlatıyor.
- **Ana ekranda** da aynı sorun vardı: sahte "3 bağlı cihaz / 248 bellek
  güncellemesi / 12 tamamlandı" istatistikleri, sahte bir "şu an görev
  yapıyor" kartı (uydurma bir takvim kontrolü animasyonu ve artık var
  olmayan bir "Canlı Kontrol" ekranına götüren düğme dahil) ve takvim/
  e-posta erişimi ima eden iki sahte "Hızlı başlangıç" kartı vardı —
  hepsi kaldırıldı, yerine gerçekten yapabildiğin iki şey kondu (sohbete
  başlamak, rutinini ayarlamak). Ayrıca ana ekranda herkese "Günaydın,
  Deniz" diye hitap eden, var olmayan bir kullanıcıya ait sahte bir isim
  vardı (tüm 21 dilde) — bu da kaldırıldı, artık kimsenin adı olmadan
  genel bir selamlama var (ONE Global'da henüz hesap/isim sistemi olmadığı için
  bu daha dürüst).
- Hiçbir yerden bağlanmayan üç sahte "detay" ekranı
  (`canl-kontrol.html`, `otomasyon-detay.html`, `onay.html`) tamamen
  silindi.

## Hesap silme, veri indirme ve yasal sayfalar

`ayarlar.html`'in "Verilerin" bölümünden istediğin zaman tüm verilerini
(sohbet geçmişi, rutin ayarları, üye kaydı, bildirim aboneliği) tek bir
JSON dosyası olarak indirebilir veya kalıcı olarak silebilirsin. Bunun
yanında üç yeni sayfa eklendi: `gizlilik.html` (Gizlilik Politikası),
`sartlar.html` (Kullanım Şartları) ve `yardim.html` (Yardım/SSS). Üçü de
avukat tarafından incelenmemiş taslaklardır — gerçek kullanıcı verisi
toplamaya veya gerçek ödeme almaya başlamadan önce bir hukuk danışmanına
göstermeni öneririm. Destek e-postası olarak `one.global.universal.1@gmail.com`
adresi belirlendi ve üç sayfaya da (Gizlilik Politikası, Kullanım Şartları,
Yardım) işlendi.

## Gerçek ödeme altyapısı — Stripe

"Gerçek ödeme altyapısı için Stripe entegrasyon iskeleti hazırla" görevi
tamamlandı. `abonelik.html`'deki "Abone ol" düğmesi artık gerçek bir
Stripe Checkout oturumu açmaya çalışıyor; "ayda sadece 1 birim" fikri,
seçtiğin para biriminde dinamik olarak "1 birim/ay" fiyatı kurularak ve
ilk hafta gerçekten ücretsiz deneme (`trial_period_days: 7`) tanımlanarak
uygulandı. Sen `STRIPE_SECRET_KEY`'i eklemeden hiçbir şey değişmez —
düğme mevcut dürüst "tasarım önizlemesi" notunu göstermeye devam eder
(bkz. "Kurulum" bölümü, madde 3). Kurulum sonrası açık kalan bir sonraki
adım: abonelik durumunu (`stripe-webhook.js`'in yazdığı) okuyup gerçek bir
"deneme bitti, kilitlendi" davranışı (paywall) eklemek — bu ayrı, birlikte
tasarlanması gereken bir sonraki iş.

## E-posta ile giriş ve cihazlar arası senkron

"E-posta tabanlı gerçek kullanıcı girişi / cihazlar arası senkron ekle"
görevi de bir iskelet olarak tamamlandı (`ayarlar.html`'deki "Hesabın"
bölümü). Şifre yok — kullanıcı e-postasını yazıyor, 15 dakika geçerli
tek kullanımlık bir bağlantı alıyor, tıklayınca o cihazın kimliği hesabın
kalıcı kimliğiyle eşitleniyor. Aynı e-postayla başka bir cihazdan giriş
yapıldığında, o cihaz da aynı hesabın (ilk cihazın) verilerini
görmeye başlıyor — böylece "cihazlar arası senkron" sağlanmış oluyor. Bu
akışın tamamını (token üretimi, tek kullanımlık kontrolü, hız sınırı,
hesap eşleştirme, ikinci cihazın doğru şekilde ilk hesaba bağlanması) bu
oturumda taklit/mock modüllerle uçtan uca test ettim, hepsi beklendiği
gibi çalıştı. `RESEND_API_KEY`/`AUTH_FROM_EMAIL` eklemeden gerçek e-posta
gönderilmez (bkz. "Kurulum" bölümü, madde 4).

## Uygulama ikonları

`icons/` klasöründeki tüm ikonlar (192/512, maskable varyantlar, Apple
touch icon, favicon) ONE Global'ın kendi marka renkleriyle (camgöbeği `#39D7FF`
merkez, mor `#A78BFA` dış hare) yeniden üretildi; maskable ikonlar artık
Android/iOS'un yuvarlak/squircle kırpmasında kesilmeyecek şekilde güvenli
alan içinde tasarlandı.

## App Store / Play Store yol haritası

`app-store-yol-haritasi.md` dosyasında, ONE Global'ı gerçek bir mobil mağaza
uygulaması haline getirmek için adım adım, güncel (Ağustos 2026 itibarıyla
araştırılmış) bir plan var: Apple ($99/yıl) ve Google Play ($25 tek
seferlik) için güncel ücretler, Google'ın yeni "12 test kullanıcısı/14 gün"
kapalı test şartı, 2026'da devreye giren Android Geliştirici Doğrulaması,
Apple'ın değişen harici ödeme bağlantısı kuralları ve PWA'yı native
mağazalara PWABuilder ile sarmalama önerisi dahil. Mağaza kuralları sık
değiştiği için, başvurmadan hemen önce bu belgedeki kaynak linklerinden
güncel durumu tekrar teyit etmen önerilir.

## Fikri mülkiyet ve koruma — "patent almalı mıyım, çalınabilir mi?"

Bu soruyu sordun, dürüst ve net bir cevap hak ediyor. Ben avukat değilim,
bu bir hukuki tavsiye değil — resmi bir adım atmadan önce (özellikle
marka tescili için) bir avukata/marka vekiline danışmanı öneririm. Ama
pratik olarak neyin işe yaradığını, neyin yaramadığını ve şu an ne
yaptığımı sana anlatayım.

**Patent muhtemelen doğru araç değil.** Patentler; somut, teknik, yeni bir
buluşu korur (örneğin yeni bir algoritma, yeni bir donanım mekanizması).
"Her ülkede 1 birim/ay fiyatlandırma" veya "gelirin %90'ını bağışlama"
gibi bir **iş modeli fikri**, çoğu ülkede (Türkiye dahil) patentlenebilir
bir buluş sayılmaz — sadece bir iş yöntemi/fikirdir, kod veya arayüzden
bağımsız olarak korunamaz. Ayrıca patent süreci yıllar sürer, on binlerce
dolar/lira tutabilir ve büyük olasılıkla reddedilir. Yani zaman ve para
harcayıp muhtemelen sonuç alamayacağın bir yol — bunu sana önermem.

**Seni gerçekten koruyan şeyler, düşük maliyetli ve şu an elinde olanlar:**

1. **Telif hakkı (copyright)** — kodun, metinlerin, tasarımın telif hakkı
   sen yazdığın/yazdırdığın andan itibaren zaten otomatik olarak sana ait
   (ayrıca bir tescile gerek yok, ama tarih kanıtı önemli). Bu paketin
   içine bir `LICENSE.md` dosyası ekledim — "Telif Hakkı (c) 2026 Ali
   Mertcan, tüm hakları saklıdır" diyor. Bunu deploy ettiğin repo/pakette
   tut; ne zaman yazıldığına dair bir kanıt niteliği taşır.
2. **Kaynak kodu özel (private) tut** — bu kodu herkese açık bir GitHub
   reposuna koymak yerine, sadece kendi Netlify hesabından deploy et.
   Böylece kod kimseyle paylaşılmamış olur; "sızma" riski en aza iner.
3. **Marka tescili — asıl atman gereken adım.** Uygulama adını ve logosunu
   Türk Patent ve Marka Kurumu'na (ve varsa hedeflediğin diğer ülkelerde)
   tescil ettirmek, patentten çok daha ucuz (binlerce değil, yüzlerce/
   birkaç bin lira seviyesinde) ve çok daha etkili bir koruma. **İsim
   geçmişi:** Uygulama başlangıçta çıplak "ONE" adını kullanıyordu, ama
   bunun çok yaygın/jenerik bir kelime olduğunu ve özellikle finans/
   abonelik alanında (Capital One, Walmart destekli OnePay gibi) yakın
   isimlerin zaten yoğun şekilde kullanıldığını konuştuktan sonra
   **"ONE Global"a geçtik** — hem vizyonunla ("dünyanın her yerinde")
   doğrudan örtüşen, hem de tek başına "ONE"dan daha ayırt edici bir isim.
   Bu, riski sıfırlamaz ("Global" da tek başına sık kullanılan bir kelime)
   ama en keskin çakışma ihtimalini azaltır. Resmi başvurudan önce yine de
   TÜRKPATENT'in ücretsiz "Marka Sorgulama" sistemi veya WIPO'nun Global
   Brand Database'i (branddb.wipo.int) ile bir ön kontrol yapmanı, sonra
   bir marka vekiline göstermeni öneririm.
4. **Şirket/işletme kaydı** — gelirin ve mülkiyetin tamamen sana ait
   olduğunu resmileştirmenin en sağlam yolu, uygulamayı kendi adına
   kayıtlı bir şirket (şahıs şirketi bile olabilir) üzerinden
   yürütmen. Bu hem hukuki koruma hem de Netlify/ödeme sağlayıcılarıyla
   ("gerçek işletme sahibi kimdir" sorusuna netlik) ileride işini
   kolaylaştırır.
5. **Zamanlı kayıt/kanıt** — bu proje boyunca oluşturduğumuz dosyalar ve
   bu konuşma geçmişi, fikrin ve kodun ne zaman ortaya çıktığına dair
   zaten bir kayıt oluşturuyor. İstersen bu paketi kendi e-postana
   göndermek gibi basit bir adım bile ("kendine e-posta ile kanıt")
   tarih kanıtı olarak işe yarar.

**Gerçekçi olalım:** Küçük/orta ölçekli bir uygulamayı büyük şirketlerin
"çalması" pratikte nadir bir risktir — asıl risk, benzer bir fikri
başkalarının bağımsız olarak da düşünmüş/yapmış olmasıdır (özellikle "az
ücretli global abonelik" gibi genel bir fikir). Seni gerçekten koruyan şey
genelde hukuki değil, pratiktir: hızlı hareket etmek, kullanıcı/marka
bağı kurmak ve iyi yürütmek. Yukarıdaki 5 adım (özellikle LICENSE dosyası,
kodu özel tutmak ve marka tescilini bir vekille değerlendirmek) sana
makul, uygun maliyetli bir koruma sağlar.

## Neler eklendi (FireVibe'ın orijinal dışa aktarımına göre)

- Alt sekme çubuğu ve tüm "geri dön" düğmeleri gerçekten çalışıyor.
- **Önemli bir hata bulundu ve düzeltildi:** ilk sürümdeki gezinme kodu bazı
  durumlarda tıklamaları yanlış (sayfayı saran) bir elemente bağlıyordu; bu
  7 ekranın hepsinde düzeltildi ve her senaryo ayrı ayrı test edildi.
- Asistan ekranındaki sohbet kutusu gerçek Claude API'sine bağlandı.
- "ONE Global Plan" (abonelik.html) fiyatlandırma ekranı — 139 para birimi.
- 21 dilli arayüz + otomatik dil/para birimi tahmini.
- "Bildirimler & Rutin" (ayarlar.html) — gerçek push bildirimli günlük
  rutin sistemi (yukarı bakınız).
- Ana ekranda "Bugünün iyi haberleri" — Claude'un web aramasıyla toplanan,
  günlük önbellekli, gerçek dünya haberleri bölümü (yukarı bakınız).
- Karşılama ekranı (`hosgeldin.html`) — "ilk 1 hafta ücretsiz" mesajıyla
  yeni kullanıcıları karşılıyor (yukarı bakınız).
- Ana ekranda gerçek "ONE Global ailesi" üye sayacı ve 1 milyon/1 milyar bağış
  hedefi mesajları, bot/sahte-kayıt koruması (yukarı bakınız).
- `LICENSE.md` ile temel telif hakkı/mülkiyet kaydı eklendi.
- Bellek sekmesi gerçek, kalıcı sohbet geçmişi gösteriyor; Otomasyonlar ve
  Cihazlar sekmeleri ile ana ekranın kendisi artık dürüst (sahte
  cihaz/görev/istatistik içeriği kaldırıldı) — bkz. "Bellek", "Otomasyonlar,
  Cihazlar ve ana ekran: dürüstlük denetimi".
- Hesap silme / veri indirme akışı, Gizlilik Politikası, Kullanım Şartları
  ve Yardım/SSS sayfaları eklendi.
- Gerçek ödeme (Stripe) ve e-posta ile giriş/cihazlar arası senkron için
  çalışan, test edilmiş iskelet altyapılar eklendi (anahtar eklemeden
  hiçbir şey bozulmaz).
- Uygulama ikonları ONE Global'ın marka renkleriyle yenilendi.
- App Store / Play Store'a çıkış için güncel bir yol haritası belgesi
  (`app-store-yol-haritasi.md`) eklendi.

## Telefona kurma / yayınlama

1. app.netlify.com adresinde hesabına gir (zaten bir hesabın var).
2. "Add new site" → "Deploy manually" ile bu klasörü sürükle-bırak (zip'i
   olduğu gibi kullan — `netlify.toml`, `netlify/functions/` içindeki tüm
   dosyalar dahil olmalı).
3. `ANTHROPIC_API_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` ortam
   değişkenlerini eklemeyi unutma (yukarıya bak — bunlar zorunlu). Gerçek
   ödeme ve e-posta ile giriş için gereken `STRIPE_SECRET_KEY`,
   `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `AUTH_FROM_EMAIL` ise
   isteğe bağlıdır; eklemesen de uygulama sorunsuz çalışır.
4. Verilen `....netlify.app` linkini telefonunda aç → tarayıcı "Ana ekrana
   ekle" seçeneğini sunacak (Android/Chrome otomatik bir bant gösterir;
   iOS/Safari'de Paylaş → "Ana Ekrana Ekle" ile — iOS'ta push bildirimlerinin
   çalışması için uygulamanın önce ana ekrana eklenmiş olması gerekir).
5. Ana ekrana ekledikten sonra uygulamayı aç, sağ üstteki zil ikonuna bas,
   rutinini gir ve "Bildirimlere izin ver"e bas.

## Bağımlılıklar (CDN üzerinden yüklenir)

- Tailwind CSS, Iconify (lucide ikon seti), Google Fonts — bu yüzden ilk
  açılışta internet bağlantısı gerekir; sonrasında service worker sayesinde
  çevrimdışı da açılabilir (yapay zeka sohbeti ve bildirimler hariç — onlar
  her zaman internet ister).
