import Flutter
import UIKit

public class SwiftBiosenseSignalFlutterSdkPlugin: NSObject, FlutterPlugin {
    
    static let methodChannelId = "plugins.biosensesignal.com/flutter_plugin"
    
    public static func register(with registrar: FlutterPluginRegistrar) {
        let binaryMessenger = registrar.messenger()
        let methodChannel = FlutterMethodChannel(name: methodChannelId, binaryMessenger: binaryMessenger)
        let instance = SwiftBiosenseSignalFlutterSdkPlugin(binaryMessenger: binaryMessenger)
        registrar.addMethodCallDelegate(instance, channel: methodChannel)
        registrar.register(BiosenseSignalPreviewFactory.shared, withId: BiosenseSignalPreviewFactory.cameraPreviewId)
    }
    
    init(binaryMessenger: FlutterBinaryMessenger) {
        if SessionManager.shared.eventChannel == nil {
            SessionManager.shared.eventChannel = BiosenseSignalEventChannel(messenger: binaryMessenger)
        }
        
        BiosenseSignalPreviewFactory.shared.setDataSource(imageDataSource: SessionManager.shared)
    }
    
    public func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        let arguments = call.arguments as? Dictionary<String, Any>
        do {
            switch (call.method) {
                case NativeBridgeApi.createSession:
                    try SessionManager.shared.createSession(
                        licenseKey: (arguments?["licenseKey"] as! String),
                        productId: arguments?["productId"] as? String,
                        deviceOrientation: arguments?["deviceOrientation"] as? Int,
                        subjectSex: arguments?["subjectSex"] as? Int,
                        subjectAge: arguments?["subjectAge"] as? Double,
                        subjectWeight: arguments?["subjectWeight"] as? Double,
                        subjectHeight: arguments?["subjectHeight"] as? Double,
                        subjectSmokingStatus: arguments?["subjectSmokingStatus"] as? Int,
                        detectionAlwaysOn: arguments?["detectionAlwaysOn"] as? Bool,
                        imageFormatMode: arguments?["imageFormatMode"] as? Int,
                        strictMeasurementGuidance: arguments?["strictMeasurementGuidance"] as? Bool,
                        sdkAnalytics: arguments?["sdkAnalytics"] as? Bool,
                        cameraLocation: arguments?["cameraLocation"] as? Int,
                        logsLevel: arguments?["logsLevel"] as? Int,
                        saveLogsToPublicFolder: arguments?["saveLogsToPublicFolder"] as? Bool,
                        options: arguments?["options"] as? [String: Any]
                    )
                    result(nil)
            case NativeBridgeApi.createPPGDeviceSession:
                try SessionManager.shared.createPPGDeviceSession(
                    licenseKey: (arguments?["licenseKey"] as! String),
                    productId: arguments?["productId"] as? String,
                    deviceId: (arguments?["deviceId"] as! String),
                    deviceType: (arguments?["deviceType"] as! Int),
                    subjectSex: arguments?["subjectSex"] as? Int,
                    subjectAge: arguments?["subjectAge"] as? Double,
                    subjectWeight: arguments?["subjectWeight"] as? Double,
                    subjectHeight: arguments?["subjectHeight"] as? Double,
                    subjectSmokingStatus: arguments?["subjectSmokingStatus"] as? Int,
                    fallDetection: arguments?["fallDetection"] as? Bool ?? false,
                    sdkAnalytics: arguments?["sdkAnalytics"] as? Bool,
                    logsLevel: arguments?["logsLevel"] as? Int,
                    saveLogsToPublicFolder: arguments?["saveLogsToPublicFolder"] as? Bool,
                    options: arguments?["options"] as? [String: Any]
                )
                result(nil)
                case NativeBridgeApi.startSession:
                    try SessionManager.shared.startSession(duration: arguments?["duration"] as? Int)
                    result(nil)
                case NativeBridgeApi.stopSession:
                    try SessionManager.shared.stopSession()
                    result(nil)
                case NativeBridgeApi.terminateSession:
                    SessionManager.shared.terminateSession()
                    result(nil)
                case NativeBridgeApi.getSessionState:
                    result(SessionManager.shared.getSessionState()?.rawValue)
                case NativeBridgeApi.getNativeSdkVersion:
                    result([
                        "version": Bundle.main.infoDictionary?["CFBundleShortVersionString"] ?? "",
                        "build": Bundle.main.infoDictionary?["CFBundleVersion"] ?? ""
                    ])
            case NativeBridgeApi.getPolarMinVersion:
                result(PolarSessionBuilder.polarMinVersion)
            case NativeBridgeApi.startPPGDevicesScan:
                try SessionManager.shared.startPPGDevicesScan(
                    scannerId: (arguments?["scannerId"] as! String),
                    deviceType: (arguments?["deviceType"] as! Int),
                    timeout: (arguments?["timeout"] as? Int))
                result(nil)
            case NativeBridgeApi.stopPPGDeviceScan:
                SessionManager.shared.stopPPGDevicesScan(
                    scannerId: (arguments?["scannerId"] as! String)
                )
                result(nil)
                default:
                    return
                    
            }
        }
        catch {
            result(FlutterError(
                code: (error as NSError).code.description,
                message: AlertDomains.toFlutterCase(domain: (error as NSError).domain.description),
                details: nil))
        }
    }
}
