import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_types.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/vital_sign.dart';

class VitalSignHemoglobin extends VitalSign<double> {
  VitalSignHemoglobin(double value) : super(VitalSignTypes.hemoglobin, value);

  @override
  String toString() {
    return value.toString();
  }
}
