# Hemcan hesap sistemi (adım 1: e-posta kodu ile giriş)

Parola yok. Kullanıcı e-postasını yazar, 6 haneli kod gelir, kodu girince hesap açılır ve **1 haftalık deneme sunucuda başlar** (uygulamayı silip yüklemek denemeyi sıfırlamaz).

## Şu an etkin mi?
Hayır — bilerek kapalı. `native.js` içinde `AUTH_REQUIRED = false`. Mevcut test kullanıcıları ve Play'deki sürüm aynen çalışır. Kapıyı, aşağıdaki kurulum bitince ve ödeme ekranı da hazır olunca `true` yaparız. `giris.html` kapalıyken de elle açılıp denenebilir.

## Netlify ortam değişkenleri (Site settings → Environment variables)
| Değişken | Ne | Not |
|---|---|---|
| `AUTH_SECRET` | En az 32 karakter rastgele metin | Oturumları imzalar. Kimseyle paylaşma, değiştirirsen herkes çıkış yapar. |
| `RESEND_API_KEY` | resend.com API anahtarı | |
| `AUTH_FROM_EMAIL` | `Hemcan <giris@alanadin.com>` | Alan adı Resend'de doğrulanmış olmalı (Gmail adresiyle gönderilemez). |
| `REVIEW_EMAIL`, `REVIEW_CODE` | (isteğe bağlı) mağaza incelemecisi için sabit demo hesabı | Mağaza yorumcusuna "Uygulama inceleme notları" bölümünde verilir. |

Eksik olan değişkende uç noktalar `501 not_configured` döner; kimseyi kilitlemez.

## Uç noktalar
- `POST /api/otp-request` `{email, lang}` → kodu e-postayla yollar (IP başına 20 / e-posta başına 4 istek, 10 dk).
- `POST /api/otp-verify` `{email, code}` → `{token, user}`; kod 10 dk geçerli, 5 yanlış denemede iptal, tek kullanımlık.
- `GET /api/session-me` (Bearer) → oturum + erişim durumu (deneme / abonelik / süresi bitti).
- `POST /api/account-delete` (Bearer) → hesabı ve sunucudaki verisini siler.

Depolama: `one-users` (e-posta HMAC özetiyle anahtarlanır, düz e-posta anahtar olmaz), `one-auth-codes` (yalnızca kod özeti), `one-auth-ratelimit`.

## Sıradaki adımlar
2. Ayarlar'a "Çıkış yap" + "Hesabımı sil" düğmesi (uç nokta ve `ONE_NATIVE.deleteAccount()` hazır), gizlilik/KVKK ve mağaza metinleri.
3. Ödeme ekranı + abonelik kilidi (RevenueCat, Play Billing / App Store IAP, Restore Purchases).
4. Testler, sonra Google + Apple ile giriş birlikte.


## Üye sayacı ve hesap sayısı
- `member-count` iki sayaç tutar (parçalı, çakışmasız): **cihaz** sayacı (onboarding'de "Ücretsiz Başla") ve **hesap** sayacı (`otp-verify` her yeni doğrulanmış e-posta hesabında bir kez artırır; mağaza inceleme hesabı sayılmaz).
- Hangisinin gösterileceği Netlify ortam değişkeniyle seçilir: `MEMBER_COUNT_MODE=accounts` → hesap sayısı (aynı kişi birden çok cihazda/yeniden kurulumda tek sayılır; sahte sayı için gerçek bir e-posta kutusu gerekir). Değişken yoksa cihaz sayacı kullanılır.
- Geçiş: önce e-posta girişini aç (`AUTH_REQUIRED = true`, Resend alan adı doğrulaması, inceleme hesabı), sonra `MEMBER_COUNT_MODE=accounts` ekle. Sayı hesaplardan sıfırdan başlar; istenirse eski cihaz toplamı elle bir taban değer olarak eklenebilir.
