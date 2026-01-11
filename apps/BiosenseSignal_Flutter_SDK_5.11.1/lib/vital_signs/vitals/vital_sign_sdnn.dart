import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_confidence.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_types.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/vital_sign.dart';

class VitalSignSdnn extends VitalSign<int> {
  final VitalSignConfidence? confidence;
  VitalSignSdnn(int value, {this.confidence})
      : super(VitalSignTypes.sdnn, value);

  @override
  String toString() {
    return value.toString();
  }
}
