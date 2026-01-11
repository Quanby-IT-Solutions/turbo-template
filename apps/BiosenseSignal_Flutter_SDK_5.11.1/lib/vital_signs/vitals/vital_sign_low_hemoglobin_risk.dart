import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_types.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/low_hemoglobin_risk.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/vital_sign.dart';

class VitalSignLowHemoglobinRisk extends VitalSign<LowHemoglobinRisk> {
  VitalSignLowHemoglobinRisk(LowHemoglobinRisk value) : super(VitalSignTypes.lowHemoglobinRisk, value);

  @override
  String toString() {
    return value.toString();
  }
}
