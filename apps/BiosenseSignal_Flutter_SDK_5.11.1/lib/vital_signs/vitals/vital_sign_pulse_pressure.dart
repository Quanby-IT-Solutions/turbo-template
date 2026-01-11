import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_types.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/vital_sign.dart';

class VitalSignPulsePressure extends VitalSign<int> {
  VitalSignPulsePressure(int value) : super(VitalSignTypes.pulsePressure, value);

  @override
  String toString() {
    return value.toString();
  }
} 