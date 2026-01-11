import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_types.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/vital_sign.dart';

class VitalSignMeanArterialPressure extends VitalSign<int> {
  VitalSignMeanArterialPressure(int value) : super(VitalSignTypes.meanArterialPressure, value);

  @override
  String toString() {
    return value.toString();
  }
} 