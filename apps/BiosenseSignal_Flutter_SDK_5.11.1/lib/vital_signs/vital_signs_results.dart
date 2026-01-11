import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/vital_sign.dart';

class VitalSignsResults {
  
  final Map<int, VitalSign> _results = {};

  setResult(VitalSign vitalSign) {
    _results[vitalSign.type] = vitalSign;
  }

  VitalSign? getResult(int vitalSignType) {
    return _results[vitalSignType];
  }

  List<VitalSign> getResults() {
    return _results.values.toList();
  }
}
