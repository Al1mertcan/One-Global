# Hemcan — Kasım 2026 yeni özellikler (notlar)

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
- **Günlük haber hazırlığı:** her sabah ~09:33'te (10:00'a hazır) yeni 4 haberle güncellenmiş iyi-haberler.json sohbete gelir; sen GitHub'a yüklersin.
- **Spor / kitap bildirimleri:** günlük / aylık / yıllık toplamlar.
- **Hemcan sekmesi (`hemcan.html`):** "Hemcan ailesi" (üye sayacı, hedefler) ve "Hemcan ne demek?" yalnızca burada; ana sayfadan kaldırıldı.
- **Düzeltmeler:** hatırlatmalar artık silinmiyor (zamanı geçenler "Gönderildi" olur, yedeği tutulur); üye sayacı kaydı beklenip doğrulanıyor, kaydı hiç ulaşmamış cihazlar uygulama açılınca bir kez daha deniyor; sunucu sayacı üye listesinden kendini düzeltiyor (5 dk'da bir), hız sınırı hata verirse kayıt engellenmiyor, sayaç önbelleğe alınmıyor. Sunucu düzeltmesi için GitHub'a yükleme şart.
- Açılış ekranı 6 sn → 3 sn.

## Yayın öncesi yapılacaklar
1. GitHub'a yükle (GitHub Desktop). Site otomatik yayına girer.
2. Codemagic: Android için `android-release`, iOS için `ios-3` etiketi.
3. **Google Play → Uygulama içeriği:** "Fiziksel aktivite" iznini (ACTIVITY_RECOGNITION) kullandığını belirt; veri cihazda kalır. Veri güvenliği formunda değişiklik gerekmez (veri toplanmıyor/paylaşılmıyor).
4. **App Store Connect:** Hareket ve Fitness (NSMotionUsageDescription) metni Info.plist'te hazır; App Privacy'de değişiklik gerekmez (veri cihazda kalır).

## Bilinen sınırlar (dürüst not)
- Adım sayar, widget ve alarm **gerçek telefonda denenmedi**; ilk testi sende olacak.
- Android widget'ı ve 10 bin adım tebrigi, uygulama kapalıyken widget yenilendiğinde (~30 dk) veya uygulama açılınca çalışır. Widget eklenmemişse tebrik uygulamayı açınca gelir.
- iPhone'da widget yok (ayrı bir Apple eklentisi gerekir); iPhone'da adım uygulama açılınca okunur.
- Günün sözü bildirimleri önceden planlanır: Android 14 gün, iPhone 7 gün; uygulama bu süre içinde açılmazsa durur.
- Alarm bildirimi dakikalarca kayabilir (pil tasarrufu); gerçek çalar saat yerine geçmez.
- Yeni metinler yalnızca Türkçe ve İngilizce; diğer 19 dilde İngilizce görünür.
- Üye sayacı canlı sitede sandbox'tan denenemedi: yayından sonra sayıyı gerçekte uygulamayı açan kişi sayısıyla karşılaştır.
