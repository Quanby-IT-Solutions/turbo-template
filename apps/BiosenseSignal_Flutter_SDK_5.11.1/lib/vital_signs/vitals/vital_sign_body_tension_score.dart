import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_types.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/vital_sign.dart';

class VitalSignBodyTensionScore extends VitalSign<int> {
  VitalSignBodyTensionScore(int value) : super(VitalSignTypes.bodyTensionScore, value);

  @override
  String toString() {
    return value.toString();
  }
} 