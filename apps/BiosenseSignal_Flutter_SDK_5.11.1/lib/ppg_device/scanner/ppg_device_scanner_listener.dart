import 'package:biosensesignal_flutter_sdk/ppg_device/ppg_device.dart';

abstract class PPGDeviceScannerListener {
  void onPPGDeviceDiscovered(PPGDevice ppgDevice);
  void onPPGDeviceScanFinished();
}
