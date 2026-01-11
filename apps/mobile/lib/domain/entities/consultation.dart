import 'package:equatable/equatable.dart';

class Consultation extends Equatable {
  final String id;
  final String doctorId;
  final String patientId;
  final DateTime startTime;
  final DateTime? endTime;
  final String consultationCode;
  final bool isPublic;
  final String? notes;
  final String? diagnosis;
  final String? treatment;
  final DateTime? followUpDate;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Consultation({
    required this.id,
    required this.doctorId,
    required this.patientId,
    required this.startTime,
    this.endTime,
    required this.consultationCode,
    required this.isPublic,
    this.notes,
    this.diagnosis,
    this.treatment,
    this.followUpDate,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Consultation.fromMap(Map<String, dynamic> map) {
    return Consultation(
      id: map['id'] as String,
      doctorId: map['doctorId'] as String,
      patientId: map['patientId'] as String,
      startTime: DateTime.parse(map['startTime'] as String),
      endTime: map['endTime'] != null
          ? DateTime.parse(map['endTime'] as String)
          : null,
      consultationCode: map['consultationCode'] as String,
      isPublic: map['isPublic'] as bool? ?? false,
      notes: map['notes'] as String?,
      diagnosis: map['diagnosis'] as String?,
      treatment: map['treatment'] as String?,
      followUpDate: map['followUpDate'] != null
          ? DateTime.parse(map['followUpDate'] as String)
          : null,
      createdAt: DateTime.parse(map['createdAt'] as String),
      updatedAt: DateTime.parse(map['updatedAt'] as String),
    );
  }

  @override
  List<Object?> get props => [
        id,
        doctorId,
        patientId,
        startTime,
        endTime,
        consultationCode,
        isPublic,
        notes,
        diagnosis,
        treatment,
        followUpDate,
        createdAt,
        updatedAt,
      ];
}
