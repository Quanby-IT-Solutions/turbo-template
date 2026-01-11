import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_types.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/vital_sign.dart';

class VitalSignHeartAge extends VitalSign<int> {
  VitalSignHeartAge(int value) : super(VitalSignTypes.heartAge, value);

  @override
  String toString() {
    return value.toString();
  }
} 