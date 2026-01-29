import 'dart:async';

import 'package:biosensesignal_flutter_sdk/alerts/error_data.dart';
import 'package:biosensesignal_flutter_sdk/alerts/warning_data.dart';
import 'package:biosensesignal_flutter_sdk/health_monitor_exception.dart';
import 'package:biosensesignal_flutter_sdk/images/image_data.dart';
import 'package:biosensesignal_flutter_sdk/images/image_data_listener.dart';
import 'package:biosensesignal_flutter_sdk/license/license_details.dart';
import 'package:biosensesignal_flutter_sdk/license/license_info.dart';
import 'package:biosensesignal_flutter_sdk/session/session.dart';
import 'package:biosensesignal_flutter_sdk/session/session_builder/face_session_builder.dart';
import 'package:biosensesignal_flutter_sdk/session/session_enabled_vital_signs.dart';
import 'package:biosensesignal_flutter_sdk/session/session_info_listener.dart';
import 'package:biosensesignal_flutter_sdk/session/session_state.dart';
import 'package:biosensesignal_flutter_sdk/session/user_information.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/vital_sign.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vital_signs_listener.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vital_signs_results.dart';
import 'package:flutter/foundation.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import 'biosense_config.dart';

class BioSenseSignalService
    implements VitalSignsListener, SessionInfoListener, ImageDataListener {
  Session? _session;

  // Current license key being used
  static String? _currentLicenseKey;

  /// License key - now comes from [BiosenseConfig] with validation.
  static String get _licenseKey {
    if (_currentLicenseKey != null) {
      return _currentLicenseKey!;
    }

    // Validate configuration before touching the native SDK.
    if (!BiosenseConfig.isLicenseKeyValid()) {
      throw Exception('Invalid BioSense license key configuration');
    }

    _currentLicenseKey = BiosenseConfig.licenseKey.trim();

    if (kDebugMode) {
      debugPrint('BiosenseSignal: Using configured license key');
    }

    return _currentLicenseKey!;
  }

  // ValueNotifiers for reactive state management
  final ValueNotifier<SessionState?> sessionStateNotifier =
      ValueNotifier<SessionState?>(null);
  final ValueNotifier<ImageData?> imageDataNotifier = ValueNotifier<ImageData?>(
    null,
  );
  final ValueNotifier<VitalSignsResults?> finalResultsNotifier =
      ValueNotifier<VitalSignsResults?>(null);
  final ValueNotifier<String?> errorNotifier = ValueNotifier<String?>(null);

  /// Create a face measurement session
  ///
  /// [userInformation] - Optional user demographics for enhanced measurements
  Future<void> createFaceSession({UserInformation? userInformation}) async {
    // Global kill-switch for BioSense usage.
    if (!FeatureFlags.enableBiosense) {
      throw Exception('BioSense is temporarily disabled by configuration.');
    }

    final key = _licenseKey;
    Exception? lastException;

    if (kDebugMode) {
      debugPrint(
        'BiosenseSignal: Attempting to create session with key: ${key.substring(0, 12)}...',
      );
    }

    try {
      // Terminate existing session if any
      if (_session != null) {
        await _session!.terminate();
        _session = null;
      }

      // Reset state
      sessionStateNotifier.value = null;
      imageDataNotifier.value = null;
      finalResultsNotifier.value = null;
      errorNotifier.value = null;

      // Create license details
      final licenseDetails = LicenseDetails(key);

      // Build face session - chain FaceSessionBuilder methods first, then SessionBuilder methods
      var builder = FaceSessionBuilder();

      // Add user information if provided (must be called first to preserve FaceSessionBuilder type)
      if (userInformation != null) {
        builder = builder.withUserInformation(userInformation);
      }

      // Chain SessionBuilder methods (these return SessionBuilder but can be used on FaceSessionBuilder)
      _session = await builder
          .withImageDataListener(this)
          .withVitalSignsListener(this)
          .withSessionInfoListener(this)
          .build(licenseDetails);

      // Success!
      if (kDebugMode) {
        debugPrint(
          'BiosenseSignal: Session created successfully with key: ${key.substring(0, 12)}...',
        );
      }
      return;
    } on HealthMonitorException catch (e) {
      final errorMessage = 'SDK Error (${e.domain}): ${e.code}';
      if (kDebugMode) {
        debugPrint(
          'BiosenseSignal: SDK error during session creation: $errorMessage',
        );
      }
      lastException = e;
      errorNotifier.value = errorMessage;
    } catch (e) {
      final message = e.toString();
      if (kDebugMode) {
        debugPrint(
          'BiosenseSignal: Unexpected error during session creation: $message',
        );
      }
      lastException = e is Exception ? e : Exception(message);
      errorNotifier.value = 'SDK initialization failed: $message';
    }

    final errorMessage =
        'BioSense initialization failed: ${lastException.toString()}';
    errorNotifier.value = errorMessage;
    throw lastException;
  }

  /// Start a measurement with the specified duration
  ///
  /// [duration] - Measurement duration in seconds (20-180 seconds)
  Future<void> startMeasurement({required int duration}) async {
    if (_session == null) {
      throw Exception('Session not initialized. Call createFaceSession first.');
    }

    try {
      await _session!.start(duration);
    } on HealthMonitorException catch (e) {
      final errorMessage = 'SDK Error (${e.domain}): ${e.code}';
      errorNotifier.value = errorMessage;
      if (kDebugMode) {
        debugPrint('BiosenseSignal SDK Error: $errorMessage');
      }
      rethrow;
    } catch (e) {
      final errorMessage = 'Failed to start measurement: ${e.toString()}';
      errorNotifier.value = errorMessage;
      if (kDebugMode) {
        debugPrint('Error starting measurement: $e');
      }
      rethrow;
    }
  }

  /// Stop the current measurement
  Future<void> stopMeasurement() async {
    if (_session == null) {
      throw Exception('Session not initialized. Call createFaceSession first.');
    }

    try {
      await _session!.stop();
    } on HealthMonitorException catch (e) {
      final errorMessage = 'SDK Error (${e.domain}): ${e.code}';
      errorNotifier.value = errorMessage;
      if (kDebugMode) {
        debugPrint('BiosenseSignal SDK Error: $errorMessage');
      }
      rethrow;
    } catch (e) {
      final errorMessage = 'Failed to stop measurement: ${e.toString()}';
      errorNotifier.value = errorMessage;
      if (kDebugMode) {
        debugPrint('Error stopping measurement: $e');
      }
      rethrow;
    }
  }

  /// Terminate the current session
  Future<void> terminateSession() async {
    if (_session == null) {
      return;
    }

    try {
      await _session!.terminate();
      _session = null;

      // Reset state
      sessionStateNotifier.value = SessionState.terminated;
      imageDataNotifier.value = null;
      finalResultsNotifier.value = null;
      errorNotifier.value = null;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Error terminating session: $e');
      }
      // Even if termination fails, clear the session
      _session = null;
    }
  }

  /// Dispose of resources
  void dispose() {
    // Terminate session if active
    if (_session != null) {
      terminateSession();
    }

    // Dispose ValueNotifiers
    sessionStateNotifier.dispose();
    imageDataNotifier.dispose();
    finalResultsNotifier.dispose();
    errorNotifier.dispose();
  }

  // ============================================================================
  // VitalSignsListener implementation
  // ============================================================================

  @override
  void onVitalSign(VitalSign vitalSign) {
    // Instantaneous vital sign updates during measurement
    // UI can listen to this if needed for real-time updates
    if (kDebugMode) {
      debugPrint('Vital sign received: ${vitalSign.type} = ${vitalSign.value}');
    }
  }

  @override
  void onFinalResults(VitalSignsResults results) {
    // Final results are computed when measurement stops
    finalResultsNotifier.value = results;
    if (kDebugMode) {
      debugPrint(
        'Final results received: ${results.getResults().length} vital signs',
      );
    }
  }

  // ============================================================================
  // SessionInfoListener implementation
  // ============================================================================

  @override
  void onSessionStateChange(SessionState sessionState) {
    sessionStateNotifier.value = sessionState;
    switch (sessionState) {
      case SessionState.ready:
        WakelockPlus.enable();
        break;
      case SessionState.terminating:
        WakelockPlus.disable();
        break;
      default:
        break;
    }
    if (kDebugMode) {
      debugPrint('Session state changed: $sessionState');
    }
  }

  @override
  void onWarning(WarningData warningData) {
    if (kDebugMode) {
      debugPrint(
        'SDK Warning: Domain=${warningData.domain}, Code=${warningData.code}',
      );
    }
    // Warnings don't stop the measurement, but can be displayed to user if needed
  }

  @override
  void onError(ErrorData errorData) {
    final errorMessage = 'SDK Error (${errorData.domain}): ${errorData.code}';
    errorNotifier.value = errorMessage;
    if (kDebugMode) {
      debugPrint('SDK Error: $errorMessage');
    }
  }

  @override
  void onEnabledVitalSigns(SessionEnabledVitalSigns enabledVitalSigns) {
    if (kDebugMode) {
      debugPrint('Enabled vital signs received');
    }
    // Can be used to determine which vital signs are available for this session
  }

  @override
  void onLicenseInfo(LicenseInfo licenseInfo) {
    if (kDebugMode) {
      debugPrint('License info received');
    }
    // License information can be used to check activation status, remaining measurements, etc.
  }

  // ============================================================================
  // ImageDataListener implementation
  // ============================================================================

  @override
  void onImageData(ImageData imageData) {
    imageDataNotifier.value = imageData;
  }
}
