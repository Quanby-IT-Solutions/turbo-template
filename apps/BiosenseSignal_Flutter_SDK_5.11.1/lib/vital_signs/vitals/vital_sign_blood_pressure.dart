import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_types.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/blood_pressure.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/vital_sign.dart';

class VitalSignBloodPressure extends VitalSign<BloodPressure> {
  VitalSignBloodPressure(BloodPressure value)
      : super(VitalSignTypes.bloodPressure, value);

  @override
  String toString() {
    return value.toString();
  }
}
