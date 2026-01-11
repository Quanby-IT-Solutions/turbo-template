package com.biosensesignal.flutter_sdk

import com.biosensesignal.sdk.api.HealthMonitorException
import com.biosensesignal.sdk.api.SessionEnabledVitalSigns
import com.biosensesignal.sdk.api.alerts.ErrorData
import com.biosensesignal.sdk.api.alerts.WarningData
import com.biosensesignal.sdk.api.images.DeviceOrientation
import com.biosensesignal.sdk.api.images.ImageData
import com.biosensesignal.sdk.api.images.ImageListener
import com.biosensesignal.sdk.api.license.LicenseDetails
import com.biosensesignal.sdk.api.license.LicenseInfo
import com.biosensesignal.sdk.api.ppg_device_scanner.PPGDevice
import com.biosensesignal.sdk.api.ppg_device_scanner.PPGDeviceInfo
import com.biosensesignal.sdk.api.ppg_device_scanner.PPGDeviceScanner
import com.biosensesignal.sdk.api.ppg_device_scanner.PPGDeviceScannerListener
import com.biosensesignal.sdk.api.session.Session
import com.biosensesignal.sdk.api.session.SessionInfoListener
import com.biosensesignal.sdk.api.session.SessionState
import com.biosensesignal.sdk.api.session.demographics.Sex
import com.biosensesignal.sdk.api.session.user_info.UserInformation
import com.biosensesignal.sdk.api.session.user_info.SmokingStatus
import com.biosensesignal.sdk.api.session.ppg_device.PPGDeviceInfoListener
import com.biosensesignal.sdk.api.vital_signs.VitalSign
import com.biosensesignal.sdk.api.vital_signs.VitalSignsListener
import com.biosensesignal.sdk.api.vital_signs.VitalSignsResults
import com.biosensesignal.sdk.ppg_data.ppg_device.PPGDeviceType
import com.biosensesignal.sdk.ppg_device_scanner.PPGDeviceScannerFactory
import com.biosensesignal.sdk.session.FaceSessionBuilder
import com.biosensesignal.sdk.session.PolarSessionBuilder
import android.content.Context
import com.biosensesignal.sdk.api.fall_detection.FallDetectionData
import com.biosensesignal.sdk.api.fall_detection.FallDetectionListener
import com.biosensesignal.sdk.api.logs.LogsConfiguration
import com.biosensesignal.sdk.api.logs.LogsInfo
import com.biosensesignal.sdk.api.logs.LogsLevel
import com.biosensesignal.sdk.api.logs.LogsListener
import com.biosensesignal.sdk.api.session.CameraLocation
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow


class SessionManager(private val eventChannel: BiosenseSignalEventChannel):
    ImageDataSource, ImageListener, VitalSignsListener, SessionInfoListener,
    PPGDeviceInfoListener, FallDetectionListener, LogsListener {

    private val _images = MutableSharedFlow<ImageData>(replay = 0, extraBufferCapacity = 1, onBufferOverflow = BufferOverflow.DROP_LATEST)
    private var session: Session? = null

    private val ppgScanners = mutableMapOf<String, PPGDeviceScanner>()
    override val images: Flow<ImageData> = _images

    @Throws(HealthMonitorException::class)
    fun createCameraSession(
        context: Context,
        licenseKey: String,
        productId: String? = null,
        deviceOrientation: Int? = null,
        subjectSex: Int? = null,
        subjectAge: Double? = null,
        subjectWeight: Double? = null,
        subjectHeight: Double? = null,
        subjectSmokingStatus: Int? = null,
        detectionAlwaysOn: Boolean? = false,
        strictMeasurementGuidance: Boolean? = false,
        sdkAnalytics: Boolean? = false,
        cameraLocation: Int? = null,
        logsLevel: Int? = null,
        saveLogsToPublicFolder: Boolean? = false,
        options: Map<String, Any>? = null
    ) {
        val orientation = resolveDeviceOrientation(deviceOrientation)
        val userInformation = resolveUserInformation(
            subjectSex,
            subjectAge,
            subjectWeight,
            subjectHeight,
            subjectSmokingStatus
        )

        val sessionBuilder = FaceSessionBuilder(context)
            .withDeviceOrientation(orientation)
            .withUserInformation(userInformation)

        detectionAlwaysOn?.let {
            sessionBuilder.withDetectionAlwaysOn(it)
        }

        strictMeasurementGuidance?.let {
            sessionBuilder.withStrictMeasurementGuidance(it)
        }

        resolveCameraLocation(cameraLocation)?.let { location ->
            sessionBuilder.withCameraLocation(location)
        }

        resolveLogsLevel(logsLevel)?.let { level ->
            sessionBuilder.withLogs(
                LogsConfiguration(
                    level,
                    saveLogsToPublicFolder ?: false
                ),
                this@SessionManager
            )
        }

        session = sessionBuilder
            .withImageListener(this@SessionManager)
            .withVitalSignsListener(this@SessionManager)
            .withSessionInfoListener(this@SessionManager)
            .let { if (sdkAnalytics == true) it.withAnalytics() else it }
            .withOptions(options)
            .build(LicenseDetails(licenseKey, productId))
    }

    @Throws(HealthMonitorException::class)
    fun createPPGDeviceSession(
        context: Context,
        licenseKey: String,
        productId: String? = null,
        deviceId: String,
        deviceType: Int,
        subjectSex: Int? = null,
        subjectAge: Double? = null,
        subjectWeight: Double? = null,
        subjectHeight: Double? = null,
        subjectSmokingStatus: Int? = null,
        fallDetection: Boolean? = false,
        sdkAnalytics: Boolean? = false,
        logsLevel: Int? = null,
        saveLogsToPublicFolder: Boolean? = false,
        options: Map<String, Any>? = null
    ) {
        val userInformation = resolveUserInformation(
            subjectSex,
            subjectAge,
            subjectWeight,
            subjectHeight,
            subjectSmokingStatus,
        )

        if (resolvePPGDeviceType(deviceType) == PPGDeviceType.POLAR) {
            var sessionBuilder = PolarSessionBuilder(context, deviceId)
                .withUserInformation(userInformation)
                .withVitalSignsListener(this@SessionManager)
                .withSessionInfoListener(this@SessionManager)
                .withPPGDeviceInfoListener(this)
                .let { if (sdkAnalytics == true) it.withAnalytics() else it }
                .withOptions(options)

            if (fallDetection == true) {
                sessionBuilder = sessionBuilder.withFallDetectionListener(this)
            }

            resolveLogsLevel(logsLevel)?.let { level ->
                sessionBuilder.withLogs(
                    LogsConfiguration(
                        level,
                        saveLogsToPublicFolder ?: false
                    ),
                    this@SessionManager
                )
            }
            session = sessionBuilder.build(LicenseDetails(licenseKey, productId))
        }
    }

    fun startPPGDevicesScan(
        context: Context,
        scannerId: String,
        deviceType: Int,
        timeout: Long?
    ) {
        when (resolvePPGDeviceType(deviceType)) {
            PPGDeviceType.POLAR -> {
                ppgScanners[scannerId] = PPGDeviceScannerFactory.create(
                    context,
                    PPGDeviceType.POLAR,
                    object : PPGDeviceScannerListener {
                        override fun onPPGDeviceDiscovered(device: PPGDevice) {
                            eventChannel.sendEvent(
                                NativeBridgeEvents.ppgDeviceDiscovered,
                                mapOf(
                                    Pair("scannerId", scannerId),
                                    Pair("device", device.toMap()),
                                )
                            )
                        }

                        override fun onPPGDeviceScanFinished() {
                            eventChannel.sendEvent(NativeBridgeEvents.ppgDeviceScanFinished, scannerId)
                        }
                    }
                ).also { scanner ->
                    timeout?.let {
                        scanner.start(timeout)
                    } ?: scanner.start()
                }
            }
            else -> return
        }
    }

    fun stopPPGDeviceScan(scannerId: String) {
        ppgScanners[scannerId]?.stop();
    }

    @Throws(HealthMonitorException::class)
    fun startSession(duration: Int?) {
        session?.start(duration?.toLong() ?: 0)
    }

    @Throws(HealthMonitorException::class)
    fun stopSession() {
        session?.stop()
    }

    fun terminateSession() {
        session?.terminate()
    }

    fun getSessionState(): SessionState? {
        return session?.state
    }

    override fun onVitalSign(vitalSign: VitalSign) {
        eventChannel.sendEvent(NativeBridgeEvents.sessionVitalSign, vitalSign.toMap() ?: return)
    }

    override fun onFinalResults(vitalSignsResults: VitalSignsResults) {
        val results = vitalSignsResults.results.mapNotNull { result ->
            result.toMap()
        }
        eventChannel.sendEvent(NativeBridgeEvents.sessionFinalResults, results)
    }

    override fun onImage(imageData: ImageData) {
        eventChannel.sendEvent(NativeBridgeEvents.imageData, imageData.toMap())
        _images.tryEmit(imageData)
    }

    override fun onSessionStateChange(sessionState: SessionState) {
        eventChannel.sendEvent(NativeBridgeEvents.sessionStateChange, sessionState.ordinal)
    }

    override fun onWarning(warningData: WarningData) {
        eventChannel.sendEvent(NativeBridgeEvents.sessionWarning, warningData.toMap())
    }

    override fun onError(errorData: ErrorData) {
        eventChannel.sendEvent(NativeBridgeEvents.sessionError, errorData.toMap())
    }

    override fun onLicenseInfo(licenseInfo: LicenseInfo) {
        eventChannel.sendEvent(NativeBridgeEvents.licenseInfo, licenseInfo.toMap())
    }

    override fun onEnabledVitalSigns(enabledVitalSigns: SessionEnabledVitalSigns) {
        eventChannel.sendEvent(NativeBridgeEvents.enabledVitalSigns, enabledVitalSigns.toMap())
    }

    override fun onPPGDeviceInfo(ppgDeviceInfo: PPGDeviceInfo) {
        eventChannel.sendEvent(NativeBridgeEvents.ppgDeviceInfo, ppgDeviceInfo.toMap())
    }

    override fun onPPGDeviceBatteryLevel(level: Int) {
        eventChannel.sendEvent(NativeBridgeEvents.ppgDeviceBattery, level)
    }

    override fun onFallDetectionData(data: FallDetectionData) {
        eventChannel.sendEvent(NativeBridgeEvents.fallDetectionData, data.toMap())
    }

    override fun onLogsReady(logsInfo: LogsInfo) {
        eventChannel.sendEvent(NativeBridgeEvents.logsReady, logsInfo.toMap())
    }

    private fun resolveDeviceOrientation(deviceOrientation: Int?): DeviceOrientation? {
        return deviceOrientation?.let {orientation ->
            try {
                DeviceOrientation.values()[orientation]
            } catch (ignore: IndexOutOfBoundsException) {
                null
            }
        }
    }

    private fun resolveUserInformation(sexInt: Int?, age: Double?, weight: Double?, height: Double?, smokingStatusInt: Int?): UserInformation {
        val sex = sexInt?.let { sex ->
            try {
                Sex.values()[sex]
            } catch (e: IndexOutOfBoundsException) {
                Sex.UNSPECIFIED
            }
        }

        val smokingStatus = smokingStatusInt?.let { status ->
            try {
                SmokingStatus.values()[status]
            } catch (e: IndexOutOfBoundsException) {
                SmokingStatus.UNSPECIFIED
            }
        }

        return UserInformation.Builder().apply {
          sex?.let { setSex(sex) }
          age?.let { setAge(age) }
          weight?.let { setWeight(weight) }
          height?.let { setHeight(height) }
          smokingStatus?.let { setSmokingStatus(smokingStatus) }
        }.build()
    }

    private fun resolvePPGDeviceType(ppgDeviceType: Int?): PPGDeviceType {
        if (ppgDeviceType == PPGDeviceType.POLAR.ordinal) {
            return PPGDeviceType.POLAR
        }

        return PPGDeviceType.POLAR
    }

    private fun resolveCameraLocation(cameraLocation: Int?): CameraLocation? {
        return cameraLocation?.let { location ->
            try {
                CameraLocation.values()[location]
            } catch (ignore: IndexOutOfBoundsException) {
                null
            }
        }
    }

    private fun resolveLogsLevel(logsLevel: Int?): LogsLevel? {
        return logsLevel?.let { _ ->
            return LogsLevel.DEFAULT
        }
    }
}
