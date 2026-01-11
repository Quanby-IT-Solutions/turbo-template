import 'package:biosensesignal_flutter_sdk/bridge/bridge_channels.dart';
import 'package:biosensesignal_flutter_sdk/fall_detection/fall_detection_listener.dart';
import 'package:biosensesignal_flutter_sdk/images/image_data_listener.dart';
import 'package:biosensesignal_flutter_sdk/bridge/method_calls.dart';
import 'package:biosensesignal_flutter_sdk/health_monitor_exception.dart';
import 'package:biosensesignal_flutter_sdk/ppg_device/ppg_device_info_listener.dart';
import 'package:flutter/services.dart';
import 'package:biosensesignal_flutter_sdk/session/session_info_listener.dart';
import 'package:biosensesignal_flutter_sdk/session/session_state.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vital_signs_listener.dart';
import 'package:biosensesignal_flutter_sdk/bridge/bridge_events.dart';
import 'package:biosensesignal_flutter_sdk/bridge/bridge_models_factory.dart';
import 'package:biosensesignal_flutter_sdk/bridge/bridge_vital_signs_factory.dart';
import 'package:biosensesignal_flutter_sdk/logs/logs_listener.dart';

class Session {
  final SessionInfoListener? sessionInfoListener;
  final VitalSignsListener? vitalSignsListener;
  final ImageDataListener? imageDataListener;
  final PPGDeviceInfoListener? ppgDeviceInfoListener;
  final FallDetectionListener? fallDetectionListener;
  final LogsListener? logsListener;
  
  Session(
      {this.sessionInfoListener,
      this.vitalSignsListener,
      this.imageDataListener,
      this.ppgDeviceInfoListener,
      this.fallDetectionListener,
      this.logsListener}) {
    _registerToSessionEvents();
  }

  void _registerToSessionEvents() {
    eventChannel.receiveBroadcastStream().listen((onData) {
      var payload = onData['payload'];
      switch (onData['event'] as String) {
        case BridgeEvents.imageData:
          var imageData = createImageData(Map<String, dynamic>.from(payload));
          imageDataListener?.onImageData(imageData);
          break;
        case BridgeEvents.sessionStateChange:
          var state = createSessionState(payload as int);
          sessionInfoListener?.onSessionStateChange(state);
          break;
        case BridgeEvents.sessionError:
          var errorData = createErrorData(Map<String, dynamic>.from(payload));
          sessionInfoListener?.onError(errorData);
          break;
        case BridgeEvents.sessionWarning:
          var warningData =
              createWarningData(Map<String, dynamic>.from(payload));
          sessionInfoListener?.onWarning(warningData);
          break;
        case BridgeEvents.sessionVitalSign:
          var vitalSign = createVitalSign(Map<String, dynamic>.from(payload));
          if (vitalSign != null) {
            vitalSignsListener?.onVitalSign(vitalSign);
          }
          break;
        case BridgeEvents.sessionFinalResults:
          var report = createFinalResults(List<dynamic>.from(payload));
          vitalSignsListener?.onFinalResults(report);
          break;
        case BridgeEvents.enabledVitalSigns:
          var enabledVitalSigns =
              createEnabledVitalSigns(Map<String, int>.from(payload));
          sessionInfoListener?.onEnabledVitalSigns(enabledVitalSigns);
          break;
        case BridgeEvents.licenseInfo:
          var licenseInfo =
              createLicenseInfo(Map<String, dynamic>.from(payload));
          sessionInfoListener?.onLicenseInfo(licenseInfo);
          break;
        case BridgeEvents.ppgDeviceInfo:
          var ppgDeviceInfo =
              createPPGDeviceInfo(Map<String, dynamic>.from(payload));
          ppgDeviceInfoListener?.onPPGDeviceInfo(ppgDeviceInfo);
          break;
        case BridgeEvents.ppgDeviceBattery:
          var level = payload as int;
          ppgDeviceInfoListener?.onPPGDeviceBatteryLevel(level);
          break;
        case BridgeEvents.fallDetectionData:
          var fallDetectionData =
              createFallDetectionData(Map<String, dynamic>.from(payload));
          fallDetectionListener?.onFallDetection(fallDetectionData);
          break;
        case BridgeEvents.logsReady:
          var logsInfo = createLogsInfo(Map<String, dynamic>.from(payload));
          logsListener?.onLogsReady(logsInfo);
          break;
        default:
          break;
      }
    });
  }

  Future<void> start(int duration) async {
    try {
      await methodChannel
          .invokeMethod(MethodCalls.startSession, {"duration": duration});
    } on PlatformException catch (e) {
      throw HealthMonitorException(e.message!, int.parse(e.code));
    }
  }

  Future<void> stop() async {
    try {
      await methodChannel.invokeMethod(MethodCalls.stopSession);
    } on PlatformException catch (e) {
      throw HealthMonitorException(e.message!, int.parse(e.code));
    }
  }

  Future<void> terminate() async {
    await methodChannel.invokeMethod(MethodCalls.terminateSession);
  }

  Future<SessionState?> getState() async {
    int value = await methodChannel.invokeMethod(MethodCalls.getSessionState);
    return createSessionState(value);
  }
}
