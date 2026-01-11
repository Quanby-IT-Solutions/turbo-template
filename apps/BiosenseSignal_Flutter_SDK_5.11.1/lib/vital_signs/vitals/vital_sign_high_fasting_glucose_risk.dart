import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_types.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/high_fasting_glucose_risk.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/vital_sign.dart';

class VitalSignHighFastingGlucoseRisk extends VitalSign<HighFastingGlucoseRisk> {
  VitalSignHighFastingGlucoseRisk(HighFastingGlucoseRisk value) : super(VitalSignTypes.highFastingGlucoseRisk, value);

  @override
  String toString() {
    return value.toString();
  }
}
