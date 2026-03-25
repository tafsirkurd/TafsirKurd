#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>
#import "App-Swift.h"

CAP_PLUGIN(TafsirAppleSignIn, "TafsirAppleSignIn",
    CAP_PLUGIN_METHOD(authorize, CAPPluginReturnPromise);
)
