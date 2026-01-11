import 'package:equatable/equatable.dart';

class MedicalRecord extends Equatable {
  final String id;
  final String patientId;
  final String? consultationId;
  final String recordType; // CONSULTATION_NOTES, DIAGNOSIS, TREATMENT_PLAN, etc.
  final String title;
  final String content;
  final bool isPublic;
  final bool isSensitive;
  final String createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  const MedicalRecord({
    required this.id,
    required this.patientId,
    this.consultationId,
    required this.recordType,
    required this.title,
    required this.content,
    required this.isPublic,
    required this.isSensitive,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
  });

  factory MedicalRecord.fromMap(Map<String, dynamic> map) {
    return MedicalRecord(
      id: map['id'] as String,
      patientId: map['patientId'] as String,
      consultationId: map['consultationId'] as String?,
      recordType: map['recordType'] as String,
      title: map['title'] as String,
      content: map['content'] as String,
      isPublic: map['isPublic'] as bool? ?? false,
      isSensitive: map['isSensitive'] as bool? ?? false,
      createdBy: map['createdBy'] as String,
      createdAt: DateTime.parse(map['createdAt'] as String),
      updatedAt: DateTime.parse(map['updatedAt'] as String),
    );
  }

  @override
  List<Object?> get props => [
        id,
        patientId,
        consultationId,
        recordType,
        title,
        content,
        isPublic,
        isSensitive,
        createdBy,
        createdAt,
        updatedAt,
      ];
}

class Prescription extends Equatable {
  final String id;
  final String patientId;
  final String doctorId;
  final String? consultationId;
  final String medicationName;
  final String dosage;
  final String frequency;
  final String duration; // e.g., "7 days", "1 month"
  final String? instructions;
  final int? quantity;
  final int refills;
  final bool isActive;
  final DateTime prescribedAt;
  final DateTime? expiresAt;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Prescription({
    required this.id,
    required this.patientId,
    required this.doctorId,
    this.consultationId,
    required this.medicationName,
    required this.dosage,
    required this.frequency,
    required this.duration,
    this.instructions,
    this.quantity,
    required this.refills,
    required this.isActive,
    required this.prescribedAt,
    this.expiresAt,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Prescription.fromMap(Map<String, dynamic> map) {
    return Prescription(
      id: map['id'] as String,
      patientId: map['patientId'] as String,
      doctorId: map['doctorId'] as String,
      consultationId: map['consultationId'] as String?,
      medicationName: map['medicationName'] as String,
      dosage: map['dosage'] as String,
      frequency: map['frequency'] as String,
      duration: map['duration'] as String,
      instructions: map['instructions'] as String?,
      quantity: (map['quantity'] as num?)?.toInt(),
      refills: (map['refills'] as num?)?.toInt() ?? 0,
      isActive: map['isActive'] as bool? ?? true,
      prescribedAt: DateTime.parse(map['prescribedAt'] as String),
      expiresAt: map['expiresAt'] != null
          ? DateTime.parse(map['expiresAt'] as String)
          : null,
      notes: map['notes'] as String?,
      createdAt: DateTime.parse(map['createdAt'] as String),
      updatedAt: DateTime.parse(map['updatedAt'] as String),
    );
  }

  @override
  List<Object?> get props => [
        id,
        patientId,
        doctorId,
        consultationId,
        medicationName,
        dosage,
        frequency,
        duration,
        instructions,
        quantity,
        refills,
        isActive,
        prescribedAt,
        expiresAt,
        notes,
        createdAt,
        updatedAt,
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
