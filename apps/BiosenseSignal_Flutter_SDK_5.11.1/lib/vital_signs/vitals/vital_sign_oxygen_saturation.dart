import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_types.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/vital_sign.dart';

class VitalSignOxygenSaturation extends VitalSign<int> {
  VitalSignOxygenSaturation(int value)
      : super(VitalSignTypes.oxygenSaturation, value);

  @override
  String toString() {
    return value.toString();
  }
}
