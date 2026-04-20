import Foundation
import CoreLocation
import Capacitor

@objc(CompassPlugin)
public class CompassPlugin: CAPPlugin, CLLocationManagerDelegate {

    private var locationManager: CLLocationManager?
    private var pendingCall: CAPPluginCall?
    private var lastHeading: Double = -1
    private var lastAccuracy: Double = -1
    private var isRunning = false

    @objc func start(_ call: CAPPluginCall) {
        NSLog("[Compass] start() called")

        guard CLLocationManager.headingAvailable() else {
            NSLog("[Compass] headingAvailable() == false")
            call.resolve(["status": "unavailable"])
            return
        }

        if locationManager == nil {
            let lm = CLLocationManager()
            lm.delegate = self
            lm.headingFilter = kCLHeadingFilterNone  // report EVERY change
            lm.desiredAccuracy = kCLLocationAccuracyBest
            locationManager = lm
            NSLog("[Compass] CLLocationManager created")
        }

        let authStatus = locationManager!.authorizationStatus
        NSLog("[Compass] current auth status: %d", authStatus.rawValue)

        if authStatus == .notDetermined {
            pendingCall = call
            locationManager?.requestWhenInUseAuthorization()
            NSLog("[Compass] requesting location authorization")
            return
        }

        beginHeading(call: call)
    }

    private func beginHeading(call: CAPPluginCall) {
        guard let lm = locationManager else {
            NSLog("[Compass] locationManager is nil")
            call.resolve(["status": "unavailable"])
            return
        }

        isRunning = true
        lastHeading = -1
        lastAccuracy = -1

        lm.startUpdatingLocation()
        lm.startUpdatingHeading()
        NSLog("[Compass] started heading + location updates")

        DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak self] in
            self?.locationManager?.stopUpdatingLocation()
        }

        call.resolve(["status": "granted"])
    }

    /// JS can poll this if event listeners don't work
    @objc func getHeading(_ call: CAPPluginCall) {
        call.resolve([
            "heading": lastHeading,
            "accuracy": lastAccuracy
        ])
    }

    @objc func stop(_ call: CAPPluginCall) {
        isRunning = false
        locationManager?.stopUpdatingHeading()
        locationManager?.stopUpdatingLocation()
        NSLog("[Compass] stopped")
        call.resolve()
    }

    public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        NSLog("[Compass] auth changed: %d", status.rawValue)
        if status != .notDetermined, let call = pendingCall {
            pendingCall = nil
            beginHeading(call: call)
        }
    }

    public func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {
        let heading = newHeading.trueHeading >= 0 ? newHeading.trueHeading : newHeading.magneticHeading
        let accuracy = newHeading.headingAccuracy
        lastHeading = heading
        lastAccuracy = accuracy
        notifyListeners("headingUpdate", data: [
            "heading": heading,
            "accuracy": accuracy
        ])
    }

    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        manager.stopUpdatingLocation()
        NSLog("[Compass] GPS fix acquired")
    }

    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        NSLog("[Compass] error: %@", error.localizedDescription)
    }
}
