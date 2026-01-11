import 'package:biosensesignal_flutter_sdk/ppg_device/ppg_device_info.dart';

abstract class PPGDeviceInfoListener {
  void onPPGDeviceBatteryLevel(int level);
  void onPPGDeviceInfo(PPGDeviceInfo info);
}
