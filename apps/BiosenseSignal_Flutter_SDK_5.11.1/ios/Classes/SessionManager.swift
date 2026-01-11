
import Foundation
import Combine

class SessionManager:
        ImageDataSource,
        ImageListener,
        VitalSignsListener,
        SessionInfoListener,
        PPGDeviceInfoListener,
        FallDetectionListener,
        LogsListener {
    
    static let shared = SessionManager()
    
    var eventChannel: BiosenseSignalEventChannel?
    private var session: Session?
    private var ppgScanners = [String: PPGDeviceScanner]()
    
    let images = PassthroughSubject<ImageData, Never>()
    
    private init() {}
    
    func createSession(
        licenseKey: String,
        productId: String? = nil,
        deviceOrientation: Int? = nil,
        subjectSex: Int? = nil,
        subjectAge: Double? = nil,
        subjectWeight: Double? = nil,
        subjectHeight: Double? = nil,
        subjectSmokingStatus: Int? = nil,
        detectionAlwaysOn: Bool? = false,
        imageFormatMode: Int? = nil,
        strictMeasurementGuidance: Bool? = false,
        sdkAnalytics: Bool? = false,
        cameraLocation: Int? = nil,
        logsLevel: Int? = nil,
        saveLogsToPublicFolder: Bool? = false,
        options: [String: Any]? = nil
    
    ) throws {
        var sessionBuilder = FaceSessionBuilder()
        if let userInformation = resolveUserInformation(sex: subjectSex, age: subjectAge, weight: subjectWeight, height: subjectHeight, smokingStatus: subjectSmokingStatus) {
            sessionBuilder = sessionBuilder.withUserInformation(userInformation)
        }
        
        if let orientation = resolveDeviceOrientation(deviceOrientation: deviceOrientation) {
            sessionBuilder = sessionBuilder.withDeviceOrientation(orientation)
        }

        if let cameraLocation = resolveCameraLocation(cameraLocation: cameraLocation) {
            sessionBuilder = sessionBuilder.withCameraLocation(cameraLocation)
        }
        
        if let imageFormat = resolveImageFormat(imageFormatMode: imageFormatMode) {
            sessionBuilder = sessionBuilder.withImageFormatMode(imageFormat)
        }

        if let strictMeasurementGuidance = strictMeasurementGuidance {
            sessionBuilder = sessionBuilder.withStrictMeasurementGuidance(strictMeasurementGuidance)
        }

        if let detectionAlwaysOn = detectionAlwaysOn {
            sessionBuilder = sessionBuilder.withDetectionAlwaysOn(detectionAlwaysOn)
        }
        
        if (sdkAnalytics == true) {
            sessionBuilder = sessionBuilder.withAnalytics() as! FaceSessionBuilder
        }
        
        if let logsLevel = resolveLogsLevel(logsLevel: logsLevel) {
            sessionBuilder = sessionBuilder.withLogs(
                configuration: LogsConfiguration(
                    level: logsLevel,
                    saveToPublicFolder: saveLogsToPublicFolder ?? false
                ), 
                listener: self
            ) as! FaceSessionBuilder
        }
        
        session = try sessionBuilder
            .withImageListener(self)
            .withVitalSignsListener(self)
            .withSessionInfoListener(self)
            .withOptions(options: options ?? [:])
            .build(licenseDetails: LicenseDetails(licenseKey: licenseKey, productId: productId))
    }
    
    func createPPGDeviceSession(
        licenseKey: String,
        productId: String? = nil,
        deviceId: String,
        deviceType: Int,
        subjectSex: Int? = nil,
        subjectAge: Double? = nil,
        subjectWeight: Double? = nil,
        subjectHeight: Double? = nil,
        subjectSmokingStatus: Int? = nil,
        fallDetection: Bool? = false,
        sdkAnalytics: Bool? = false,
        logsLevel: Int? = nil,
        saveLogsToPublicFolder: Bool? = false,
        options: [String: Any]? = nil) throws {
            if (resolveDeviceType(deviceType: deviceType) != PPGDeviceType.polar) {
                throw NSError(domain: AlertDomains.initialization, code: AlertCodes.ppgDeviceUnsupportedDeviceModelError)
            }
            
            var sessionBuilder = PolarSessionBuilder(polarDeviceID: deviceId)
            if let userInformation = resolveUserInformation(sex: subjectSex, age: subjectAge, weight: subjectWeight, height: subjectHeight, smokingStatus: subjectSmokingStatus) {
              sessionBuilder = sessionBuilder.withUserInformation(userInformation)
            } 
            
            if (fallDetection == true) {
                sessionBuilder = sessionBuilder.withFallDetectionListener(self)
            }
            
            if (sdkAnalytics == true) {
                sessionBuilder = sessionBuilder.withAnalytics() as! PolarSessionBuilder
            }
            
            if let logsLevel = resolveLogsLevel(logsLevel: logsLevel) {
                sessionBuilder = sessionBuilder.withLogs(
                    configuration: LogsConfiguration(
                        level: logsLevel,
                        saveToPublicFolder: saveLogsToPublicFolder ?? false
                    ), 
                    listener: self
                ) as! PolarSessionBuilder
            }

            session = try sessionBuilder
                .withVitalSignsListener(self)
                .withSessionInfoListener(self)
                .withPPGDeviceInfoListener(self)
                .withOptions(options: options ?? [:])
                .build(licenseDetails: LicenseDetails(licenseKey: licenseKey, productId: productId))
        }
    
    func startPPGDevicesScan(scannerId: String, deviceType: Int, timeout: Int?) throws {
        if (resolveDeviceType(deviceType: deviceType) != PPGDeviceType.polar) {
            return
        }

        let ppgScanListener = PPGDeviceScannerListenerImpl(eventChannel: eventChannel, scannerId: scannerId)
        let scanner = try PPGDeviceScannerFactory.create(ppgDeviceType: PPGDeviceType.polar, listener: ppgScanListener)
        
        ppgScanners[scannerId] = scanner
        if let timeout = timeout {
            try scanner.start(timeout: UInt(timeout))
        } else {
            try scanner.start()
        }
    }
    
    func stopPPGDevicesScan(scannerId: String) {
        ppgScanners[scannerId]?.stop()
    }
    
    func startSession(duration: Int?) throws {
        try session?.start(measurementDuration: UInt64(duration ?? 0))
    }

    func stopSession() throws {
        try session?.stop()
    }

    func terminateSession() {
        session?.terminate()
    }

    func getSessionState() -> SessionState? {
        return session?.state
    }

    func onImage(imageData: ImageData) {
        images.send(imageData)
        eventChannel?.sendEvent(name: NativeBridgeEvents.imageData , payload: imageData.toMap())
    }
    
    func onVitalSign(vitalSign: VitalSign) {
        if let map = vitalSign.toMap() {
            eventChannel?.sendEvent(name: NativeBridgeEvents.sessionVitalSign , payload: map)
        }
    }
    
    func onFinalResults(results: VitalSignsResults) {
        let finalResults = results.getResults().compactMap { result in
            result.toMap()
        }
        
        eventChannel?.sendEvent(name: NativeBridgeEvents.sessionFinalResults, payload: finalResults)
    }
    
    func onSessionStateChange(sessionState: SessionState) {
        eventChannel?.sendEvent(name: NativeBridgeEvents.sessionStateChange, payload: sessionState.rawValue)
    }
    
    func onWarning(warningData: WarningData) {
        eventChannel?.sendEvent(name: NativeBridgeEvents.sessionWarning, payload: warningData.toMap())
    }
    
    func onError(errorData: ErrorData) {
        eventChannel?.sendEvent(name: NativeBridgeEvents.sessionError, payload: errorData.toMap())
    }
    
    func onLicenseInfo(licenseInfo: LicenseInfo) {
        eventChannel?.sendEvent(name: NativeBridgeEvents.licenseInfo, payload: licenseInfo.toMap())
    }
    
    func onEnabledVitalSigns(enabledVitalSigns: SessionEnabledVitalSigns) {
        eventChannel?.sendEvent(name: NativeBridgeEvents.enabledVitalSigns, payload: enabledVitalSigns.toMap())
    }
    
    func onPPGDeviceBatteryLevel(_ batteryLevel: UInt) {
        eventChannel?.sendEvent(name: NativeBridgeEvents.ppgDeviceBatteryLevel, payload: batteryLevel)
    }
    
    func onPPGDeviceInfo(_ info: BiosenseSignal.PPGDeviceInfo) {
        eventChannel?.sendEvent(name: NativeBridgeEvents.ppgDeviceInfo, payload: info.toMap())
    }
    
    func onFallDetectionData(_ data: FallDetectionData) {
        eventChannel?.sendEvent(name: NativeBridgeEvents.fallDetectionData, payload: data.toMap())
    }

    func onLogsReady(logsInfo: LogsInfo) {
        eventChannel?.sendEvent(name: NativeBridgeEvents.logsReady, payload: logsInfo.toMap())
    }

    private func resolveDeviceOrientation(deviceOrientation: Int?) -> DeviceOrientation? {
        guard let orientation = deviceOrientation, let orientationEnum = DeviceOrientation.init(rawValue: orientation) else {
            return nil
        }
        
        return orientationEnum
    }

    private func resolveUserInformation(sex: Int?, age: Double?, weight: Double?, height: Double?, smokingStatus: Int?) -> UserInformation? {
        if (sex == nil && age == nil && weight == nil && height == nil && smokingStatus == nil) {
            return nil
        }
        
        var builder = UserInformationBuilder()
        builder = builder.setSex(Sex.init(rawValue: sex ?? 0) ?? Sex.unspecified)
        if let age = age {
            builder = builder.setAge(NSNumber.init(value: age))
        }
      
        if let weight = weight {
            builder = builder.setWeight(NSNumber.init(value: weight))
        }
        
        if let height = height {
            builder = builder.setHeight(NSNumber.init(value: height))
        }
        builder = builder.setSmokingStatus(SmokingStatus.init(rawValue: smokingStatus ?? 0) ?? SmokingStatus.unspecified)

        return builder.build()
    }

    private func resolveImageFormat(imageFormatMode: Int?) -> ImageFormatMode? {
        guard let imageFormat = imageFormatMode,
              let imageFormatEnum = ImageFormatMode.init(rawValue: imageFormat) else {
            return nil
        }

        return imageFormatEnum
    }
    
    private func resolveDeviceType(deviceType: Int) -> PPGDeviceType? {
        return PPGDeviceType.init(rawValue: deviceType)
    }
    
    private func resolveCameraLocation(cameraLocation: Int?) -> CameraLocation? {
        guard let cameraLocation = cameraLocation,
              let cameraLocationEnum = CameraLocation.init(rawValue: cameraLocation) else {
            return nil
        }

        return cameraLocationEnum
    }

    private func resolveLogsLevel(logsLevel: Int?) -> LogsLevel? {
        if logsLevel == nil {
            return nil
        }
        
        return LogsLevel.default
    }
}

extension SessionManager {
    
    class PPGDeviceScannerListenerImpl: PPGDeviceScannerListener {
        var eventChannel: BiosenseSignalEventChannel?
        let scannerId: String
        
        
        init(eventChannel: BiosenseSignalEventChannel?, scannerId: String) {
            self.eventChannel = eventChannel
            self.scannerId = scannerId
        }
        
        func onPPGDeviceDiscovered(ppgDevice: PPGDevice) {
            let device = ppgDevice.toMap()
            let result: [String: Any] = [
                "scannerId": scannerId,
                "device": device
            ]
            eventChannel?.sendEvent(name: NativeBridgeEvents.ppgDeviceDiscovered, payload: result)
        }
        
        func onPPGDeviceScanFinished() {
            eventChannel?.sendEvent(name: NativeBridgeEvents.ppgDeviceScanFinished, payload: scannerId)
        }
    }
}
