import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/domain/entities/appointment.dart';
import 'package:mobile/presentation/auth/screens/login_screen.dart';
import 'package:mobile/presentation/auth/screens/signup_screen.dart';
import 'package:mobile/presentation/auth/screens/two_factor_screen.dart';
import 'package:mobile/presentation/auth/screens/mfa_verification_screen.dart';
import 'package:mobile/presentation/auth/screens/credential_upload_screen.dart';
import 'package:mobile/presentation/auth/screens/kyc_verification_screen.dart';
import 'package:mobile/presentation/auth/screens/philhealth_id_upload_screen.dart';
import 'package:mobile/presentation/onboarding/onboarding_screen.dart';
import 'package:mobile/presentation/profile/screens/profile_screen.dart';
import 'package:mobile/presentation/profile/screens/profile_edit_screen.dart';
import 'package:mobile/presentation/scheduling/screens/appointment_requests_screen.dart';
import 'package:mobile/presentation/scheduling/screens/doctor_search_screen.dart';
import 'package:mobile/presentation/scheduling/screens/appointment_booking_screen.dart';
import 'package:mobile/presentation/scheduling/screens/doctor_availability_screen.dart';
import 'package:mobile/presentation/scheduling/screens/reschedule_request_screen.dart';
import 'package:mobile/presentation/scheduling/screens/reschedule_response_screen.dart';
import 'package:mobile/presentation/video_call/screens/video_call_screen.dart';
import 'package:mobile/presentation/video_call/screens/consultation_notes_screen.dart';
import 'package:mobile/presentation/video_call/screens/incoming_call_screen.dart';
import 'package:mobile/presentation/medical_records/screens/consultations_history_screen.dart';
import 'package:mobile/presentation/medical_records/screens/prescriptions_screen.dart';
import 'package:mobile/presentation/medical_records/screens/vitals_self_check_screen.dart';
import 'package:mobile/presentation/medical_records/screens/health_trends_screen.dart';
import 'package:mobile/presentation/clinical_tools/screens/face_scan_screen.dart';
import 'package:mobile/presentation/clinical_tools/screens/prescription_form_screen.dart';
import 'package:mobile/presentation/clinical_tools/screens/diagnosis_form_screen.dart';
import 'package:mobile/presentation/clinical_tools/screens/lab_request_screen.dart';
import 'package:mobile/presentation/clinical_tools/screens/vitals_scanner_screen.dart';
import 'package:mobile/presentation/notifications/screens/notifications_screen.dart';
import 'package:mobile/presentation/notifications/screens/messaging_screen.dart';
import 'package:mobile/presentation/common/screens/patient_home_screen.dart';
import 'package:mobile/presentation/medical_records/screens/medical_records_screen.dart';
import 'package:mobile/presentation/test/screens/notification_test_screen.dart';
import 'package:mobile/presentation/common/screens/home_gate_screen.dart';
import 'package:mobile/presentation/doctor/screens/doctor_home_screen.dart';
import 'package:mobile/presentation/patients/patients_screen.dart';

// Store user role globally for redirect logic (set by auth provider)
String? _currentUserRole;

// Function to update user role from auth provider
void updateRouterUserRole(String? role) {
  _currentUserRole = role;
}

// Check if user is authenticated
bool get _isAuthenticated => _currentUserRole != null;

// Check user roles
bool get _isDoctor => _currentUserRole?.toUpperCase() == 'DOCTOR';
bool get _isPatient => _currentUserRole?.toUpperCase() == 'PATIENT';

// Role-based redirect helper
String? _requireRole({
  required bool requireDoctor,
  required bool requirePatient,
}) {
  if (!_isAuthenticated) {
    return '/login';
  }

  if (requireDoctor && !_isDoctor) {
    return '/patient-home'; // Redirect patients trying to access doctor routes
  }

  if (requirePatient && !_isPatient) {
    return '/doctor-home'; // Redirect doctors trying to access patient routes
  }

  return null; // No redirect needed
}

// No animations - return child directly
Widget _animateRoute(Widget child, String animationType) {
  return child;
}

final GoRouter appRouter = GoRouter(
  initialLocation: '/login',
  routes: [
    // Onboarding Route
    GoRoute(
      path: '/onboarding',
      name: 'onboarding',
      builder: (context, state) =>
          _animateRoute(const OnboardingScreen(), 'fadeIn'),
    ),

    // Authentication Routes
    GoRoute(
      path: '/login',
      name: 'login',
      builder: (context, state) =>
          _animateRoute(const LoginScreen(), 'slideInRight'),
    ),
    GoRoute(
      path: '/signup',
      name: 'signup',
      builder: (context, state) =>
          _animateRoute(const SignupScreen(), 'slideInLeft'),
    ),
    GoRoute(
      path: '/two-factor',
      name: 'two-factor',
      builder: (context, state) =>
          _animateRoute(const TwoFactorScreen(), 'slideInUp'),
    ),
    GoRoute(
      path: '/mfa-verification',
      name: 'mfa-verification',
      builder: (context, state) =>
          _animateRoute(const MfaVerificationScreen(), 'bounceInUp'),
    ),
    GoRoute(
      path: '/credential-upload',
      name: 'credential-upload',
      builder: (context, state) =>
          _animateRoute(const CredentialUploadScreen(), 'slideInUp'),
    ),
    GoRoute(
      path: '/kyc-verification',
      name: 'kyc-verification',
      builder: (context, state) =>
          _animateRoute(const KycVerificationScreen(), 'slideInUp'),
    ),
    GoRoute(
      path: '/philhealth-id-upload',
      name: 'philhealth-id-upload',
      builder: (context, state) =>
          _animateRoute(const PhilHealthIdUploadScreen(), 'slideInUp'),
    ),

    // Main App Routes - Patient home screen
    GoRoute(
      path: '/home',
      name: 'home',
      builder: (context, state) =>
          _animateRoute(const HomeGateScreen(), 'fadeIn'),
    ),
    GoRoute(
      path: '/patient-home',
      name: 'patient-home',
      redirect: (context, state) =>
          _requireRole(requireDoctor: false, requirePatient: true),
      builder: (context, state) =>
          _animateRoute(const PatientHomeScreen(), 'slideInUp'),
    ),
    GoRoute(
      path: '/doctor-home',
      name: 'doctor-home',
      redirect: (context, state) =>
          _requireRole(requireDoctor: true, requirePatient: false),
      builder: (context, state) =>
          _animateRoute(const DoctorHomeScreen(), 'zoomIn'),
    ),

    // Profile Routes
    GoRoute(
      path: '/profile',
      name: 'profile',
      builder: (context, state) =>
          _animateRoute(const ProfileScreen(), 'slideInRight'),
    ),
    GoRoute(
      path: '/profile/edit',
      name: 'profile-edit',
      builder: (context, state) =>
          _animateRoute(const ProfileEditScreen(), 'slideInUp'),
    ),

    // Scheduling Routes
    GoRoute(
      path: '/appointment-requests',
      name: 'appointment-requests',
      redirect: (context, state) =>
          _requireRole(requireDoctor: true, requirePatient: false),
      builder: (context, state) =>
          _animateRoute(const AppointmentRequestsScreen(), 'slideInRight'),
    ),
    GoRoute(
      path: '/doctor-search',
      name: 'doctor-search',
      redirect: (context, state) =>
          _requireRole(requireDoctor: false, requirePatient: true),
      builder: (context, state) =>
          _animateRoute(const DoctorSearchScreen(), 'zoomIn'),
    ),
    GoRoute(
      path: '/appointment-booking',
      name: 'appointment-booking',
      redirect: (context, state) =>
          _requireRole(requireDoctor: false, requirePatient: true),
      builder: (context, state) {
        // Extract doctorId and doctorName from query parameters or extra data
        final doctorId =
            state.uri.queryParameters['doctorId'] ??
            (state.extra as Map<String, dynamic>?)?['doctorId'] as String?;
        final doctorName =
            state.uri.queryParameters['doctorName'] ??
            (state.extra as Map<String, dynamic>?)?['doctorName'] as String?;

        return _animateRoute(
          AppointmentBookingScreen(doctorId: doctorId, doctorName: doctorName),
          'slideInUp',
        );
      },
    ),
    GoRoute(
      path: '/doctor-availability',
      name: 'doctor-availability',
      redirect: (context, state) =>
          _requireRole(requireDoctor: true, requirePatient: false),
      builder: (context, state) =>
          _animateRoute(const DoctorAvailabilityScreen(), 'slideInUp'),
    ),
    GoRoute(
      path: '/reschedule-request',
      name: 'reschedule-request',
      builder: (context, state) {
        final appointment =
            (state.extra as Map<String, dynamic>?)?['appointment'];
        if (appointment == null) {
          return _animateRoute(
            const Scaffold(
              body: Center(child: Text('Appointment not provided')),
            ),
            'fadeIn',
          );
        }
        return _animateRoute(
          RescheduleRequestScreen(appointment: appointment as Appointment),
          'slideInUp',
        );
      },
    ),
    GoRoute(
      path: '/reschedule-response',
      name: 'reschedule-response',
      builder: (context, state) {
        final appointment =
            (state.extra as Map<String, dynamic>?)?['appointment'];
        final rescheduleRequest =
            (state.extra as Map<String, dynamic>?)?['rescheduleRequest'];
        if (appointment == null || rescheduleRequest == null) {
          return _animateRoute(
            const Scaffold(
              body: Center(
                child: Text('Missing appointment or reschedule request'),
              ),
            ),
            'fadeIn',
          );
        }
        return _animateRoute(
          RescheduleResponseScreen(
            appointment: appointment as Appointment,
            rescheduleRequest: rescheduleRequest as Map<String, dynamic>,
          ),
          'slideInUp',
        );
      },
    ),
    GoRoute(
      path: '/doctor-patients',
      name: 'doctor-patients',
      redirect: (context, state) =>
          _requireRole(requireDoctor: true, requirePatient: false),
      builder: (context, state) =>
          _animateRoute(const PatientsScreen(), 'slideInRight'),
    ),

    // Video Call Routes
    GoRoute(
      path: '/video-call',
      name: 'video-call',
      builder: (context, state) {
        final consultationId =
            state.uri.queryParameters['consultationId'] ??
            (state.extra as Map<String, dynamic>?)?['consultationId']
                as String?;
        if (consultationId == null) {
          return _animateRoute(
            const Scaffold(
              body: Center(child: Text('Consultation ID required')),
            ),
            'slideInUp',
          );
        }
        return _animateRoute(
          VideoCallScreen(consultationId: consultationId),
          'slideInUp',
        );
      },
    ),
    GoRoute(
      path: '/consultation-notes',
      name: 'consultation-notes',
      builder: (context, state) {
        final consultationId =
            state.uri.queryParameters['consultationId'] ??
            (state.extra as Map<String, dynamic>?)?['consultationId']
                as String?;
        return _animateRoute(
          ConsultationNotesScreen(consultationId: consultationId),
          'slideInUp',
        );
      },
    ),
    GoRoute(
      path: '/incoming-call',
      name: 'incoming-call',
      builder: (context, state) =>
          _animateRoute(const IncomingCallScreen(), 'bounceInUp'),
    ),

    // Medical Records Routes
    GoRoute(
      path: '/consultations-history',
      name: 'consultations-history',
      builder: (context, state) =>
          _animateRoute(const ConsultationsHistoryScreen(), 'slideInRight'),
    ),
    GoRoute(
      path: '/prescriptions',
      name: 'prescriptions',
      builder: (context, state) =>
          _animateRoute(const PrescriptionsScreen(), 'slideInRight'),
    ),
    GoRoute(
      path: '/vitals-self-check',
      name: 'vitals-self-check',
      builder: (context, state) =>
          _animateRoute(const VitalsSelfCheckScreen(), 'bounceInUp'),
    ),
    GoRoute(
      path: '/health-trends',
      name: 'health-trends',
      builder: (context, state) =>
          _animateRoute(const HealthTrendsScreen(), 'slideInRight'),
    ),
    GoRoute(
      path: '/medical-records',
      name: 'medical-records',
      builder: (context, state) =>
          _animateRoute(const MedicalRecordsScreen(), 'zoomIn'),
    ),

    // Clinical Tools Routes
    GoRoute(
      path: '/face-scan',
      name: 'face-scan',
      redirect: (context, state) =>
          _requireRole(requireDoctor: true, requirePatient: false),
      builder: (context, state) =>
          _animateRoute(const FaceScanScreen(), 'zoomIn'),
    ),
    GoRoute(
      path: '/prescription-form',
      name: 'prescription-form',
      redirect: (context, state) =>
          _requireRole(requireDoctor: true, requirePatient: false),
      builder: (context, state) =>
          _animateRoute(const PrescriptionFormScreen(), 'slideInUp'),
    ),
    GoRoute(
      path: '/diagnosis-form',
      name: 'diagnosis-form',
      redirect: (context, state) =>
          _requireRole(requireDoctor: true, requirePatient: false),
      builder: (context, state) =>
          _animateRoute(const DiagnosisFormScreen(), 'slideInUp'),
    ),
    GoRoute(
      path: '/lab-request',
      name: 'lab-request',
      redirect: (context, state) =>
          _requireRole(requireDoctor: true, requirePatient: false),
      builder: (context, state) =>
          _animateRoute(const LabRequestScreen(), 'slideInUp'),
    ),
    GoRoute(
      path: '/vitals-scanner',
      name: 'vitals-scanner',
      redirect: (context, state) =>
          _requireRole(requireDoctor: true, requirePatient: false),
      builder: (context, state) =>
          _animateRoute(const VitalsScannerScreen(), 'zoomIn'),
    ),

    // Communication Routes
    GoRoute(
      path: '/notifications',
      name: 'notifications',
      builder: (context, state) =>
          _animateRoute(const NotificationsScreen(), 'slideInRight'),
    ),
    GoRoute(
      path: '/messaging',
      name: 'messaging',
      builder: (context, state) =>
          _animateRoute(const MessagingScreen(), 'slideInRight'),
    ),

    // Testing Routes (Development only)
    GoRoute(
      path: '/notification-test',
      name: 'notification-test',
      builder: (context, state) =>
          _animateRoute(const NotificationTestScreen(), 'bounceInUp'),
    ),
  ],
);
