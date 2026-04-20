import Foundation
import CoreLocation
import Capacitor

/**
 CompassPlugin
 Streams CLLocationManager heading updates to JavaScript.
 Use instead of webkitCompassHeading — that property is unreliable in WKWebView.

 JS usage:
   const result = await Capacitor.Plugins.Compass.start();
   // result.status: "granted" | "denied" | "unavailable"
   Capacitor.Plugins.Compass.addListener('headingUpdate', (data) => {
     // data.heading  — true north heading (0–360, clockwise)
     // data.accuracy — degrees of accuracy (-1 = uncalibrated)
   });
   Capacitor.Plugins.Compass.stop();
*/
@objc(CompassPlugin)
public class CompassPlugin: CAPPlugin, CLLocationManagerDelegate {

    private var locationManager: CLLocationManager?

    @objc func start(_ call: CAPPluginCall) {
        // Capacitor 8 calls plugin methods on the main thread — no dispatch needed.
        guard CLLocationManager.headingAvailable() else {
            NSLog("[Compass] headingAvailable() == false — device has no compass")
            call.resolve(["status": "unavailable"])
            return
        }

        if locationManager == nil {
            let lm = CLLocationManager()
            lm.delegate = self
            lm.headingFilter = 1.0  // notify on every 1° change
            locationManager = lm
            NSLog("[Compass] CLLocationManager created")
        }

        locationManager?.startUpdatingHeading()
        NSLog("[Compass] startUpdatingHeading called")
        call.resolve(["status": "granted"])
    }

    @objc func stop(_ call: CAPPluginCall) {
        locationManager?.stopUpdatingHeading()
        NSLog("[Compass] stopUpdatingHeading called")
        call.resolve()
    }

    // CLLocationManagerDelegate — heading update
    public func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {
        // trueHeading requires a GPS fix; falls back to magneticHeading when unavailable (-1)
        let heading = newHeading.trueHeading >= 0 ? newHeading.trueHeading : newHeading.magneticHeading
        let accuracy = newHeading.headingAccuracy
        notifyListeners("headingUpdate", data: [
            "heading":  heading,
            "accuracy": accuracy
        ])
    }

    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        NSLog("[Compass] error: %@", error.localizedDescription)
    }
}
