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
        controller.performRequests()
    }
}

extension TafsirAppleSignIn: ASAuthorizationControllerDelegate {
    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let call = pendingCall,
              let cred = authorization.credential as? ASAuthorizationAppleIDCredential else { return }
        let tok = cred.identityToken.flatMap { String(data: $0, encoding: .utf8) }
        let code = cred.authorizationCode.flatMap { String(data: $0, encoding: .utf8) }
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
        guard let call = pendingCall else { return }
        call.reject(error.localizedDescription)
        pendingCall = nil
    }
}
