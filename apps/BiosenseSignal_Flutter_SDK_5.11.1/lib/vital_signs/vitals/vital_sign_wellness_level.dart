import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_types.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/vital_sign.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/wellness_level.dart';

class VitalSignWellnessLevel extends VitalSign<WellnessLevel> {
  VitalSignWellnessLevel(WellnessLevel value)
      : super(VitalSignTypes.wellnessLevel, value);

  @override
  String toString() {
    return value.toString();
  }
}
