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
    private var pendingCall: CAPPluginCall?

    @objc func start(_ call: CAPPluginCall) {
        guard CLLocationManager.headingAvailable() else {
            NSLog("[Compass] headingAvailable() == false — device has no compass")
            call.resolve(["status": "unavailable"])
            return
        }

        if locationManager == nil {
            let lm = CLLocationManager()
            lm.delegate = self
            lm.headingFilter = 1.0
            lm.desiredAccuracy = kCLLocationAccuracyBest
            locationManager = lm
            NSLog("[Compass] CLLocationManager created")
        }

        let authStatus = locationManager!.authorizationStatus

        if authStatus == .notDetermined {
            // Store the call and request authorization — will resume in delegate callback
            pendingCall = call
            locationManager?.requestWhenInUseAuthorization()
            NSLog("[Compass] requesting location authorization")
            return
        }

        // Already authorized or denied — start heading immediately
        beginHeading(call: call)
    }

    private func beginHeading(call: CAPPluginCall) {
        guard let lm = locationManager else {
            call.resolve(["status": "unavailable"])
            return
        }

        let authStatus = lm.authorizationStatus
        if authStatus == .denied || authStatus == .restricted {
            NSLog("[Compass] location denied — heading may only provide magneticHeading")
        }

        // Start location updates briefly so trueHeading gets a GPS fix
        lm.startUpdatingLocation()
        lm.startUpdatingHeading()
        NSLog("[Compass] startUpdatingHeading + startUpdatingLocation called")

        // Stop location updates after 5s — we only need a quick GPS fix for trueHeading
        DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak self] in
            self?.locationManager?.stopUpdatingLocation()
            NSLog("[Compass] stopUpdatingLocation — GPS fix window closed")
        }

        call.resolve(["status": "granted"])
    }

    @objc func stop(_ call: CAPPluginCall) {
        locationManager?.stopUpdatingHeading()
        locationManager?.stopUpdatingLocation()
        NSLog("[Compass] stopped")
        call.resolve()
    }

    // CLLocationManagerDelegate — authorization changed
    public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        NSLog("[Compass] authorization changed: %d", status.rawValue)

        if status != .notDetermined, let call = pendingCall {
            pendingCall = nil
            beginHeading(call: call)
        }
    }

    // CLLocationManagerDelegate — heading update
    public func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {
        let heading = newHeading.trueHeading >= 0 ? newHeading.trueHeading : newHeading.magneticHeading
        let accuracy = newHeading.headingAccuracy
        notifyListeners("headingUpdate", data: [
            "heading":  heading,
            "accuracy": accuracy
        ])
    }

    // CLLocationManagerDelegate — location update (needed for trueHeading GPS fix)
    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        // We only need one fix — stop after receiving it
        manager.stopUpdatingLocation()
        NSLog("[Compass] got GPS fix — trueHeading should be available now")
    }

    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        NSLog("[Compass] error: %@", error.localizedDescription)
    }
}
