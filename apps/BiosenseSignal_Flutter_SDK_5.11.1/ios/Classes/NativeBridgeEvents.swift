//
//  NativeBridgeEvents.swift
//  biosensesignal_flutter_sdk
//
//  Created on 26/03/2023.
//

import Foundation

class NativeBridgeEvents {
    static let imageData = "image_data"
    static let sessionStateChange = "session_state_change"
    static let sessionWarning = "session_warning"
    static let sessionError = "session_error"
    static let sessionVitalSign = "session_vital_sign"
    static let sessionFinalResults = "session_final_results"
    static let enabledVitalSigns = "enabled_vital_signs"
    static let licenseInfo = "license_info"
    static let ppgDeviceDiscovered = "ppg_device_discovered"
    static let ppgDeviceScanFinished = "ppg_device_scan_finished"
    static let ppgDeviceInfo = "ppg_device_info"
    static let ppgDeviceBatteryLevel = "ppg_device_battery_level"
    static let fallDetectionData = "fall_detection_data"
    static let logsReady = "logs_ready"
}
