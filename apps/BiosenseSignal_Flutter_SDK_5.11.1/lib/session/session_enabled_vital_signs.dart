import 'package:biosensesignal_flutter_sdk/session/enabled_vital_signs.dart';

class SessionEnabledVitalSigns {
  final EnabledVitalSigns deviceEnabled;
  final EnabledVitalSigns measurementModeEnabled;
  final EnabledVitalSigns licenseEnabled;

  SessionEnabledVitalSigns(
      this.deviceEnabled, this.measurementModeEnabled, this.licenseEnabled);

  bool isEnabled(int vitalSignType) {
    return deviceEnabled.isEnabled(vitalSignType) &&
        measurementModeEnabled.isEnabled(vitalSignType) &&
        licenseEnabled.isEnabled(vitalSignType);
  }
}
