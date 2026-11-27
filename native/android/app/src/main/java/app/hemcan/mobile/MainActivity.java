package app.hemcan.mobile;

import android.content.pm.ActivityInfo;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(StepsPlugin.class);
        // Telefonlarda uygulama dikey kalır. Manifestte yön kilidi YOK: Android 16'dan itibaren
        // tablet / katlanabilir gibi büyük ekranlar (en küçük genişlik >= 600dp) kilidi yok sayıyor,
        // Google da manifestte kilit olmamasını öneriyor. Büyük ekranlarda uygulama serbestçe döner.
        if (getResources().getConfiguration().smallestScreenWidthDp < 600) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        }
        super.onCreate(savedInstanceState);
    }
}
