//
//  Extensions.swift
//  biosensesignal_flutter_sdk
//
//  Created on 26/03/2023.
//

import Foundation

extension VitalSign {
    
    func toMap() -> [String: Any?]? {
        var confidence: VitalSignConfidence?
        var value: Any
        
        if let vitalSign = self as? VitalSignPulseRate {
            value = vitalSign.value
            confidence = vitalSign.confidence
        }
        else if let vitalSign = self as? VitalSignRespirationRate {
            value = vitalSign.value
            confidence = vitalSign.confidence
        }
        else if let vitalSign = self as? VitalSignSDNN {
            value = vitalSign.value
            confidence = vitalSign.confidence
        }
        else if let vitalSign = self as? VitalSignPRQ {
            value = vitalSign.value
            confidence = vitalSign.confidence
        }
        else if let vitalSign = self as? VitalSignMeanRRI {
            value = vitalSign.value
            confidence = vitalSign.confidence
        }
        else if let vitalSign = self as? VitalSignRRI {
            value = vitalSign.value.isEmpty ? [] : vitalSign.value.map { value in
                [
                    "interval": value.interval,
                    "timestamp": value.timestamp
                ]
            }
            confidence = vitalSign.confidence
        }
        else if let vitalSign = self as? VitalSignBloodPressure {
            value = [
                "systolic": vitalSign.value.systolic,
                "diastolic": vitalSign.value.diastolic
            ]
        }
        else if let vitalSign = self as? VitalSignStressLevel {
            value = vitalSign.value.rawValue
        }
        else if let vitalSign = self as? VitalSignPNSZone {
            value = vitalSign.value.rawValue
        }
        else if let vitalSign = self as? VitalSignSNSZone {
            value = vitalSign.value.rawValue
        }
        else if let vitalSign = self as? VitalSignWellnessLevel {
            value = vitalSign.value.rawValue
        }
        else if let vitalSign = self as? VitalSignHighHemoglobinA1CRisk {
            value = vitalSign.value.rawValue
        }
        else if let vitalSign = self as? VitalSignHighBloodPressureRisk {
            value = vitalSign.value.rawValue
        }
        else if let vitalSign = self as? VitalSignHighFastingGlucoseRisk {
            value = vitalSign.value.rawValue
        }
        else if let vitalSign = self as? VitalSignHighTotalCholesterolRisk {
            value = vitalSign.value.rawValue
        }
        else if let vitalSign = self as? VitalSignLowHemoglobinRisk {
            value = vitalSign.value.rawValue
        }
        else if let vitalSign = self as? VitalSignASCVDRiskLevel {
            value = vitalSign.value.rawValue
        }
        else if let vitalSign = self as? VitalSignInt {
            value = vitalSign.value
        }
        else if let vitalSign = self as? VitalSignDouble {
            value = vitalSign.value
        }
        else {
            return nil
        }
        
        var map = [
            "type": self.type,
            "value": value,
        ]
        
        if (confidence != nil) {
            map["confidence"] = [
                "level": confidence?.level.rawValue
            ]
        }
        
        return map
    }
}

extension CGRect {
    func toMap() -> [String: Int] {
        return [
            "left": Int.init(self.origin.x),
            "top": Int.init(self.origin.y),
            "width": Int.init(width),
            "height": Int.init(height)
        ]
    }
}

extension ImageData {
    func toMap() -> [String: Any?] {
        return [
            "width": Int.init(image.size.width),
            "height": Int.init(image.size.height),
            "roi": roi.isNull ? nil : roi.toMap(),
            "validity": imageValidity
        ]
    }
}

extension LicenseInfo {
    
    func toMap() -> [String: Any] {
        var map: [String: Any] = [
            "activation_id": licenseActivationInfo.activationID
        ]
        
        if let offlineMeasurements = licenseOfflineMeasurements {
            map["offline_measurements_total"] = offlineMeasurements.totalMeasurements
            map["offline_measurements_remaining"] = offlineMeasurements.remainingMeasurements
            map["offline_measurements_end_timestamp"] = offlineMeasurements.measurementEndTimestamp
        }
        
        return map
    }
}

extension SessionEnabledVitalSigns {
    
    func toMap() -> [String: Any] {
        return [
            "device_enabled": deviceEnabled.enabledVitalSigns,
            "measurement_mode_enabled": measurementModeEnabled.enabledVitalSigns,
            "license_enabled": licenseEnabled.enabledVitalSigns
        ]
    }
}

extension AlertData {
    
    func toMap() -> [String: Any] {
        return [
            "domain": AlertDomains.toFlutterCase(domain: domain),
            "code": code
        ]
    }
}

extension PPGDevice {
    func toMap() -> [String: Any] {
        return [
            "deviceId": deviceID,
            "deviceType": type.rawValue
        ]
    }
}

extension PPGDeviceInfo {
    func toMap() -> [String: Any] {
        return [
            "deviceType": type.rawValue,
            "deviceId": deviceID,
            "version": version
        ]
    }
}

extension FallDetectionData {
    func toMap() -> [String: Any] {
        return [
            "time": Int(time.timeIntervalSince1970 * 1000)
        ]
    }
}

extension AlertDomains {
    static func toFlutterCase(domain: String) -> String {
        switch (domain) {
            case AlertDomains.device:
                return "DEVICE"
            case AlertDomains.camera:
                return "CAMERA"
            case AlertDomains.license:
                return "LICENSE"
            case AlertDomains.measurement:
                return "MEASUREMENT"
            case AlertDomains.vitalSigns:
                return "VITAL_SIGNS"
            case AlertDomains.recorder:
                return "RECORDER"
            case AlertDomains.session:
                return "SESSION"
            case AlertDomains.initialization:
                return "INITIALIZATION"
            case AlertDomains.ppgDevice:
                return "PPG_DEVICE"
            case AlertDomains.monitoring:
                return "MONITORING"
            default:
                return "INTERNAL"
                
        }
    }
}

extension LogsInfo {
    func toMap() -> [String: Any] {
        return [
            "measurementDuration": measurementDuration,
            "logsPath": logsPath
        ]
    }
}