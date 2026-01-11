import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_types.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/vital_sign.dart';

class VitalSignWellnessIndex extends VitalSign<int> {
  VitalSignWellnessIndex(int value)
      : super(VitalSignTypes.wellnessIndex, value);

  @override
  String toString() {
    return value.toString();
  }
}
