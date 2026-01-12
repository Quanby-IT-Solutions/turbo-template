import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/data/repositories/doctor_repository.dart';
import 'package:mobile/data/repositories/patient_repository.dart';
import 'package:mobile/data/repositories/appointment_repository.dart';
import 'package:mobile/domain/entities/doctor.dart';
import 'package:mobile/domain/entities/patient.dart';
import 'package:mobile/domain/entities/appointment.dart';
import 'package:mobile/presentation/auth/providers/auth_providers.dart';
import 'package:mobile/presentation/patient/providers/patient_providers.dart';

/// Doctor repository provider
final doctorRepositoryProvider = Provider<DoctorRepository>((ref) {
  return DoctorRepository();
});

/// Current doctor provider (for logged-in doctor)
final currentDoctorProvider = FutureProvider<Doctor?>((ref) async {
  final user = ref.watch(currentUserProvider);
  if (user == null || !user.isDoctor) {
    return null;
  }

  final repository = ref.watch(doctorRepositoryProvider);
  try {
    return await repository.getDoctor(user.id);
  } catch (e) {
    return null;
  }
});

/// Doctor by ID provider
final doctorByIdProvider = FutureProvider.family<Doctor, String>(
  (ref, doctorId) async {
    final repository = ref.watch(doctorRepositoryProvider);
    return await repository.getDoctor(doctorId);
  },
);

/// Doctor's patients list provider
final doctorPatientsProvider = FutureProvider.family<List<Patient>, PatientListParams>(
  (ref, params) async {
    final repository = PatientRepository();
    return await repository.getPatients(
      search: params.search,
      page: params.page,
      limit: params.limit,
    );
  },
);

/// Doctor's appointments provider
final doctorAppointmentsProvider = FutureProvider.family<List<Appointment>, AppointmentListParams>(
  (ref, params) async {
    final repository = AppointmentRepository();
    return await repository.getAppointments(
      status: params.status,
      limit: params.limit,
    );
  },
);

/// Parameters for appointment list queries
class AppointmentListParams {
  final String? status;
  final int? limit;

  const AppointmentListParams({
    this.status,
    this.limit,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AppointmentListParams &&
          runtimeType == other.runtimeType &&
          status == other.status &&
          limit == other.limit;

  @override
  int get hashCode => status.hashCode ^ limit.hashCode;
}
