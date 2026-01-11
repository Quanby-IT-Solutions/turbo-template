import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_types.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/vital_sign.dart';

class VitalSignAscvdRisk extends VitalSign<double> {

  VitalSignAscvdRisk(double value): super(VitalSignTypes.ascvdRisk, value);

  @override
  String toString() {
    return value.toString();
  }
}
