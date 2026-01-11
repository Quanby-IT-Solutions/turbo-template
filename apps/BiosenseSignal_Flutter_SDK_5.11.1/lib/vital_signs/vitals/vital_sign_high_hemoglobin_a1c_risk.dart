import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_types.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/high_hemoglobin_a1c_risk.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/vital_sign.dart';

class VitalSignHighHemoglobinA1CRisk extends VitalSign<HighHemoglobinA1CRisk> {
  VitalSignHighHemoglobinA1CRisk(HighHemoglobinA1CRisk value) : super(VitalSignTypes.highHemoglobinA1CRisk, value);

  @override
  String toString() {
    return value.toString();
  }
}
