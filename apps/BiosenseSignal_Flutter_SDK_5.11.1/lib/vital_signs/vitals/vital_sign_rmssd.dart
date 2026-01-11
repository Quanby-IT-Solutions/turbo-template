import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_types.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/vital_sign.dart';

class VitalSignRmssd extends VitalSign<int> {
  VitalSignRmssd(int value) : super(VitalSignTypes.rmssd, value);

  @override
  String toString() {
    return value.toString();
  }
}
