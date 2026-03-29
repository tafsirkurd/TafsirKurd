import Foundation
import Capacitor
import AuthenticationServices

@objc(TafsirAppleSignIn)
public class TafsirAppleSignIn: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TafsirAppleSignIn"
    public let jsName = "TafsirAppleSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise)
    ]

    private var pendingCall: CAPPluginCall?
    // Strong reference — prevents controller being deallocated before delegate fires
    private var authController: ASAuthorizationController?

    @objc func authorize(_ call: CAPPluginCall) {
        pendingCall = call
        call.keepAlive = true

        let provider = ASAuthorizationAppleIDProvider()
        let request = provider.createRequest()
        request.requestedScopes = [.fullName, .email]
        if let nonce = call.getString("nonce") {
            request.nonce = nonce
        }

        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        authController = controller // retain until delegate resolves

        // Must run on main thread; slight delay ensures WebView modal is fully settled
        // before ASAuthorizationController tries to find the presentation window.
        // This is the primary fix for error 1000 caused by timing/transition races.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak self] in
            guard let self = self, self.pendingCall != nil else { return }
            print("[TafsirAppleSignIn] performRequests() starting")
            self.authController?.performRequests()
        }
    }
}

extension TafsirAppleSignIn: ASAuthorizationControllerDelegate {
    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        defer { authController = nil }
        guard let call = pendingCall,
              let cred = authorization.credential as? ASAuthorizationAppleIDCredential else { return }
        let tok = cred.identityToken.flatMap { String(data: $0, encoding: .utf8) }
        let code = cred.authorizationCode.flatMap { String(data: $0, encoding: .utf8) }
        print("[TafsirAppleSignIn] Success — token present: \(tok != nil), user: \(cred.user)")
        call.resolve([
            "identityToken": tok as Any,
            "authorizationCode": code as Any,
            "user": cred.user as Any,
            "email": cred.email as Any,
            "givenName": cred.fullName?.givenName as Any,
            "familyName": cred.fullName?.familyName as Any
        ])
        pendingCall = nil
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        defer { authController = nil }
        guard let call = pendingCall else { return }
        let code = (error as? ASAuthorizationError)?.code.rawValue ?? -1
        print("[TafsirAppleSignIn] Error — code: \(code), message: \(error.localizedDescription)")
        // Pass numeric code so JS can detect cancel (1001) and presentation errors (1000)
        // without relying on locale-specific error strings
        call.reject(error.localizedDescription, nil, nil, ["errorCode": code])
        pendingCall = nil
    }
}

extension TafsirAppleSignIn: ASAuthorizationControllerPresentationContextProviding {
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        let scenes = UIApplication.shared.connectedScenes

        // 1. Foreground-active scene with a key window (ideal path)
        if let windowScene = scenes.first(where: {
            ($0 as? UIWindowScene)?.activationState == .foregroundActive
        }) as? UIWindowScene {
            if let keyWindow = windowScene.windows.first(where: { $0.isKeyWindow }) {
                return keyWindow
            }
            // Key window not set yet — take any visible window from the active scene
            if let anyVisible = windowScene.windows.first(where: { !$0.isHidden }) {
                return anyVisible
            }
            if let anyWindow = windowScene.windows.first {
                return anyWindow
            }
        }

        // 2. Any window scene with a visible window (handles edge cases during transitions)
        for scene in scenes {
            guard let windowScene = scene as? UIWindowScene else { continue }
            if let window = windowScene.windows.first(where: { $0.isKeyWindow })
                           ?? windowScene.windows.first(where: { !$0.isHidden })
                           ?? windowScene.windows.first {
                return window
            }
        }

        // 3. Legacy path — UIApplication.shared.keyWindow (deprecated iOS 13+, but safe fallback)
        if let legacyWindow = UIApplication.shared.delegate?.window ?? nil {
            return legacyWindow
        }

        // 4. Absolute last resort: find any non-hidden window across the app
        //    Never return UIWindow() — an orphaned window causes error 1000.
        let allWindows = scenes.compactMap { $0 as? UIWindowScene }.flatMap { $0.windows }
        if let fallback = allWindows.first(where: { !$0.isHidden }) ?? allWindows.first {
            return fallback
        }

        // Should be unreachable on a running app; log if we ever hit this
        print("[TafsirAppleSignIn] WARNING: no valid window found for presentation anchor")
        return allWindows.first ?? UIWindow()
    }
}
