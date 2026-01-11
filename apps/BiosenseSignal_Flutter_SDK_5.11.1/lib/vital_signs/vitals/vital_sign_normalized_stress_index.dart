import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_types.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/vital_sign.dart';

class VitalSignNormalizedStressIndex extends VitalSign<int> {
  VitalSignNormalizedStressIndex(int value) : super(VitalSignTypes.normalizedStressIndex, value);

  @override
  String toString() {
    return value.toString();
  }
} 