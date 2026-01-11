class Rri {
  final int interval;
  final double timestamp;

  Rri({required this.interval, required this.timestamp});

  Rri.fromJson(Map<String, dynamic> json)
      : interval = json['interval'],
        timestamp = json['timestamp'];
}
