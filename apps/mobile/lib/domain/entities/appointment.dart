import 'package:equatable/equatable.dart';

class Appointment extends Equatable {
  final String id;
  final String patientId;
  final String doctorId;
  final String patientName;
  final String doctorName;
  final DateTime scheduledAt;
  final String status; // pending, confirmed, completed, cancelled, rescheduled
  final String type; // video_call, in_person
  final String? notes;
  final String? reasonForVisit;
  final DateTime createdAt;
  final DateTime? updatedAt;

  const Appointment({
    required this.id,
    required this.patientId,
    required this.doctorId,
    required this.patientName,
    required this.doctorName,
    required this.scheduledAt,
    required this.status,
    required this.type,
    this.notes,
    this.reasonForVisit,
    required this.createdAt,
    this.updatedAt,
  });

  String get statusDisplayName {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'rescheduled':
        return 'Rescheduled';
      default:
        return 'Unknown';
    }
  }

  bool get isPending => status == 'pending';
  bool get isConfirmed => status == 'confirmed';
  bool get isCompleted => status == 'completed';
  bool get isCancelled => status == 'cancelled';

  @override
  List<Object?> get props => [
        id,
        patientId,
        doctorId,
        patientName,
        doctorName,
        scheduledAt,
        status,
        type,
        notes,
        reasonForVisit,
        createdAt,
        updatedAt,
      ];
}
