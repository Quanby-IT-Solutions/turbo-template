import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_confidence.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_types.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/rri.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/vital_sign.dart';

class VitalSignRri extends VitalSign<List<Rri>> {
  final VitalSignConfidence? confidence;

  VitalSignRri(List<Rri> value, {this.confidence})
      : super(VitalSignTypes.rri, value);

  @override
  String toString() {
    return value.toString();
  }
}
