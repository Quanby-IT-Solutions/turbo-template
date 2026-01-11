class WeeklySlot {
  final int dayOfWeek; // 1 = Monday, 7 = Sunday
  final String startTime; // "09:00"
  final String endTime; // "17:00"

  const WeeklySlot({
    required this.dayOfWeek,
    required this.startTime,
    required this.endTime,
  });

  WeeklySlot copyWith({
    int? dayOfWeek,
    String? startTime,
    String? endTime,
  }) {
    return WeeklySlot(
      dayOfWeek: dayOfWeek ?? this.dayOfWeek,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'dayOfWeek': dayOfWeek,
      'startTime': startTime,
      'endTime': endTime,
    };
  }

  factory WeeklySlot.fromJson(Map<String, dynamic> json) {
    return WeeklySlot(
      dayOfWeek: json['dayOfWeek'] as int,
      startTime: json['startTime'] as String,
      endTime: json['endTime'] as String,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is WeeklySlot &&
        other.dayOfWeek == dayOfWeek &&
        other.startTime == startTime &&
        other.endTime == endTime;
  }

  @override
  int get hashCode => Object.hash(dayOfWeek, startTime, endTime);
}
