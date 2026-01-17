import 'package:dio/dio.dart';
import 'package:mobile/core/services/http_service.dart';
import 'package:mobile/domain/entities/appointment.dart';

/// Appointment repository for backend integration
/// Handles all appointment-related API calls and data transformation
class AppointmentRepository {
  /// Create a new appointment
  Future<Appointment> createAppointment({
    required String doctorId,
    required String scheduledAt,
    String? reason,
    String? priority,
    String? notes,
  }) async {
    try {
      final response = await HttpService.createAppointment(
        doctorId: doctorId,
        scheduledAt: scheduledAt,
        reason: reason,
        priority: priority,
        notes: notes,
      );

      return _parseAppointment(response);
    } on DioException catch (e) {
      // Extract backend error message
      final errorMessage =
          e.response?.data?['message'] ??
          e.response?.data?['error'] ??
          'Failed to create appointment';
      throw Exception(errorMessage);
    } catch (e) {
      throw Exception('Failed to create appointment: ${e.toString()}');
    }
  }

  /// Get doctor's weekly availability schedule
  Future<List<DoctorAvailability>> getDoctorWeeklyAvailability(
    String doctorId,
  ) async {
    try {
      final response = await HttpService.getDoctorAvailability(
        doctorId: doctorId,
        date: '', // Not needed for weekly availability endpoint
      );

      // Backend returns array of availability by day
      final List<dynamic> availabilityList = response as List<dynamic>;
      return availabilityList
          .map(
            (json) => DoctorAvailability.fromJson(json as Map<String, dynamic>),
          )
          .toList();
    } on DioException catch (e) {
      throw Exception('Failed to get doctor availability: ${e.toString()}');
    }
  }

  /// Get available time slots for a specific date
  /// Get available time slots for a specific date
  Future<List<String>> getDoctorAvailableSlots({
    required String doctorId,
    required String date,
  }) async {
    try {
      final response = await HttpService.getDoctorAvailableSlots(
        doctorId: doctorId,
        date: date,
      );

      // Backend returns: { success: true, data: ["09:00", "09:30", ...] }
      if (response is Map && response['data'] != null) {
        return List<String>.from(response['data'] as List);
      } else if (response is List) {
        return List<String>.from(response);
      }

      return [];
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        // Doctor not available on this date
        return [];
      }
      throw Exception('Failed to get available slots: ${e.toString()}');
    }
  }

  /// Get appointments for the current user
  Future<List<Appointment>> getAppointments({
    String? status,
    int? limit,
  }) async {
    try {
      final response = await HttpService.getAppointments(
        status: status,
        limit: limit,
      );

      // Backend returns: {items: [...], count: X} or {appointments: [...], meta: {...}}
      final List<dynamic> appointmentsList;
      if (response['items'] != null) {
        appointmentsList = response['items'] as List<dynamic>;
      } else if (response['appointments'] != null) {
        appointmentsList = response['appointments'] as List<dynamic>;
      } else {
        appointmentsList = [];
      }

      return appointmentsList
          .map((json) => _parseAppointment(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      throw Exception('Failed to get appointments: ${e.toString()}');
    }
  }

  /// Get a single appointment by ID
  Future<Appointment> getAppointment(String id) async {
    try {
      final response = await HttpService.getAppointment(id);
      // Backend may wrap in {appointment: {...}} or return directly
      final appointmentData = response['appointment'] ?? response;
      return _parseAppointment(appointmentData as Map<String, dynamic>);
    } catch (e) {
      throw Exception('Failed to get appointment: ${e.toString()}');
    }
  }

  /// Get available time slots for a doctor on a specific date
  Future<List<TimeSlot>> getDoctorAvailability({
    required String doctorId,
    required DateTime date,
  }) async {
    try {
      // Format date as YYYY-MM-DD
      final dateString = date.toIso8601String().split('T').first;
      final response = await HttpService.getDoctorAvailability(
        doctorId: doctorId,
        date: dateString,
      );

      // Backend returns: {timeSlots: [{start_time, end_time, is_available}]} or {slots: [...]}
      final List<dynamic> slotsList;
      if (response['timeSlots'] != null) {
        slotsList = response['timeSlots'] as List<dynamic>;
      } else if (response['slots'] != null) {
        slotsList = response['slots'] as List<dynamic>;
      } else {
        slotsList = [];
      }

      return slotsList
          .map((json) => _parseTimeSlot(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      throw Exception('Failed to get availability: ${e.toString()}');
    }
  }

  /// Update appointment status
  Future<Appointment> updateAppointmentStatus({
    required String id,
    required String status,
    String? notes,
  }) async {
    try {
      final response = await HttpService.updateAppointmentStatus(
        id: id,
        status: status,
        notes: notes,
      );

      final appointmentData = response['appointment'] ?? response;
      return _parseAppointment(appointmentData as Map<String, dynamic>);
    } catch (e) {
      throw Exception('Failed to update appointment: ${e.toString()}');
    }
  }

  /// Cancel an appointment
  Future<void> cancelAppointment({
    required String id,
    String? cancellationReason,
  }) async {
    try {
      await HttpService.cancelAppointment(
        id: id,
        cancellationReason: cancellationReason,
      );
    } catch (e) {
      throw Exception('Failed to cancel appointment: ${e.toString()}');
    }
  }

  /// Propose a reschedule for an appointment
  Future<Map<String, dynamic>> proposeReschedule({
    required String appointmentId,
    required String newDate,
    required String newTime,
    required String reason,
    String? notes,
  }) async {
    try {
      return await HttpService.proposeReschedule(
        appointmentId: appointmentId,
        newDate: newDate,
        newTime: newTime,
        reason: reason,
        notes: notes,
      );
    } catch (e) {
      throw Exception('Failed to propose reschedule: ${e.toString()}');
    }
  }

  /// Respond to a reschedule request
  Future<Map<String, dynamic>> respondToReschedule({
    required String appointmentId,
    required String requestId,
    required bool approve,
    String? notes,
  }) async {
    try {
      return await HttpService.respondToReschedule(
        appointmentId: appointmentId,
        requestId: requestId,
        response: approve ? 'APPROVED' : 'REJECTED',
        notes: notes,
      );
    } catch (e) {
      throw Exception('Failed to respond to reschedule: ${e.toString()}');
    }
  }

  /// Get reschedule history for an appointment
  Future<List<Map<String, dynamic>>> getRescheduleHistory(
    String appointmentId,
  ) async {
    try {
      final response = await HttpService.getRescheduleHistory(appointmentId);
      // Backend may return array directly or wrapped in object
      if (response is List) {
        return (response as List<dynamic>)
            .map((e) => e as Map<String, dynamic>)
            .toList();
      } else if (response['items'] != null) {
        return (response['items'] as List<dynamic>)
            .map((e) => e as Map<String, dynamic>)
            .toList();
      } else if (response['history'] != null) {
        return (response['history'] as List<dynamic>)
            .cast<Map<String, dynamic>>();
      }
      return [];
    } catch (e) {
      throw Exception('Failed to get reschedule history: ${e.toString()}');
    }
  }

  /// Parse appointment from API response
  Appointment _parseAppointment(Map<String, dynamic> json) {
    // Handle various backend response formats
    final id = json['id'] as String;
    final patientId = json['patientId'] ?? json['patient_id'] ?? '';
    final doctorId = json['doctorId'] ?? json['doctor_id'] ?? '';

    // Parse scheduled date
    final scheduledAtStr =
        json['scheduledAt'] ??
        json['scheduled_at'] ??
        json['requestedDate'] ??
        json['requested_date'];
    final scheduledAt = scheduledAtStr != null
        ? DateTime.parse(scheduledAtStr as String)
        : DateTime.now();

    // Status mapping (backend may use uppercase or lowercase)
    final rawStatus = (json['status'] as String? ?? 'pending').toUpperCase();
    String status;
    switch (rawStatus) {
      case 'PENDING':
      case 'SCHEDULED':
        status = 'pending';
        break;
      case 'CONFIRMED':
        status = 'confirmed';
        break;
      case 'COMPLETED':
        status = 'completed';
        break;
      case 'CANCELLED':
      case 'REJECTED':
        status = 'cancelled';
        break;
      case 'RESCHEDULED':
        status = 'rescheduled';
        break;
      default:
        status = 'pending';
    }

    // Type mapping
    final rawType = json['type'] as String? ?? 'video_call';
    final type = rawType.toLowerCase().replaceAll('_', '_');

    final reason =
        json['reason'] as String? ?? json['reasonForVisit'] as String?;
    final notes = json['notes'] as String?;
    final priority = json['priority'] as String?;

    final createdAtStr =
        json['createdAt'] ??
        json['created_at'] ??
        json['timestamps']?['createdAt'];
    final createdAt = createdAtStr != null
        ? DateTime.parse(createdAtStr as String)
        : DateTime.now();

    final updatedAtStr =
        json['updatedAt'] ??
        json['updated_at'] ??
        json['timestamps']?['updatedAt'];
    final updatedAt = updatedAtStr != null
        ? DateTime.parse(updatedAtStr as String)
        : null;

    // Parse patient/doctor names
    String patientName = json['patientName'] as String? ?? 'Patient $patientId';
    String doctorName = json['doctorName'] as String? ?? 'Doctor $doctorId';

    // Parse doctor info if available
    DoctorInfo? doctorInfo;
    if (json['doctor'] != null) {
      final doctorJson = json['doctor'] as Map<String, dynamic>;
      final doctorInfoJson = doctorJson['doctorInfo'] as Map<String, dynamic>?;
      if (doctorInfoJson != null) {
        doctorName =
            '${doctorInfoJson['firstName'] ?? ''} ${doctorInfoJson['lastName'] ?? ''}'
                .trim();
        if (doctorName.isEmpty) {
          doctorName = json['doctorName'] as String? ?? 'Doctor $doctorId';
        }
        doctorInfo = DoctorInfo(
          firstName: doctorInfoJson['firstName'] as String? ?? '',
          lastName: doctorInfoJson['lastName'] as String? ?? '',
          specialization: doctorInfoJson['specialization'] as String?,
          email: doctorJson['email'] as String?,
        );
      } else if (doctorJson['email'] != null) {
        doctorInfo = DoctorInfo(
          firstName: doctorJson['firstName'] as String? ?? '',
          lastName: doctorJson['lastName'] as String? ?? '',
          specialization: doctorJson['specialization'] as String?,
          email: doctorJson['email'] as String?,
        );
      }
    }

    // Parse reschedule requests
    List<RescheduleRequest>? rescheduleRequests;
    if (json['rescheduleRequests'] != null) {
      final requestsList = json['rescheduleRequests'] as List<dynamic>;
      rescheduleRequests = requestsList.map((reqJson) {
        final req = reqJson as Map<String, dynamic>;
        return RescheduleRequest(
          id: req['id'] as String,
          appointmentId: req['appointmentId'] as String? ?? id,
          requestedBy: req['requestedBy'] as String? ?? '',
          requestedByRole: req['requestedByRole'] as String? ?? 'PATIENT',
          currentDate: req['currentDate'] as String?,
          currentTime: req['currentTime'] as String?,
          newDate: req['newDate'] as String,
          newTime: req['newTime'] as String,
          reason: req['reason'] as String? ?? '',
          notes: req['notes'] as String?,
          status: (req['status'] as String? ?? 'PENDING').toUpperCase(),
          createdAt: DateTime.parse(req['createdAt'] as String),
          updatedAt: DateTime.parse(req['updatedAt'] as String),
        );
      }).toList();
    }

    return Appointment(
      id: id,
      patientId: patientId,
      doctorId: doctorId,
      patientName: patientName,
      doctorName: doctorName,
      scheduledAt: scheduledAt,
      status: status,
      type: type,
      reasonForVisit: reason,
      notes: notes,
      priority: priority,
      createdAt: createdAt,
      updatedAt: updatedAt,
      rescheduleRequests: rescheduleRequests,
      doctor: doctorInfo,
    );
  }

  /// Parse time slot from API response
  TimeSlot _parseTimeSlot(Map<String, dynamic> json) {
    // Backend may use snake_case or camelCase
    final startTime =
        json['startTime'] ??
        json['start_time'] ??
        json['start'] ??
        json['label'];
    final isAvailable = json['isAvailable'] ?? json['is_available'] ?? true;

    DateTime? start;
    if (startTime is String) {
      try {
        start = DateTime.parse(startTime);
      } catch (e) {
        // If it's just a time string like "09:00", we'll use it as label
        start = null;
      }
    }

    return TimeSlot(
      startTime: start ?? DateTime.now(),
      label: json['label'] as String? ?? startTime?.toString() ?? '',
      isAvailable: isAvailable as bool,
    );
  }
}

/// Time slot model for doctor availability
class TimeSlot {
  final DateTime startTime;
  final String label;
  final bool isAvailable;

  TimeSlot({
    required this.startTime,
    required this.label,
    required this.isAvailable,
  });
}

/// Doctor availability model
class DoctorAvailability {
  final String dayOfWeek;
  final bool isAvailable;
  final String? startTime;
  final String? endTime;

  DoctorAvailability({
    required this.dayOfWeek,
    required this.isAvailable,
    this.startTime,
    this.endTime,
  });

  factory DoctorAvailability.fromJson(Map<String, dynamic> json) {
    return DoctorAvailability(
      dayOfWeek: json['dayOfWeek'] as String,
      isAvailable: json['isAvailable'] as bool,
      startTime: json['startTime'] as String?,
      endTime: json['endTime'] as String?,
    );
  }

  /// Helper to get day index (0 = Sunday, 6 = Saturday)
  int get dayIndex {
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    return days.indexOf(dayOfWeek);
  }
}
