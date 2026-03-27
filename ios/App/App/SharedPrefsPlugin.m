#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(SharedPrefsPlugin, "SharedPrefs",
    CAP_PLUGIN_METHOD(set, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(get, CAPPluginReturnPromise);
)
