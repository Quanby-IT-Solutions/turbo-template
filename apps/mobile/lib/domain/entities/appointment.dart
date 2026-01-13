import 'package:equatable/equatable.dart';

/// Reschedule request model
class RescheduleRequest extends Equatable {
  final String id;
  final String appointmentId;
  final String requestedBy;
  final String requestedByRole; // PATIENT, DOCTOR
  final String? currentDate; // Original date before reschedule
  final String? currentTime; // Original time before reschedule
  final String newDate;
  final String newTime;
  final String reason;
  final String? notes;
  final String status; // PENDING, APPROVED, REJECTED, CANCELLED
  final DateTime createdAt;
  final DateTime updatedAt;

  const RescheduleRequest({
    required this.id,
    required this.appointmentId,
    required this.requestedBy,
    required this.requestedByRole,
    this.currentDate,
    this.currentTime,
    required this.newDate,
    required this.newTime,
    required this.reason,
    this.notes,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
  });

  @override
  List<Object?> get props => [
        id,
        appointmentId,
        requestedBy,
        requestedByRole,
        currentDate,
        currentTime,
        newDate,
        newTime,
        reason,
        notes,
        status,
        createdAt,
        updatedAt,
      ];
}

/// Doctor info model
class DoctorInfo extends Equatable {
  final String firstName;
  final String lastName;
  final String? specialization;
  final String? email;

  const DoctorInfo({
    required this.firstName,
    required this.lastName,
    this.specialization,
    this.email,
  });

  String get fullName => '$firstName $lastName';

  @override
  List<Object?> get props => [firstName, lastName, specialization, email];
}

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
  final String? priority; // LOW, NORMAL, HIGH, URGENT
  final DateTime createdAt;
  final DateTime? updatedAt;
  final List<RescheduleRequest>? rescheduleRequests;
  final DoctorInfo? doctor;

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
    this.priority,
    required this.createdAt,
    this.updatedAt,
    this.rescheduleRequests,
    this.doctor,
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

  String get doctorDisplayName {
    if (doctor != null) {
      return 'Dr. ${doctor!.fullName}';
    }
    return doctorName;
  }

  String? get doctorSpecialization => doctor?.specialization;

  bool get hasPendingRescheduleRequest {
    return rescheduleRequests?.any((req) => req.status == 'PENDING') ?? false;
  }

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
        priority,
        createdAt,
        updatedAt,
        rescheduleRequests,
        doctor,
      ];
}
