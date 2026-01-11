import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_types.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/ascvd_risk_level.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/vital_sign.dart';

class VitalSignAscvdRiskLevel extends VitalSign<AscvdRiskLevel> {
  VitalSignAscvdRiskLevel(AscvdRiskLevel value) : super(VitalSignTypes.ascvdRiskLevel, value);

  @override
  String toString() {
    return value.toString();
  }
} 