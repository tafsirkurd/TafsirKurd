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
        guard CLLocationManager.headingAvailable() else {
            call.resolve(["status": "unavailable"])
            return
        }

        DispatchQueue.main.async {
            if self.locationManager == nil {
                let lm = CLLocationManager()
                lm.delegate = self
                lm.headingFilter = 0.5          // notify every 0.5° change
                lm.headingOrientation = .portrait
                self.locationManager = lm
            }

            // Heading (magnetometer) does not require location authorization.
            // trueHeading needs location for declination, but we fall back to
            // magneticHeading in didUpdateHeading, so no permission needed here.
            self.locationManager?.startUpdatingHeading()
            call.resolve(["status": "granted"])
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.locationManager?.stopUpdatingHeading()
            NSLog("[Compass] stopUpdatingHeading called")
        }
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
