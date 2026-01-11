import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_confidence.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_types.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/vital_sign.dart';

class VitalSignMeanRri extends VitalSign<int> {
  final VitalSignConfidence? confidence;

  VitalSignMeanRri(int value, {this.confidence})
      : super(VitalSignTypes.meanRri, value);

  @override
  String toString() {
    return value.toString();
  }
}
