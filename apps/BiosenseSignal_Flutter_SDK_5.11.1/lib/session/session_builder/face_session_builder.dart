import 'package:biosensesignal_flutter_sdk/bridge/bridge_channels.dart';
import 'package:biosensesignal_flutter_sdk/bridge/method_calls.dart';
import 'package:biosensesignal_flutter_sdk/health_monitor_exception.dart';
import 'package:biosensesignal_flutter_sdk/images/camera_location.dart';
import 'package:biosensesignal_flutter_sdk/images/device_orientation.dart'
    as device_orientation;
import 'package:biosensesignal_flutter_sdk/images/image_format_mode.dart';
import 'package:biosensesignal_flutter_sdk/license/license_details.dart';
import 'package:biosensesignal_flutter_sdk/session/demographics/subject_demographic.dart';
import 'package:biosensesignal_flutter_sdk/session/measurement_mode.dart';
import 'package:biosensesignal_flutter_sdk/session/session.dart';
import 'package:biosensesignal_flutter_sdk/session/session_builder/session_builder.dart';
import 'package:biosensesignal_flutter_sdk/session/user_information.dart';
import 'package:flutter/services.dart';


class FaceSessionBuilder extends SessionBuilder {
  UserInformation? _userInformation;
  device_orientation.DeviceOrientation? _deviceOrientation;
  ImageFormatMode? _imageFormatMode;
  bool _detectionAlwaysOn = false;
  bool? _strictMeasurementGuidance;
  CameraLocation? _cameraLocation;


  @Deprecated("This methos is deprecated and will be remove from future versions of the SDK")
  FaceSessionBuilder withSubjectDemographic(
      SubjectDemographic? subjectDemographic) {
    _userInformation = UserInformation(
      sex: subjectDemographic?.sex,
      age: subjectDemographic?.age,
      weight: subjectDemographic?.weight,
      height: subjectDemographic?.height
    );
    return this;
  }

  FaceSessionBuilder withUserInformation(UserInformation userInformation) {
    _userInformation = userInformation;
    return this;
  }

  FaceSessionBuilder withDeviceOrientation(
      device_orientation.DeviceOrientation? deviceOrientation) {
    _deviceOrientation = deviceOrientation;
    return this;
  }

  FaceSessionBuilder withImageFormatMode(ImageFormatMode? imageFormatMode) {
    _imageFormatMode = imageFormatMode;
    return this;
  }

  FaceSessionBuilder withDetectionAlwaysOn(bool enabled) {
    _detectionAlwaysOn = enabled;
    return this;
  }

  FaceSessionBuilder withStrictMeasurementGuidance(bool enabled) {
    _strictMeasurementGuidance = enabled;
    return this;
  }

  FaceSessionBuilder withCameraLocation(CameraLocation cameraLocation) {
    _cameraLocation = cameraLocation;
    return this;
  }

  @override
  Future<Session> build(LicenseDetails licenseDetails) async {
    var session = Session(
        sessionInfoListener: sessionInfoListener,
        vitalSignsListener: vitalSignListener,
        imageDataListener: imageDataListener,
        logsListener: logsListener
    );

    try {
      await methodChannel.invokeMethod(MethodCalls.createSession, {
        'measurementMode': MeasurementMode.face.index,
        'licenseKey': licenseDetails.licenseKey,
        'productId': licenseDetails.productId,
        'detectionAlwaysOn': _detectionAlwaysOn,
        'deviceOrientation': _deviceOrientation?.index,
        'subjectSex': _userInformation?.sex?.index,
        'subjectAge': _userInformation?.age,
        'subjectWeight': _userInformation?.weight,
        'subjectHeight': _userInformation?.height,
        'subjectSmokingStatus': _userInformation?.smokingStatus?.index,
        'imageFormatMode': _imageFormatMode?.index,
        'strictMeasurementGuidance': _strictMeasurementGuidance,
        'sdkAnalytics': sdkAnalyticsEnabled,
        'cameraLocation': _cameraLocation?.index,
        'logsLevel': logsConfiguration?.logsLevel.index,
        'saveLogsToPublicFolder': logsConfiguration?.saveLogsToPublicFolder,
        'options': options
      });
    } on PlatformException catch (e) {
      throw HealthMonitorException(e.message as String, int.parse(e.code));
    }

    return session;
  }
}
