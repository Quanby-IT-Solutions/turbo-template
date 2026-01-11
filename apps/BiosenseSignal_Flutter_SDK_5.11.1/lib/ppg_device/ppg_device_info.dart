import 'package:biosensesignal_flutter_sdk/ppg_device/ppg_device_type.dart';

class PPGDeviceInfo {
  final PPGDeviceType deviceType;
  final String deviceId;
  final String version;

  PPGDeviceInfo(this.deviceType, this.deviceId, this.version);
}
