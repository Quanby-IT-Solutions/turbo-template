import 'package:biosensesignal_flutter_sdk/session/demographics/sex.dart';

@Deprecated("This class is deprecated and will be remove from future versions of the SDK")
class SubjectDemographic {
  final Sex? sex;
  final double? age;
  final double? weight;
  final double? height;

  SubjectDemographic({this.sex, this.age, this.weight, this.height});
}
