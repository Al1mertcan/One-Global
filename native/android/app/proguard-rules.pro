# Hemcan — R8 / ProGuard kuralları (release derlemesinde minifyEnabled açık).
# Mantık: yansıma (reflection) ile bulunan her şeyi koru; geri kalanı R8 karartsın.
# Capacitor eklentilerinin ve Firebase / AndroidX'in kendi "consumer" kuralları derlemeye otomatik eklenir.

# Hata raporlarında anlamlı satır numaraları + gerekli öznitelikler
-keepattributes SourceFile,LineNumberTable,*Annotation*,Signature,InnerClasses,EnclosingMethod,Exceptions
-renamesourcefileattribute SourceFile

# Uygulamanın kendi kodu (adım sayar eklentisi, widget, depo): küçük ve yansımayla çağrılıyor, olduğu gibi kalsın
-keep class app.hemcan.mobile.** { *; }

# Capacitor çekirdeği ve tüm eklentileri (eklentiler yansımayla yüklenir, JS köprüsü yöntem adlarıyla çağırır)
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * { *; }
-keepclassmembers class * { @com.getcapacitor.PluginMethod <methods>; }
-keep class org.apache.cordova.** { *; }

# WebView'dan çağrılan Java yöntemleri
-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }

# Yalnızca uyarı: kullanılmayan isteğe bağlı sınıflar derlemeyi durdurmasın
-dontwarn org.apache.cordova.**
-dontwarn com.google.android.gms.**
