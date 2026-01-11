import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppConstants {
  // App Info
  static const String appName = 'Q-Health';
  static const String appVersion = '1.0.0';

  // API Endpoints - loaded from .env
  static String get baseUrl => dotenv.env['BACKEND_API_URL'] ?? 'http://localhost:3000';

  // User Types
  static const String doctorRole = 'doctor';
  static const String patientRole = 'patient';

  // Appointment Status
  static const String pendingStatus = 'pending';
  static const String confirmedStatus = 'confirmed';
  static const String completedStatus = 'completed';
  static const String cancelledStatus = 'cancelled';
  static const String rescheduledStatus = 'rescheduled';

  // Verification Status
  static const String verifiedStatus = 'verified';
  static const String pendingVerificationStatus = 'pending_verification';
  static const String rejectedStatus = 'rejected';

  // Animation Durations
  static const Duration shortAnimation = Duration(milliseconds: 300);
  static const Duration mediumAnimation = Duration(milliseconds: 500);

  // UI Constants
  static const double defaultPadding = 16.0;
  static const double smallPadding = 8.0;
  static const double largePadding = 24.0;
  static const double borderRadius = 12.0;
  static const double cardElevation = 4.0;
}
