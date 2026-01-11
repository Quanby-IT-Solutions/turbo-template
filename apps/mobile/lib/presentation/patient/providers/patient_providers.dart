import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/data/repositories/patient_repository.dart';
import 'package:mobile/data/repositories/medical_record_repository.dart';
import 'package:mobile/data/repositories/prescription_repository.dart';
import 'package:mobile/data/repositories/consultation_repository.dart';
import 'package:mobile/domain/entities/patient.dart';
import 'package:mobile/domain/entities/medical_record.dart';
import 'package:mobile/domain/entities/consultation.dart';
import 'package:mobile/presentation/auth/providers/auth_providers.dart';

/// Patient repository provider
final patientRepositoryProvider = Provider<PatientRepository>((ref) {
  return PatientRepository();
});

/// Medical record repository provider
final medicalRecordRepositoryProvider = Provider<MedicalRecordRepository>((ref) {
  return MedicalRecordRepository();
});

/// Prescription repository provider
final prescriptionRepositoryProvider = Provider<PrescriptionRepository>((ref) {
  return PrescriptionRepository();
});

/// Consultation repository provider
final consultationRepositoryProvider = Provider<ConsultationRepository>((ref) {
  return ConsultationRepository();
});

/// Current patient provider (for logged-in patient)
final currentPatientProvider = FutureProvider<Patient?>((ref) async {
  final user = await ref.watch(currentUserProvider.future);
  if (user == null || !user.isPatient) {
    return null;
  }

  final repository = ref.watch(patientRepositoryProvider);
  try {
    return await repository.getPatient(user.id);
  } catch (e) {
    return null;
  }
});

/// Patients list provider (for doctors/admins)
final patientsListProvider = FutureProvider.family<List<Patient>, PatientListParams>(
  (ref, params) async {
    final repository = ref.watch(patientRepositoryProvider);
    return await repository.getPatients(
      search: params.search,
      page: params.page,
      limit: params.limit,
    );
  },
);

/// Patient by ID provider
final patientByIdProvider = FutureProvider.family<Patient, String>(
  (ref, patientId) async {
    final repository = ref.watch(patientRepositoryProvider);
    return await repository.getPatient(patientId);
  },
);

/// Parameters for patient list queries
class PatientListParams {
  final String? search;
  final int? page;
  final int? limit;

  const PatientListParams({
    this.search,
    this.page,
    this.limit,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PatientListParams &&
          runtimeType == other.runtimeType &&
          search == other.search &&
          page == other.page &&
          limit == other.limit;

  @override
  int get hashCode => search.hashCode ^ page.hashCode ^ limit.hashCode;
}

/// Patient medical records provider
final patientMedicalRecordsProvider = FutureProvider.family<List<MedicalRecord>, String?>(
  (ref, patientId) async {
    final repository = ref.watch(medicalRecordRepositoryProvider);
    return await repository.getMedicalRecords(patientId: patientId);
  },
);

/// Patient prescriptions provider
final patientPrescriptionsProvider = FutureProvider.family<List<Prescription>, PrescriptionListParams>(
  (ref, params) async {
    final repository = ref.watch(prescriptionRepositoryProvider);
    return await repository.getPrescriptions(
      patientId: params.patientId,
      isActive: params.isActive,
      page: params.page,
      limit: params.limit,
    );
  },
);

/// Patient consultations provider
final patientConsultationsProvider = FutureProvider.family<List<Consultation>, ConsultationListParams>(
  (ref, params) async {
    final repository = ref.watch(consultationRepositoryProvider);
    return await repository.getConsultations(
      patientId: params.patientId,
      page: params.page,
      limit: params.limit,
    );
  },
);

/// Parameters for prescription list queries
class PrescriptionListParams {
  final String? patientId;
  final bool? isActive;
  final int? page;
  final int? limit;

  const PrescriptionListParams({
    this.patientId,
    this.isActive,
    this.page,
    this.limit,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PrescriptionListParams &&
          runtimeType == other.runtimeType &&
          patientId == other.patientId &&
          isActive == other.isActive &&
          page == other.page &&
          limit == other.limit;

  @override
  int get hashCode => patientId.hashCode ^ isActive.hashCode ^ page.hashCode ^ limit.hashCode;
}

/// Parameters for consultation list queries
class ConsultationListParams {
  final String? patientId;
  final String? doctorId;
  final int? page;
  final int? limit;

  const ConsultationListParams({
    this.patientId,
    this.doctorId,
    this.page,
    this.limit,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ConsultationListParams &&
          runtimeType == other.runtimeType &&
          patientId == other.patientId &&
          doctorId == other.doctorId &&
          page == other.page &&
          limit == other.limit;

  @override
  int get hashCode => patientId.hashCode ^ doctorId.hashCode ^ page.hashCode ^ limit.hashCode;
}
