import 'dart:ui';

import 'package:biosensesignal_flutter_sdk/fall_detection/fall_detection_data.dart';
import 'package:biosensesignal_flutter_sdk/ppg_device/ppg_device.dart';
import 'package:biosensesignal_flutter_sdk/ppg_device/ppg_device_info.dart';
import 'package:biosensesignal_flutter_sdk/ppg_device/ppg_device_type.dart';
import 'package:biosensesignal_flutter_sdk/session/enabled_vital_signs.dart';
import 'package:biosensesignal_flutter_sdk/images/image_data.dart';
import 'package:biosensesignal_flutter_sdk/license/license_activation_info.dart';
import 'package:biosensesignal_flutter_sdk/license/license_info.dart';
import 'package:biosensesignal_flutter_sdk/license/license_offline_measurements.dart';
import 'package:biosensesignal_flutter_sdk/logs/logs_info.dart';
import 'package:biosensesignal_flutter_sdk/session/session_enabled_vital_signs.dart';
import 'package:biosensesignal_flutter_sdk/session/session_state.dart';
import 'package:biosensesignal_flutter_sdk/alerts/warning_data.dart';
import 'package:biosensesignal_flutter_sdk/alerts/error_data.dart';

ImageData createImageData(Map<String, dynamic> imageData) {
  var roi = imageData['roi'];
  Rect? roiRect;
  if (roi != null) {
    roiRect = Rect.fromLTWH(roi['left']!.toDouble(), roi['top']!.toDouble(),
        roi['width']!.toDouble(), roi['height']!.toDouble());
  }

  return ImageData(
      imageWidth: imageData['width'],
      imageHeight: imageData['height'],
      roi: roiRect,
      imageValidity: imageData['validity']);
}

WarningData createWarningData(Map<String, dynamic> data) {
  return WarningData(data['domain'], data['code']);
}

ErrorData createErrorData(Map<String, dynamic> data) {
  return ErrorData(data['domain'], data['code']);
}

SessionState createSessionState(int sessionState) {
  return SessionState.values[sessionState];
}

SessionEnabledVitalSigns createEnabledVitalSigns(Map<String, int> data) {
  var deviceEnabled = EnabledVitalSigns(data["device_enabled"]!);
  var measurementModeEnabled =
      EnabledVitalSigns(data["measurement_mode_enabled"]!);
  var licenseEnabled = EnabledVitalSigns(data["license_enabled"]!);

  return SessionEnabledVitalSigns(
      deviceEnabled, measurementModeEnabled, licenseEnabled);
}

LicenseInfo createLicenseInfo(Map<String, dynamic> data) {
  var activationInfo = LicenseActivationInfo(data["activation_id"] as String);

  LicenseOfflineMeasurements? offlineMeasurements;
  if (data.containsKey("offline_measurements_total")) {
    offlineMeasurements = LicenseOfflineMeasurements(
      data["offline_measurements_total"] as int,
      data["offline_measurements_remaining"] as int,
      data["offline_measurements_end_timestamp"] as int,
    );
  }

  return LicenseInfo(activationInfo, offlineMeasurements);
}

PPGDevice createPPGDevice(Map<String, dynamic> data) {
  var deviceType = PPGDeviceType.values[data['deviceType']];
  return PPGDevice(data['deviceId'], deviceType);
}

PPGDeviceInfo createPPGDeviceInfo(Map<String, dynamic> data) {
  var deviceType = PPGDeviceType.values[data['deviceType']];

  return PPGDeviceInfo(deviceType, data['deviceId'], data['version']);
}

FallDetectionData createFallDetectionData(Map<String, dynamic> data) {
  var timeMillis = data['time'] as int;
  return FallDetectionData(DateTime.fromMillisecondsSinceEpoch(timeMillis));
}

LogsInfo createLogsInfo(Map<String, dynamic> data) {
  return LogsInfo(
    measurementDuration: data['measurementDuration'] as int,
    logsPath: data['logsPath'] as String,
  );
}