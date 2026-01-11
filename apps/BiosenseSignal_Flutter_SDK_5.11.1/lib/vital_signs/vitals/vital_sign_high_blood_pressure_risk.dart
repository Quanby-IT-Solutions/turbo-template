import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_types.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/high_blood_pressure_risk.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/vital_sign.dart';

class VitalSignHighBloodPressureRisk extends VitalSign<HighBloodPressureRisk> {
  VitalSignHighBloodPressureRisk(HighBloodPressureRisk value) : super(VitalSignTypes.highBloodPressureRisk, value);

  @override
  String toString() {
    return value.toString();
  }
}
