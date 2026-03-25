#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(TafsirAppleSignIn, "TafsirAppleSignIn",
    CAP_PLUGIN_METHOD(authorize, CAPPluginReturnPromise);
)
