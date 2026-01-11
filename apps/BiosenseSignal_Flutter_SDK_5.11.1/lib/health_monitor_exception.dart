class HealthMonitorException implements Exception {
  final String domain;
  final int code;

  HealthMonitorException(this.domain, this.code);
}
