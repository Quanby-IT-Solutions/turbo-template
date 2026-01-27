import 'package:mobile/domain/entities/appointment.dart';

class AppointmentUtils {
  /// Filter appointments by status and date
  static List<Appointment> filterAppointments(
    List<Appointment> appointments,
    String filterType,
  ) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final tomorrow = today.add(const Duration(days: 1));

    switch (filterType) {
      case 'pending':
        return appointments.where((a) => a.isPending).toList();
      case 'today':
        return appointments
            .where(
              (a) =>
                  a.isConfirmed &&
                  a.scheduledAt.isAfter(today) &&
                  a.scheduledAt.isBefore(tomorrow),
            )
            .toList();
      case 'upcoming':
        return appointments
            .where((a) => a.isConfirmed && a.scheduledAt.isAfter(tomorrow))
            .toList();
      default:
        return [];
    }
  }

  /// Format DateTime to readable string
  static String formatDateTime(DateTime dateTime) {
    final months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    final hour = dateTime.hour > 12 ? dateTime.hour - 12 : dateTime.hour;
    final ampm = dateTime.hour >= 12 ? 'PM' : 'AM';
    return '${months[dateTime.month - 1]} ${dateTime.day}, $hour:${dateTime.minute.toString().padLeft(2, '0')} $ampm';
  }
}

// Extension to copy appointment with new status
extension AppointmentExtension on Appointment {
  Appointment copyWith({String? status, DateTime? scheduledAt}) {
    return Appointment(
      id: id,
      patientId: patientId,
      doctorId: doctorId,
      patientName: patientName,
      doctorName: doctorName,
      scheduledAt: scheduledAt ?? this.scheduledAt,
      status: status ?? this.status,
      type: type,
      reasonForVisit: reasonForVisit,
      notes: notes,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}