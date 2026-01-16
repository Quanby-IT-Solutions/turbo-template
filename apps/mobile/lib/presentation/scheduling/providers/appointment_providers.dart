import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/data/repositories/appointment_repository.dart';
import 'package:mobile/domain/entities/appointment.dart';

// ==================
// Repository Provider
// ==================

/// Appointment repository provider
final appointmentRepositoryProvider = Provider<AppointmentRepository>((ref) {
  return AppointmentRepository();
});

// ==================
// Appointments List Provider
// ==================

/// Notifier for managing appointments list
class AppointmentsListNotifier extends AsyncNotifier<List<Appointment>> {
  AppointmentRepository get _repository =>
      ref.read(appointmentRepositoryProvider);

  @override
  Future<List<Appointment>> build() async {
    // Initially load all appointments
    return _fetchAppointments();
  }

  /// Fetch appointments with optional filters
  Future<List<Appointment>> _fetchAppointments({
    String? status,
    int? limit,
  }) async {
    try {
      return await _repository.getAppointments(status: status, limit: limit);
    } catch (e) {
      throw Exception('Failed to load appointments: ${e.toString()}');
    }
  }

  /// Refresh appointments list
  Future<void> refresh({String? status, int? limit}) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      return _fetchAppointments(status: status, limit: limit);
    });
  }

  /// Filter appointments by status
  Future<void> filterByStatus(String? status) async {
    await refresh(status: status);
  }

  /// Add a newly created appointment to the list
  void addAppointment(Appointment appointment) {
    state.whenData((appointments) {
      state = AsyncData([appointment, ...appointments]);
    });
  }

  /// Update an appointment in the list
  void updateAppointment(Appointment updatedAppointment) {
    state.whenData((appointments) {
      final updatedList = appointments.map((appointment) {
        return appointment.id == updatedAppointment.id
            ? updatedAppointment
            : appointment;
      }).toList();
      state = AsyncData(updatedList);
    });
  }

  /// Remove an appointment from the list
  void removeAppointment(String appointmentId) {
    state.whenData((appointments) {
      final updatedList = appointments
          .where((appointment) => appointment.id != appointmentId)
          .toList();
      state = AsyncData(updatedList);
    });
  }
}

/// Provider for appointments list
final appointmentsListProvider =
    AsyncNotifierProvider<AppointmentsListNotifier, List<Appointment>>(
      AppointmentsListNotifier.new,
    );

// ==================
// Doctor Availability Provider
// ==================

/// State for doctor availability
class AvailabilityState {
  final List<TimeSlot> slots;
  final String doctorId;
  final DateTime date;

  AvailabilityState({
    required this.slots,
    required this.doctorId,
    required this.date,
  });

  AvailabilityState copyWith({
    List<TimeSlot>? slots,
    String? doctorId,
    DateTime? date,
  }) {
    return AvailabilityState(
      slots: slots ?? this.slots,
      doctorId: doctorId ?? this.doctorId,
      date: date ?? this.date,
    );
  }
}

/// Notifier for managing doctor availability
class AvailabilitySlotsNotifier extends AsyncNotifier<AvailabilityState?> {
  AppointmentRepository get _repository =>
      ref.read(appointmentRepositoryProvider);

  @override
  Future<AvailabilityState?> build() async {
    // Initially null - will be loaded when user selects a doctor/date
    return null;
  }

  /// Fetch available slots for a doctor on a specific date
  Future<void> fetchAvailability({
    required String doctorId,
    required DateTime date,
  }) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final slots = await _repository.getDoctorAvailability(
        doctorId: doctorId,
        date: date,
      );
      return AvailabilityState(slots: slots, doctorId: doctorId, date: date);
    });
  }

  /// Clear availability data
  void clear() {
    state = const AsyncData(null);
  }
}

/// Provider for doctor availability
final availabilitySlotsProvider =
    AsyncNotifierProvider<AvailabilitySlotsNotifier, AvailabilityState?>(
      AvailabilitySlotsNotifier.new,
    );

// ==================
// Appointment Booking Provider
// ==================

/// State for appointment booking flow
class BookingState {
  final bool isLoading;
  final Appointment? createdAppointment;
  final String? error;

  const BookingState({
    this.isLoading = false,
    this.createdAppointment,
    this.error,
  });

  BookingState copyWith({
    bool? isLoading,
    Appointment? createdAppointment,
    String? error,
  }) {
    return BookingState(
      isLoading: isLoading ?? this.isLoading,
      createdAppointment: createdAppointment ?? this.createdAppointment,
      error: error,
    );
  }

  factory BookingState.loading() {
    return const BookingState(isLoading: true);
  }

  factory BookingState.success(Appointment appointment) {
    return BookingState(createdAppointment: appointment);
  }

  factory BookingState.error(String error) {
    return BookingState(error: error);
  }

  factory BookingState.idle() {
    return const BookingState();
  }
}

/// Notifier for managing appointment booking
class AppointmentBookingNotifier extends Notifier<BookingState> {
  AppointmentRepository get _repository =>
      ref.read(appointmentRepositoryProvider);

  @override
  BookingState build() {
    return BookingState.idle();
  }

  /// Book a new appointment
  /// Book a new appointment
  Future<Appointment?> bookAppointment({
    required String doctorId,
    required DateTime scheduledAt,
    String? reason,
    String? priority,
    String? notes,
  }) async {
    state = BookingState.loading();

    try {
      final appointment = await _repository.createAppointment(
        doctorId: doctorId,
        scheduledAt: scheduledAt.toIso8601String(),
        reason: reason,
        priority: priority,
        notes: notes,
      );

      state = BookingState.success(appointment);

      // Add to appointments list
      ref.read(appointmentsListProvider.notifier).addAppointment(appointment);

      return appointment;
    } catch (e) {
      // Extract clean error message from Exception
      String errorMessage = e.toString();
      if (errorMessage.startsWith('Exception: ')) {
        errorMessage = errorMessage.substring('Exception: '.length);
      }

      state = BookingState.error(errorMessage);
      return null;
    }
  }

  /// Reset booking state
  void reset() {
    state = BookingState.idle();
  }
}

/// Provider for appointment booking
final appointmentBookingProvider =
    NotifierProvider<AppointmentBookingNotifier, BookingState>(
      AppointmentBookingNotifier.new,
    );

// ==================
// Appointment Actions Provider
// ==================

/// Notifier for managing appointment actions (update status, cancel)
class AppointmentActionsNotifier extends Notifier<AsyncValue<void>> {
  AppointmentRepository get _repository =>
      ref.read(appointmentRepositoryProvider);

  @override
  AsyncValue<void> build() {
    return const AsyncData(null);
  }

  /// Update appointment status
  Future<void> updateStatus({
    required String appointmentId,
    required String status,
    String? notes,
  }) async {
    state = const AsyncLoading();

    try {
      final updatedAppointment = await _repository.updateAppointmentStatus(
        id: appointmentId,
        status: status,
        notes: notes,
      );

      // Update in appointments list
      ref
          .read(appointmentsListProvider.notifier)
          .updateAppointment(updatedAppointment);

      state = const AsyncData(null);
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
    }
  }

  /// Cancel an appointment
  Future<void> cancelAppointment({
    required String appointmentId,
    String? cancellationReason,
  }) async {
    state = const AsyncLoading();

    try {
      await _repository.cancelAppointment(
        id: appointmentId,
        cancellationReason: cancellationReason,
      );

      // Remove from appointments list or update status
      ref
          .read(appointmentsListProvider.notifier)
          .removeAppointment(appointmentId);

      state = const AsyncData(null);
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
    }
  }

  /// Reset state
  void reset() {
    state = const AsyncData(null);
  }
}

/// Provider for appointment actions
final appointmentActionsProvider =
    NotifierProvider<AppointmentActionsNotifier, AsyncValue<void>>(
      AppointmentActionsNotifier.new,
    );

// ==================
// Doctor Weekly Availability Provider
// ==================

/// Provider for doctor's weekly availability
final doctorWeeklyAvailabilityProvider =
    FutureProvider.family<List<DoctorAvailability>, String>((
      ref,
      doctorId,
    ) async {
      final repository = ref.read(appointmentRepositoryProvider);
      return repository.getDoctorWeeklyAvailability(doctorId);
    });

// ==================
// Available Time Slots Provider
// ==================

/// Parameters for available slots query
class AvailableSlotsParams {
  final String doctorId;
  final String date;

  AvailableSlotsParams({required this.doctorId, required this.date});

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AvailableSlotsParams &&
          runtimeType == other.runtimeType &&
          doctorId == other.doctorId &&
          date == other.date;

  @override
  int get hashCode => doctorId.hashCode ^ date.hashCode;
}

/// Provider for available time slots on a specific date
final availableSlotsProvider =
    FutureProvider.family<List<String>, AvailableSlotsParams>((
      ref,
      params,
    ) async {
      final repository = ref.read(appointmentRepositoryProvider);
      return repository.getDoctorAvailableSlots(
        doctorId: params.doctorId,
        date: params.date,
      );
    });
