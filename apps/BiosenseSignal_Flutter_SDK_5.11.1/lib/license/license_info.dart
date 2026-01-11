import 'package:biosensesignal_flutter_sdk/license/license_activation_info.dart';
import 'package:biosensesignal_flutter_sdk/license/license_offline_measurements.dart';

class LicenseInfo {
  final LicenseActivationInfo activationInfo;
  final LicenseOfflineMeasurements? offlineMeasurements;

  LicenseInfo(this.activationInfo, this.offlineMeasurements);
}
