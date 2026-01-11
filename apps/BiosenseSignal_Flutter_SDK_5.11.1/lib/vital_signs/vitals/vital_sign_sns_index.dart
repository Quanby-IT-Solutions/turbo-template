import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_types.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/vital_sign.dart';

class VitalSignSnsIndex extends VitalSign<double> {
  VitalSignSnsIndex(double value) : super(VitalSignTypes.snsIndex, value);

  @override
  String toString() {
    return value.toString();
  }
}
