import 'package:biosensesignal_flutter_sdk/ppg_device/ppg_device_type.dart';

class PPGDevice {
  final String deviceId;
  final PPGDeviceType deviceType;

  PPGDevice(this.deviceId, this.deviceType);
}
