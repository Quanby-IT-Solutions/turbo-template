package com.biosensesignal.flutter_sdk


import com.biosensesignal.sdk.api.HealthMonitorException
import com.biosensesignal.sdk.session.PolarSessionBuilder
import android.content.Context
import com.biosensesignal.sdk.utils.POLAR_MIN_VERSION
import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.embedding.engine.plugins.activity.ActivityAware
import io.flutter.embedding.engine.plugins.activity.ActivityPluginBinding
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import io.flutter.plugin.common.MethodChannel.MethodCallHandler
import io.flutter.plugin.common.MethodChannel.Result


class BiosenseSignalFlutterSdkPlugin: FlutterPlugin, ActivityAware, MethodCallHandler {

  private val methodChannelId = "plugins.biosensesignal.com/flutter_plugin"
  private val eventChannelId = "plugins.biosensesignal.com/sdk_events"
  private var methodChannel : MethodChannel? = null
  private var eventChannel : EventChannel? = null
  private lateinit var pluginBinding: FlutterPlugin.FlutterPluginBinding
  private lateinit var applicationContext: Context
  private var activityContext: Context? = null
  private var sessionManager: SessionManager? = null

  override fun onAttachedToEngine(flutterPluginBinding: FlutterPlugin.FlutterPluginBinding) {
    pluginBinding = flutterPluginBinding
    applicationContext = flutterPluginBinding.applicationContext
  }

  override fun onAttachedToActivity(binding: ActivityPluginBinding) {
    activityContext = binding.activity
    pluginBinding.platformViewRegistry.registerViewFactory(BiosenseSignalPreviewFactory.cameraPreviewId, BiosenseSignalPreviewFactory)
    methodChannel = MethodChannel(pluginBinding.binaryMessenger, methodChannelId).also { channel ->
      channel.setMethodCallHandler(this)
    }

    eventChannel = EventChannel(pluginBinding.binaryMessenger, eventChannelId).also { channel ->
      sessionManager = SessionManager(BiosenseSignalEventChannel(channel)).also { manager ->
        BiosenseSignalPreviewFactory.setDataSource(manager)
      }
    }
  }

  override fun onDetachedFromActivityForConfigChanges() {
  }

  override fun onReattachedToActivityForConfigChanges(binding: ActivityPluginBinding) {
    onAttachedToActivity(binding)
  }

  override fun onDetachedFromActivity() {
    activityContext = null
    methodChannel?.setMethodCallHandler(null)
    eventChannel?.setStreamHandler(null)
  }

  override fun onDetachedFromEngine(binding: FlutterPlugin.FlutterPluginBinding) {
  }

  /** Context for camera session: Activity preferred (camera SDK often needs it), else application. */
  private fun contextForCamera(): Context = activityContext ?: applicationContext

  override fun onMethodCall(call: MethodCall, result: Result) {
    when (call.method) {
      // createSession triggers first load of libbiosensesignalhrv.so; static init (license/hash) runs then.
      // If you see SIGSEGV in libbiosensesignalhrv.so (generateHashKey/isMatch), report to BioSense with full backtrace.
      NativeBridgeApi.createSession -> {
        try {
          sessionManager?.createCameraSession(
            contextForCamera(),
            call.argument<String>("licenseKey") ?: "",
            call.argument<String>("productId"),
            call.argument<Int>("deviceOrientation"),
            call.argument<Int>("subjectSex"),
            call.argument<Double>("subjectAge"),
            call.argument<Double>("subjectWeight"),
            call.argument<Double>("subjectHeight"),
            call.argument<Int>("subjectSmokingStatus"),
            call.argument<Boolean>("detectionAlwaysOn"),
            call.argument<Boolean>("strictMeasurementGuidance"),
            call.argument<Boolean>("sdkAnalytics"),
            call.argument<Int>("cameraLocation"),
            call.argument<Int>("logsLevel"),
            call.argument<Boolean>("saveLogsToPublicFolder"),
            call.argument<Map<String, Any>>("options")
          )
          result.success(null)
        } catch (e: HealthMonitorException) {
          result.error(e.errorCode.toString(), e.domain, null)
        }
      }
      NativeBridgeApi.createPPGDeviceSession -> {
        try {
          sessionManager?.createPPGDeviceSession(
            applicationContext,
            call.argument<String>("licenseKey") ?: "",
            call.argument<String>("productId"),
            call.argument<String>("deviceId") ?: "",
            call.argument<Int>("deviceType") ?: 0,
            call.argument<Int>("subjectSex"),
            call.argument<Double>("subjectAge"),
            call.argument<Double>("subjectWeight"),
            call.argument<Double>("subjectHeight"),
            call.argument<Int>("subjectSmokingStatus"),
            call.argument<Boolean>("fallDetection"),
            call.argument<Boolean>("sdkAnalytics"),
            call.argument<Int>("logsLevel"),
            call.argument<Boolean>("saveLogsToPublicFolder"),
            call.argument<Map<String, Any>>("options")
          )
          result.success(null)
        } catch (e: HealthMonitorException) {
          result.error(e.errorCode.toString(), e.domain, null)
        }
      }
      NativeBridgeApi.startSession -> {
        try {
          sessionManager?.startSession(call.argument<Int>("duration"))
          result.success(null)
        } catch (e: HealthMonitorException) {
          result.error(e.errorCode.toString(), e.domain, null)
        }
      }
      NativeBridgeApi.stopSession -> {
        try {
          sessionManager?.stopSession()
          result.success(null)
        } catch (e: HealthMonitorException) {
          result.error(e.errorCode.toString(), e.domain, null)
        }
      }
      NativeBridgeApi.terminateSession -> {
        sessionManager?.terminateSession()
        result.success(null)
      }
      NativeBridgeApi.getSessionState -> {
        result.success(sessionManager?.getSessionState()?.ordinal)
      }
      NativeBridgeApi.getNativeSdkVersion -> {
        result.success(mapOf(
          Pair("version", com.biosensesignal.sdk.BuildConfig.VERSION_NAME),
          Pair("build", com.biosensesignal.sdk.BuildConfig.VERSION_CODE),
        ))
      }
      NativeBridgeApi.getMinPolarVersion -> {
        result.success(POLAR_MIN_VERSION)
      }
      NativeBridgeApi.startPPGDevicesScan -> {
        sessionManager?.startPPGDevicesScan(
          applicationContext,
          call.argument<String>("scannerId") ?: "",
          call.argument<Int>("deviceType") ?: 0,
          call.argument<Int>("timeout")?.toLong(),
        )
        result.success(null)
      }
      NativeBridgeApi.stopPPGDeviceScan -> {
        sessionManager?.stopPPGDeviceScan(call.argument<String>("scannerId") ?: "")
        result.success(null)
      }
    }
  }
}
