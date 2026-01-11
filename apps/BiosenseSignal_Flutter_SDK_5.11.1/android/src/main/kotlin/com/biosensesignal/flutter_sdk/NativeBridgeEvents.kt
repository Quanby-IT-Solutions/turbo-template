package com.biosensesignal.flutter_sdk

class NativeBridgeEvents {

    companion object {
        const val imageData = "image_data"
        const val sessionStateChange = "session_state_change"
        const val sessionWarning = "session_warning"
        const val sessionError = "session_error"
        const val sessionVitalSign = "session_vital_sign"
        const val sessionFinalResults = "session_final_results"
        const val enabledVitalSigns = "enabled_vital_signs"
        const val licenseInfo = "license_info"
        const val ppgDeviceDiscovered = "ppg_device_discovered"
        const val ppgDeviceScanFinished = "ppg_device_scan_finished"
        const val ppgDeviceInfo = "ppg_device_info"
        const val ppgDeviceBattery = "ppg_device_battery_level"
        const val fallDetectionData = "fall_detection_data"
        const val logsReady = "logs_ready"
    }
}