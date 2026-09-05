package net.resline.przystan;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import net.resline.przystan.clock.SpeakingClockPlugin;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SpeakingClockPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
