


import 'package:biosensesignal_flutter_sdk/session/demographics/sex.dart';
import 'package:biosensesignal_flutter_sdk/session/smoking_status.dart';

class UserInformation {
  final Sex? sex;
  final double? age; 
  final double? weight; 
  final double? height; 
  final SmokingStatus? smokingStatus;

  UserInformation({this.sex, this.age, this.weight, this.height, this.smokingStatus});
  
}