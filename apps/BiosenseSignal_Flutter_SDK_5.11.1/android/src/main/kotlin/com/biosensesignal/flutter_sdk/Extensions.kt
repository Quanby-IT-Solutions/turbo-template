package com.biosensesignal.flutter_sdk

import com.biosensesignal.sdk.api.SessionEnabledVitalSigns
import com.biosensesignal.sdk.api.images.ImageData
import com.biosensesignal.sdk.api.license.LicenseInfo
import com.biosensesignal.sdk.api.alerts.AlertData
import com.biosensesignal.sdk.api.ppg_device_scanner.PPGDevice
import com.biosensesignal.sdk.api.ppg_device_scanner.PPGDeviceInfo
import com.biosensesignal.sdk.api.vital_signs.VitalSign
import com.biosensesignal.sdk.api.vital_signs.VitalSignConfidence
import com.biosensesignal.sdk.api.vital_signs.vitals.*
import android.graphics.Bitmap
import android.graphics.Rect
import android.view.TextureView
import com.biosensesignal.sdk.api.fall_detection.FallDetectionData
import com.biosensesignal.sdk.api.logs.LogsInfo

fun TextureView.drawBitmap(bitmap: Bitmap) {
    lockCanvas()?.apply {
        drawBitmap(
            bitmap,
            null,
            Rect(0, 0, width, bottom - top),
            null
        )
        unlockCanvasAndPost(this)
    }
}


fun Rect.toMap(): Map<String, Int> {
    return mapOf(
        Pair("left", this.left),
        Pair("top", this.top),
        Pair("width", this.width()),
        Pair("height", this.height())
    )
}

fun ImageData.toMap(): Map<String, Any?> {
    return mapOf(
        Pair("width", image.width),
        Pair("height", image.height),
        Pair("roi", roi?.toMap()),
        Pair("validity", imageValidity)
    )
}

fun AlertData.toMap(): Map<String, Any> {
    return mapOf(
        Pair("domain", domain),
        Pair("code", code)
    )
}

fun LicenseInfo.toMap(): Map<String, Any> {
    val map = mutableMapOf<String, Any>(
        Pair("activation_id", licenseActivationInfo.activationID)
    )
    licenseOfflineMeasurements?.let { offlineMeasurements ->
        map["offline_measurements_total"] = offlineMeasurements.totalMeasurements
        map["offline_measurements_remaining"] = offlineMeasurements.remainingMeasurements
        map["offline_measurements_end_timestamp"] = offlineMeasurements.measurementEndTimestamp
    }

    return map
}

fun SessionEnabledVitalSigns.toMap(): Map<String, Long> {
    return mapOf(
        Pair("device_enabled", deviceEnabledVitalSigns.enabledVitalsSigns),
        Pair("measurement_mode_enabled", measurementModeEnabledVitalSigns.enabledVitalsSigns),
        Pair("license_enabled", licenseEnabledVitalSigns.enabledVitalsSigns)
    )
}

fun FallDetectionData.toMap(): Map<String, Any> {
    return mapOf(
        Pair("time", time.time)
    )
}

fun VitalSign.toMap(): Map<String, Any>? {
    var confidence: VitalSignConfidence? = null
    val resolvedValue = when (this) {
        is VitalSignPulseRate -> {
            confidence = this.confidence
            value
        }
        is VitalSignRespirationRate -> {
            confidence = this.confidence
            value
        }
        is VitalSignPRQ -> {
            confidence = this.confidence
            value
        }
        is VitalSignMeanRRI -> {
            confidence = this.confidence
            value
        }
        is VitalSignSDNN -> {
            confidence = this.confidence
            value
        }
        is VitalSignRRI -> {
            confidence = this.confidence
            if (value.isEmpty()) null else value.map { rriValue ->
                mapOf(
                    Pair("interval", rriValue.interval),
                    Pair("timestamp", rriValue.timestamp)
                )
            }
        }
        is VitalSignStressLevel -> value.ordinal
        is VitalSignPNSZone -> value.ordinal
        is VitalSignSNSZone -> value.ordinal
        is VitalSignWellnessLevel -> value.ordinal
        is VitalSignBloodPressure -> mapOf(
            Pair("systolic", value.systolic),
            Pair("diastolic", value.diastolic)
        )
        is VitalSignHighHemoglobinA1CRisk -> value.ordinal
        is VitalSignHighBloodPressureRisk -> value.ordinal
        is VitalSignHighFastingGlucoseRisk -> value.ordinal
        is VitalSignHighTotalCholesterolRisk -> value.ordinal
        is VitalSignLowHemoglobinRisk -> value.ordinal
        is VitalSignASCVDRiskLevel -> value.ordinal
        else -> value
    }

    return mutableMapOf(
        Pair("type", type),
        Pair("value", resolvedValue ?: return null)
    ).apply {
        if (confidence != null) {
            put("confidence", mapOf(Pair("level", confidence.level.ordinal)))
        }
    }
}

fun PPGDevice.toMap(): Map<String, Any> {
    return mapOf(
        Pair("deviceId", deviceID),
        Pair("deviceType", type.ordinal)
    )
}

fun PPGDeviceInfo.toMap(): Map<String, Any> {
    return mapOf(
        Pair("deviceId", deviceID),
        Pair("deviceType", type.ordinal),
        Pair("version", version)

    )
}

fun LogsInfo.toMap(): Map<String, Any> {
    return mapOf(
        Pair("measurementDuration", measurementDuration),
        Pair("logsPath", logsPath)
    )
}