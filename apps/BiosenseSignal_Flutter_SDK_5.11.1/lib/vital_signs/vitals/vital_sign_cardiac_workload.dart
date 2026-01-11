import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_types.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/vital_sign.dart';

class VitalSignCardiacWorkload extends VitalSign<double> {
  VitalSignCardiacWorkload(double value) : super(VitalSignTypes.cardiacWorkload, value);

  @override
  String toString() {
    return value.toString();
  }
} 