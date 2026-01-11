class BloodPressure {
  final int systolic;
  final int diastolic;

  BloodPressure({required this.systolic, required this.diastolic});

  BloodPressure.fromJson(Map<String, dynamic> json)
      : systolic = json['systolic'],
        diastolic = json['diastolic'];

  @override
  String toString() => "$systolic/$diastolic";
}
