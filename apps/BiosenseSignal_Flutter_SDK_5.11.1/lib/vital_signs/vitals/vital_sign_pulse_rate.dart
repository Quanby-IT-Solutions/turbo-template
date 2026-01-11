import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_confidence.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_types.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/vital_sign.dart';

class VitalSignPulseRate extends VitalSign<int> {
  final VitalSignConfidence? confidence;

  VitalSignPulseRate(int value, {this.confidence})
      : super(VitalSignTypes.pulseRate, value);

  @override
  String toString() {
    return value.toString();
  }
}
