import 'package:biosensesignal_flutter_sdk/bridge/bridge_channels.dart';
import 'package:biosensesignal_flutter_sdk/bridge/method_calls.dart';
import 'package:biosensesignal_flutter_sdk/fall_detection/fall_detection_listener.dart';
import 'package:biosensesignal_flutter_sdk/health_monitor_exception.dart';
import 'package:biosensesignal_flutter_sdk/logs/logs_configuration.dart';
import 'package:biosensesignal_flutter_sdk/logs/logs_listener.dart';
import 'package:biosensesignal_flutter_sdk/ppg_device/ppg_device_info_listener.dart';
import 'package:biosensesignal_flutter_sdk/ppg_device/ppg_device_type.dart';
import 'package:biosensesignal_flutter_sdk/session/demographics/subject_demographic.dart';
import 'package:biosensesignal_flutter_sdk/session/measurement_mode.dart';
import 'package:biosensesignal_flutter_sdk/session/session.dart';
import 'package:biosensesignal_flutter_sdk/session/session_info_listener.dart';
import 'package:biosensesignal_flutter_sdk/session/user_information.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vital_signs_listener.dart';
import 'package:biosensesignal_flutter_sdk/license/license_details.dart';
import 'package:flutter/services.dart';

class PolarSessionBuilder {
  final String _deviceId;
  UserInformation? _userInformation;
  VitalSignsListener? _vitalSignsListener;
  SessionInfoListener? _sessionInfoListener;
  PPGDeviceInfoListener? _ppgDeviceInfoListener;
  FallDetectionListener? _fallDetectionListener;
  bool? _sdkAnalyticsEnabled;
  Map<String, dynamic>? _options;
  LogsConfiguration? _logsConfiguration;
  LogsListener? _logsListener;

  PolarSessionBuilder(this._deviceId);

  @Deprecated("This methos is deprecated and will be remove from future versions of the SDK")
  PolarSessionBuilder withSubjectDemographic(
      SubjectDemographic? subjectDemographic) {
    _userInformation = UserInformation(
      sex: subjectDemographic?.sex,
      age: subjectDemographic?.age,
      weight: subjectDemographic?.weight,
      height: subjectDemographic?.height
    );
    return this;
  }

  PolarSessionBuilder withUserInformation(UserInformation userInformation) {
    _userInformation = userInformation;
    return this;
  }

  PolarSessionBuilder withSessionInfoListener(
      SessionInfoListener? sessionInfoListener) {
    _sessionInfoListener = sessionInfoListener;
    return this;
  }

  PolarSessionBuilder withVitalSignsListener(
      VitalSignsListener vitalSignsListener) {
    _vitalSignsListener = vitalSignsListener;
    return this;
  }

  PolarSessionBuilder withPPGDeviceInfoListener(
      PPGDeviceInfoListener ppgDeviceInfoListener) {
    _ppgDeviceInfoListener = ppgDeviceInfoListener;
    return this;
  }

  PolarSessionBuilder withFallDetectionListener(
      FallDetectionListener fallDetectionListener) {
    _fallDetectionListener = fallDetectionListener;
    return this;
  }

  PolarSessionBuilder withLogs(LogsConfiguration logsConfiguration, LogsListener logsListener) {
    _logsConfiguration = logsConfiguration;
    _logsListener = logsListener;
    return this;
  }

  PolarSessionBuilder withAnalytics() {
    _sdkAnalyticsEnabled = true;
    return this;
  }

  PolarSessionBuilder withOptions(Map<String, dynamic> options) {
    _options = options;
    return this;
  }

  String get deviceId => _deviceId;

  VitalSignsListener? get vitalSignListener => _vitalSignsListener;

  SessionInfoListener? get sessionInfoListener => _sessionInfoListener;

  PPGDeviceInfoListener? get ppgDeviceInfoListener => _ppgDeviceInfoListener;

  FallDetectionListener? get fallDetectionListener => _fallDetectionListener;

  Map<String, dynamic>? get options => _options;

  LogsConfiguration? get logsConfiguration => _logsConfiguration;

  LogsListener? get logsListener => _logsListener;

  Future<Session> build(LicenseDetails licenseDetails) async {
    var session = Session(
        sessionInfoListener: sessionInfoListener,
        vitalSignsListener: vitalSignListener,
        ppgDeviceInfoListener: ppgDeviceInfoListener,
        fallDetectionListener: fallDetectionListener);

    try {
      await methodChannel.invokeMethod(MethodCalls.createPPGDeviceSession, {
        'measurementMode': MeasurementMode.ppgDevice.index,
        'licenseKey': licenseDetails.licenseKey,
        'productId': licenseDetails.productId,
        'deviceId': deviceId,
        'deviceType': PPGDeviceType.polar.index,
        'subjectSex': _userInformation?.sex?.index,
        'subjectAge': _userInformation?.age,
        'subjectWeight': _userInformation?.weight,
        'subjectHeight': _userInformation?.height,
        'subjectSmokingStatus': _userInformation?.smokingStatus?.index,
        'fallDetection': _fallDetectionListener != null,
        'sdkAnalytics': _sdkAnalyticsEnabled,
        'logsLevel': _logsConfiguration?.logsLevel.index,
        'saveLogsToPublicFolder': _logsConfiguration?.saveLogsToPublicFolder,
        'options': options
      });
    } on PlatformException catch (e) {
      throw HealthMonitorException(e.message as String, int.parse(e.code));
    }

    return session;
  }
}
