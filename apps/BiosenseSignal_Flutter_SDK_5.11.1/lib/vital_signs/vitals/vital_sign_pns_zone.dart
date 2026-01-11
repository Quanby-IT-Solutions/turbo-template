import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_types.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/pns_zone.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/vital_sign.dart';

class VitalSignPnsZone extends VitalSign<PnsZone> {
  VitalSignPnsZone(PnsZone value) : super(VitalSignTypes.pnsZone, value);

  @override
  String toString() {
    return value.toString();
  }
}
