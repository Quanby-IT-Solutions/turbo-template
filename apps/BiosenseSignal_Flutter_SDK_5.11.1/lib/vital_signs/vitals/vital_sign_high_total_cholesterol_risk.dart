import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_types.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/high_total_cholesterol_risk.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/vital_sign.dart';

class VitalSignHighTotalCholesterolRisk extends VitalSign<HighTotalCholesterolRisk> {
  VitalSignHighTotalCholesterolRisk(HighTotalCholesterolRisk value) : super(VitalSignTypes.highTotalCholesterolRisk, value);

  @override
  String toString() {
    return value.toString();
  }
}
