# Hemcan — ölçekleme ve maliyet notları

## Bildirim gönderici (send-notifications.js)
- Her 5 dakikada bir çalışır; aboneler 25'erli paralel işlenir, 22 sn süre bütçesi vardır; yetişemezse kaldığı yerden (imleçten) bir sonraki çalıştırmada devam eder. Bildirim pencereleri 15 dk olduğu için kısa gecikme bildirimi kaçırmaz.
- Test (sahte 30 ms gecikme, herkes aynı anda bildirim alacak en kötü durum): 3.000 abone ≈ 11 sn, 10.000 abone ≈ 2 çalıştırma. Gerçekte kişilerin bildirim zamanları dağınık olduğu için çok daha rahattır.
- Sınır: her çalıştırma tüm aboneleri okur (günde ~288 kez). Yaklaşık 20-30 bin bildirim abonesinden sonra bunun yerine gerçek bir veritabanı (ör. Upstash Redis / Supabase) ve "bir sonraki bildirim zamanı" dizini gerekir.

## Üye sayacı (member-count.js)
- 16 parçalı sayaç: eşzamanlı kayıtlarda çakışma olmaz (300 eşzamanlı kayıt testi geçti). Toplam 20 sn önbelleklenir.
- Üye listesiyle eşitleme (reconcile) en fazla 6 saatte bir ve yalnızca 20.000 üyeye kadar yapılır.
- `MEMBER_COUNT_MODE=accounts` ile doğrulanmış e-posta hesabı sayısı gösterilir (bkz. HESAP-SISTEMI.md).

## Elle yapılacaklar (kullanıcı hesabı gerekir)
1. **Anthropic harcama limiti:** console.anthropic.com → Settings → Limits → aylık harcama limiti belirle (fotoğraflı kalori için). Fotoğraf kilidi (`PHOTO_KCAL_PAYWALL`) kapalıyken herkes ayda 100 fotoğraf kullanabilir.
2. **Resend:** giriş kodu e-postaları için plan limitini kontrol et; hesap girişi açılınca kayıt sayısına göre ücretli plana geç.
3. **Netlify:** Site settings → Usage ile fonksiyon/Blobs kullanımını izle; bütçe uyarısı kur.
4. **Bot koruması:** Cloudflare Turnstile (ücretsiz) site anahtarı alınırsa sayaç/giriş uçlarına eklenebilir.
5. **Ödeme:** Pro'yu açmadan önce Android'de Google Play Faturalandırma, iPhone'da Apple uygulama içi satın alma gerekir (Stripe uygulama içi abonelik için mağaza kurallarına uymaz).
