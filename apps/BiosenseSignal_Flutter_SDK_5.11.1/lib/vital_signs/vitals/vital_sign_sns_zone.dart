import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_types.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/sns_zone.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/vital_sign.dart';

class VitalSignSnsZone extends VitalSign<SnsZone> {
  VitalSignSnsZone(SnsZone value) : super(VitalSignTypes.snsZone, value);

  @override
  String toString() {
    return value.toString();
  }
}
