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
  private var sessionManager: SessionManager? = null

  override fun onAttachedToEngine(flutterPluginBinding: FlutterPlugin.FlutterPluginBinding) {
    pluginBinding = flutterPluginBinding
    applicationContext = flutterPluginBinding.applicationContext
  }

  override fun onAttachedToActivity(binding: ActivityPluginBinding) {
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
    methodChannel?.setMethodCallHandler(null)
    eventChannel?.setStreamHandler(null)
  }

  override fun onDetachedFromEngine(binding: FlutterPlugin.FlutterPluginBinding) {
  }

  override fun onMethodCall(call: MethodCall, result: Result) {
    try {
      when (call.method) {
        NativeBridgeApi.createSession -> {
          sessionManager?.createCameraSession(
            applicationContext,
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
        }
        NativeBridgeApi.createPPGDeviceSession -> {
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
        }
        NativeBridgeApi.startSession -> {
          sessionManager?.startSession(call.argument<Int>("duration"))
          result.success(null)
        }
        NativeBridgeApi.stopSession -> {
          sessionManager?.stopSession()
          result.success(null)
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
    } catch (e: HealthMonitorException) {
      result.error(e.errorCode.toString(), e.domain, null)
    }
  }
}
