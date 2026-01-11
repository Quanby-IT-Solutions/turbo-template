import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_types.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/vital_sign.dart';

class VitalSignHemoglobinA1C extends VitalSign<double> {
  VitalSignHemoglobinA1C(double value)
      : super(VitalSignTypes.hemoglobinA1C, value);

  @override
  String toString() {
    return value.toString();
  }
}
