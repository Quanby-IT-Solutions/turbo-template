import 'package:equatable/equatable.dart';

class MedicalRecord extends Equatable {
  final String id;
  final String patientId;
  final String? doctorId;
  final String type; // consultation, prescription, diagnosis, referral, lab_request
  final String title;
  final String? description;
  final Map<String, dynamic> data;
  final DateTime createdAt;
  final DateTime? updatedAt;

  const MedicalRecord({
    required this.id,
    required this.patientId,
    this.doctorId,
    required this.type,
    required this.title,
    this.description,
    required this.data,
    required this.createdAt,
    this.updatedAt,
  });

  @override
  List<Object?> get props => [
        id,
        patientId,
        doctorId,
        type,
        title,
        description,
        data,
        createdAt,
        updatedAt,
      ];
}

class Prescription extends Equatable {
  final String id;
  final String patientId;
  final String doctorId;
  final String medicationName;
  final String dosage;
  final String frequency;
  final int duration; // in days
  final String instructions;
  final DateTime prescribedAt;
  final DateTime? expiresAt;

  const Prescription({
    required this.id,
    required this.patientId,
    required this.doctorId,
    required this.medicationName,
    required this.dosage,
    required this.frequency,
    required this.duration,
    required this.instructions,
    required this.prescribedAt,
    this.expiresAt,
  });

  @override
  List<Object?> get props => [
        id,
        patientId,
        doctorId,
        medicationName,
        dosage,
        frequency,
        duration,
        instructions,
        prescribedAt,
        expiresAt,
      ];
}

class VitalSigns extends Equatable {
  final String id;
  final String patientId;
  final double? heartRate;
  final double? bloodPressureSystolic;
  final double? bloodPressureDiastolic;
  final double? temperature; // in Celsius
  final double? oxygenSaturation;
  final double? weight; // in kg
  final double? height; // in cm
  final DateTime recordedAt;
  final String source; // self_check, doctor_visit, device

  const VitalSigns({
    required this.id,
    required this.patientId,
    this.heartRate,
    this.bloodPressureSystolic,
    this.bloodPressureDiastolic,
    this.temperature,
    this.oxygenSaturation,
    this.weight,
    this.height,
    required this.recordedAt,
    required this.source,
  });

  String get bloodPressure =>
      (bloodPressureSystolic != null && bloodPressureDiastolic != null)
          ? '${bloodPressureSystolic!.toInt()}/${bloodPressureDiastolic!.toInt()}'
          : 'N/A';

  @override
  List<Object?> get props => [
        id,
        patientId,
        heartRate,
        bloodPressureSystolic,
        bloodPressureDiastolic,
        temperature,
        oxygenSaturation,
        weight,
        height,
        recordedAt,
        source,
      ];
}
