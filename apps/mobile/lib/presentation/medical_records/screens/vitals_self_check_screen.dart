import 'dart:async';
import 'package:biosensesignal_flutter_sdk/session/user_information.dart';
import 'package:biosensesignal_flutter_sdk/session/session_state.dart';
import 'package:biosensesignal_flutter_sdk/ui/camera_preview_view.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_types.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vital_signs_results.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/core/services/biosense_signal_service.dart';
import 'package:mobile/core/services/http_service.dart';
import 'package:mobile/core/services/toast_service.dart';
import 'package:mobile/core/widgets/animated_nav_wrapper.dart';
import 'package:mobile/presentation/auth/providers/auth_providers.dart';
import 'package:permission_handler/permission_handler.dart';

final bioSenseServiceProviderSelfCheck = Provider<BioSenseSignalService>((ref) {
  final service = BioSenseSignalService();
  ref.onDispose(() => service.dispose());
  return service;
});

class VitalsSelfCheckScreen extends ConsumerStatefulWidget {
  const VitalsSelfCheckScreen({super.key});

  @override
  ConsumerState<VitalsSelfCheckScreen> createState() =>
      _VitalsSelfCheckScreenState();
}

class _VitalsSelfCheckScreenState extends ConsumerState<VitalsSelfCheckScreen>
    with SingleTickerProviderStateMixin {
  bool _isSessionCreated = false;
  bool _isScanning = false;
  bool _isInitializing = false;
  static const int _measurementDuration = 60;
  int _elapsedSeconds = 0;
  Timer? _measurementTimer;
  late AnimationController _pulseController;
  Map<String, dynamic> _results = {};

  @override
  Widget build(BuildContext context) {
    final inverseSurface = Theme.of(context).colorScheme.inverseSurface;
    final onInverseSurface = Theme.of(context).colorScheme.onInverseSurface;

    return AnimatedNavWrapper(
      child: Column(
        children: [
          AppBar(
            title: Text(
              'Self-Check Vitals',
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurface,
                fontSize: 22,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.3,
              ),
            ),
            elevation: 0,
            backgroundColor: Theme.of(context).appBarTheme.backgroundColor,
            leading: IconButton(
              icon: Icon(
                Icons.arrow_back_ios_rounded,
                color: Theme.of(context).colorScheme.primary,
              ),
              onPressed: () {
                if (Navigator.of(context).canPop()) {
                  Navigator.of(context).pop();
                } else {
                  context.go('/patient-home');
                }
              },
            ),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header Info
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Theme.of(
                        context,
                      ).colorScheme.primary.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: Theme.of(
                          context,
                        ).colorScheme.primary.withValues(alpha: 0.18),
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.primary,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Icon(
                            Icons.favorite_rounded,
                            color: Theme.of(context).colorScheme.onPrimary,
                            size: 24,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Monitor Your Health',
                                style: Theme.of(context).textTheme.titleMedium
                                    ?.copyWith(
                                      color: Theme.of(
                                        context,
                                      ).colorScheme.onSurface,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: -0.2,
                                    ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Use your camera to check vital signs',
                                style: Theme.of(context).textTheme.bodyMedium
                                    ?.copyWith(
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurface
                                          .withValues(alpha: 0.65),
                                    ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),
                  // Camera Preview Area
                  Container(
                    width: double.infinity,
                    height: 300,
                    decoration: BoxDecoration(
                      color: inverseSurface,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color:
                            (_isScanning
                                    ? Theme.of(context).colorScheme.error
                                    : Theme.of(context).colorScheme.outline)
                                .withValues(alpha: _isScanning ? 0.6 : 0.18),
                        width: 1.8,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color:
                              (_isScanning
                                      ? Theme.of(context).colorScheme.error
                                      : Theme.of(context).colorScheme.shadow)
                                  .withValues(alpha: _isScanning ? 0.25 : 0.06),
                          offset: const Offset(0, 4),
                          blurRadius: 16,
                          spreadRadius: 0,
                        ),
                      ],
                    ),
                    child: Stack(
                      children: [
                        // BioSense SDK Camera Preview
                        if (_isSessionCreated) const CameraPreviewView(),

                        // Initializing state
                        if (!_isSessionCreated && _isInitializing)
                          Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                CircularProgressIndicator(
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'Initializing camera...',
                                  style: Theme.of(context).textTheme.titleMedium
                                      ?.copyWith(
                                        color: onInverseSurface,
                                        fontWeight: FontWeight.w700,
                                      ),
                                ),
                              ],
                            ),
                          ),

                        // Not initialized state
                        if (!_isSessionCreated && !_isInitializing)
                          Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Container(
                                  width: 120,
                                  height: 120,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: inverseSurface.withValues(
                                      alpha: 0.6,
                                    ),
                                    border: Border.all(
                                      color: onInverseSurface.withValues(
                                        alpha: 0.4,
                                      ),
                                      width: 2,
                                    ),
                                  ),
                                  child: Icon(
                                    Icons.camera_alt,
                                    size: 60,
                                    color: onInverseSurface.withValues(
                                      alpha: 0.7,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'Camera Ready',
                                  style: Theme.of(context).textTheme.titleMedium
                                      ?.copyWith(
                                        color: onInverseSurface,
                                        fontWeight: FontWeight.w700,
                                      ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Tap "Start Scan" to begin',
                                  textAlign: TextAlign.center,
                                  style: Theme.of(context).textTheme.bodyMedium
                                      ?.copyWith(
                                        color: onInverseSurface.withValues(
                                          alpha: 0.75,
                                        ),
                                        height: 1.4,
                                      ),
                                ),
                              ],
                            ),
                          ),

                        // Scanning overlay
                        if (_isScanning)
                          Container(
                            color: Colors.black.withValues(alpha: 0.3),
                            child: Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  AnimatedBuilder(
                                    animation: _pulseController,
                                    builder: (context, child) {
                                      return Container(
                                        width:
                                            120 + (_pulseController.value * 20),
                                        height:
                                            120 + (_pulseController.value * 20),
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          color: Theme.of(context)
                                              .colorScheme
                                              .error
                                              .withValues(alpha: 0.2),
                                          border: Border.all(
                                            color: Theme.of(
                                              context,
                                            ).colorScheme.error,
                                            width: 3,
                                          ),
                                        ),
                                        child: Icon(
                                          Icons.favorite,
                                          size: 60,
                                          color: Theme.of(
                                            context,
                                          ).colorScheme.error,
                                        ),
                                      );
                                    },
                                  ),
                                  const SizedBox(height: 24),
                                  Text(
                                    'Scanning vitals...',
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleLarge
                                        ?.copyWith(
                                          color: Colors.white,
                                          fontWeight: FontWeight.w700,
                                        ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    '$_elapsedSeconds / $_measurementDuration seconds',
                                    style: Theme.of(context).textTheme.bodyLarge
                                        ?.copyWith(
                                          color: Colors.white.withValues(
                                            alpha: 0.9,
                                          ),
                                        ),
                                  ),
                                  const SizedBox(height: 16),
                                  Text(
                                    'Keep your face steady in frame',
                                    textAlign: TextAlign.center,
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodyMedium
                                        ?.copyWith(
                                          color: Colors.white.withValues(
                                            alpha: 0.8,
                                          ),
                                        ),
                                  ),
                                ],
                              ),
                            ),
                          ),

                        // Flash indicator
                        if (_isScanning)
                          Positioned(
                            top: 16,
                            right: 16,
                            child: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Theme.of(context).colorScheme.error,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.flash_on,
                                    color: Theme.of(
                                      context,
                                    ).colorScheme.onError,
                                    size: 16,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    'FLASH ON',
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodyMedium
                                        ?.copyWith(
                                          color: Theme.of(
                                            context,
                                          ).colorScheme.onError,
                                          fontWeight: FontWeight.w600,
                                        ),
                                  ),
                                ],
                              ),
                            ),
                          ),

                        // Instructions overlay
                        if (!_isScanning)
                          Positioned(
                            bottom: 16,
                            left: 16,
                            right: 16,
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: inverseSurface.withValues(alpha: 0.7),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    Icons.info_outline,
                                    color: onInverseSurface,
                                    size: 16,
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      'Ensure good lighting and steady finger placement',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodyMedium
                                          ?.copyWith(
                                            color: onInverseSurface.withValues(
                                              alpha: 0.9,
                                            ),
                                          ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),
                  // Initialize/Scan Button
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton.icon(
                      onPressed: _isInitializing
                          ? null
                          : (_isScanning
                                ? _stopScan
                                : (_isSessionCreated
                                      ? _startScan
                                      : _initializeSession)),
                      icon: Icon(
                        _isInitializing
                            ? Icons.hourglass_empty
                            : (_isScanning
                                  ? Icons.stop_rounded
                                  : Icons.play_arrow_rounded),
                      ),
                      label: Text(
                        _isInitializing
                            ? 'Initializing...'
                            : (_isScanning
                                  ? 'Stop Scan'
                                  : (_isSessionCreated
                                        ? 'Start Scan'
                                        : 'Initialize Camera')),
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.2,
                            ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Theme.of(context).colorScheme.primary,
                        foregroundColor: Theme.of(
                          context,
                        ).colorScheme.onPrimary,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        disabledBackgroundColor: Theme.of(
                          context,
                        ).colorScheme.outline,
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                  // Results
                  if (_results.isNotEmpty) ...[
                    Text(
                      'Results',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      decoration: BoxDecoration(
                        color: Theme.of(
                          context,
                        ).colorScheme.surfaceContainerLow,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: Theme.of(
                            context,
                          ).colorScheme.outline.withValues(alpha: 0.18),
                          width: 1.8,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Theme.of(
                              context,
                            ).colorScheme.shadow.withValues(alpha: 0.06),
                            offset: const Offset(0, 4),
                            blurRadius: 16,
                            spreadRadius: 0,
                          ),
                        ],
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          children: [
                            _buildVitalResult(
                              'Heart Rate',
                              '${_results['heartRate']} BPM',
                              Icons.favorite_rounded,
                              Theme.of(context).colorScheme.error,
                              Theme.of(context).colorScheme,
                            ),
                            const SizedBox(height: 16),
                            Divider(
                              color: Theme.of(
                                context,
                              ).colorScheme.outline.withValues(alpha: 0.2),
                            ),
                            const SizedBox(height: 16),
                            _buildVitalResult(
                              'Blood Oxygen',
                              '${_results['oxygenSat']}%',
                              Icons.air_rounded,
                              Theme.of(context).colorScheme.tertiary,
                              Theme.of(context).colorScheme,
                            ),
                            const SizedBox(height: 16),
                            Divider(
                              color: Theme.of(
                                context,
                              ).colorScheme.outline.withValues(alpha: 0.2),
                            ),
                            const SizedBox(height: 16),
                            _buildVitalResult(
                              'Stress Level',
                              _results['stress'],
                              Icons.psychology_rounded,
                              Theme.of(context).colorScheme.secondary,
                              Theme.of(context).colorScheme,
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => _showHistory(context),
                            icon: const Icon(Icons.history_rounded, size: 20),
                            label: const Text('View History'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Theme.of(
                                context,
                              ).colorScheme.primary,
                              side: BorderSide(
                                color: Theme.of(
                                  context,
                                ).colorScheme.primary.withValues(alpha: 0.5),
                              ),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () {
                              ToastService.showVitals(
                                context: context,
                                title: 'Vitals Saved',
                                description:
                                    'Results saved to your health records',
                              );
                            },
                            icon: const Icon(Icons.save_rounded, size: 20),
                            label: const Text('Save Results'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Theme.of(
                                context,
                              ).colorScheme.primary,
                              foregroundColor: Theme.of(
                                context,
                              ).colorScheme.onPrimary,
                              elevation: 0,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 100),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVitalResult(
    String label,
    String value,
    IconData icon,
    Color color,
    ColorScheme scheme,
  ) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: color, size: 24),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 15,
              color: scheme.onSurface,
            ),
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 18,
            color: scheme.onSurface,
            letterSpacing: -0.3,
          ),
        ),
      ],
    );
  }

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _measurementTimer?.cancel();
    _pulseController.dispose();
    
    final service = ref.read(bioSenseServiceProviderSelfCheck);
    
    // Remove listeners
    service.finalResultsNotifier.removeListener(_onResultsReceived);
    service.sessionStateNotifier.removeListener(_onSessionStateChanged);
    service.errorNotifier.removeListener(_onErrorReceived);
    
    
    // Terminate session
    service.terminateSession();
    
    super.dispose();
  }

  void _onResultsReceived() {
    final service = ref.read(bioSenseServiceProviderSelfCheck);
    final results = service.finalResultsNotifier.value;
    if (results != null && mounted) {
      _processResults(results);
    }
  }

Future<void> _initializeSession() async {
  debugPrint('══════════════════════════════════════');
  debugPrint('🚀 INITIALIZE SESSION STARTED');
  debugPrint('══════════════════════════════════════');
  
  if (_isSessionCreated || _isInitializing) {
    debugPrint('⚠️ Already initialized or initializing');
    return;
  }

  setState(() {
    _isInitializing = true;
  });

  try {
    // Step 1: Check camera permission
    debugPrint('📸 Step 1: Checking camera permission...');
    var cameraStatus = await Permission.camera.status;
    debugPrint('📸 Initial camera status: $cameraStatus');

    if (!cameraStatus.isGranted) {
      cameraStatus = await Permission.camera.request();
      if (!cameraStatus.isGranted) {
        if (mounted) {
          setState(() => _isInitializing = false);
          _showError('Camera permission required');
        }
        return;
      }
    }

    debugPrint('✅ Camera permission granted');

    // Step 2: Get service
    final service = ref.read(bioSenseServiceProviderSelfCheck);
    debugPrint('✅ Service retrieved');

    // Step 3: Setup listeners
    debugPrint('👂 Setting up listeners...');
    try {
      service.finalResultsNotifier.removeListener(_onResultsReceived);
      service.sessionStateNotifier.removeListener(_onSessionStateChanged);
      service.errorNotifier.removeListener(_onErrorReceived);
    } catch (_) {}
    
    service.finalResultsNotifier.addListener(_onResultsReceived);
    service.sessionStateNotifier.addListener(_onSessionStateChanged);
    service.errorNotifier.addListener(_onErrorReceived);
    debugPrint('✅ All listeners added');

    // Step 4: Get user information and calculate age
    debugPrint('👤 Step 4: Getting user information...');
    final user = ref.read(currentUserProvider);

    // Calculate age properly
    int? estimatedAge;
    if (user != null) {
      final age = DateTime.now().year - user.createdAt.year;
      debugPrint('👤 Calculated age: $age');
      
      // Only use age if it's valid (SDK requires 18-110)
      if (age >= 18 && age <= 110) {
        estimatedAge = age;
        debugPrint('✅ Using valid age: $age');
      } else {
        debugPrint('⚠️ Invalid age ($age), creating session without age');
      }
    } else {
      debugPrint('⚠️ No user found, creating session without user info');
    }

    debugPrint('👤 User ID: ${user?.id}, Estimated age: $estimatedAge');

    // Step 5: Create session - SINGLE CALL ONLY
    debugPrint('🎬 Step 5: Creating BioSense face session...');
    
    // CRITICAL: Only call createFaceSession ONCE
    // Try WITHOUT user info first to avoid SDK crashes
    await service.createFaceSession(
      userInformation: null, // Pass null to avoid age-related crashes
    );

    debugPrint('✅ Face session created successfully!');
    
    // Small delay to let SDK initialize properly
    await Future.delayed(const Duration(milliseconds: 500));
    
    if (mounted) {
      setState(() {
        _isInitializing = false;
      });
    }
    
    debugPrint('══════════════════════════════════════');
    debugPrint('🎉 INITIALIZE SESSION COMPLETED');
    debugPrint('══════════════════════════════════════');
  } catch (e, stackTrace) {
    debugPrint('══════════════════════════════════════');
    debugPrint('💥 INITIALIZE SESSION FAILED');
    debugPrint('══════════════════════════════════════');
    debugPrint('❌ Error: $e');
    debugPrint('❌ Stack trace: ${stackTrace.toString()}');
    
    if (mounted) {
      setState(() {
        _isInitializing = false;
        _isSessionCreated = false;
      });
      _showError('SDK initialization failed. Please check your license key.');
    }
  }
}

  // Add this new method to handle session state changes
  void _onSessionStateChanged() {
    final service = ref.read(bioSenseServiceProviderSelfCheck);
    final state = service.sessionStateNotifier.value;
    
    debugPrint('📊 Session state changed to: $state');
    
    if (state == SessionState.ready && mounted) {
      setState(() {
        _isSessionCreated = true;
        _isInitializing = false;
      });
      debugPrint('✅ Session is READY - camera can now start');
    } else if (state == SessionState.terminated && mounted) {
      setState(() {
        _isSessionCreated = false;
      });
    }
  }

  // Add this new method to handle errors
  void _onErrorReceived() {
  final service = ref.read(bioSenseServiceProviderSelfCheck);
  final error = service.errorNotifier.value;
  
  debugPrint('❌ ERROR RECEIVED: $error'); // Add this
  
  if (error != null && mounted) {
    _showError(error);
    setState(() {
      _isInitializing = false;
      _isSessionCreated = false;
    });
  }
}

  Future<void> _startScan() async {
    if (!_isSessionCreated) {
      await _initializeSession();
      if (!_isSessionCreated) return;
    }

    try {
      final service = ref.read(bioSenseServiceProviderSelfCheck);
      await service.startMeasurement(duration: _measurementDuration);

      if (mounted) {
        setState(() {
          _isScanning = true;
          _elapsedSeconds = 0;
          _results = {};
        });
        _startTimer();
      }
    } catch (e) {
      _showError('Failed to start: ${e.toString().split(':').last}');
    }
  }

  Future<void> _stopScan() async {
    try {
      final service = ref.read(bioSenseServiceProviderSelfCheck);
      await service.stopMeasurement();

      if (mounted) {
        setState(() {
          _isScanning = false;
        });
        _stopTimer();
      }
    } catch (e) {
      _showError('Failed to stop: ${e.toString().split(':').last}');
    }
  }

  void _startTimer() {
    _measurementTimer?.cancel();
    _measurementTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          _elapsedSeconds++;
          if (_elapsedSeconds >= _measurementDuration) {
            _isScanning = false;
            timer.cancel();
            _stopScan();
          }
        });
      }
    });
  }

  void _stopTimer() {
    _measurementTimer?.cancel();
    setState(() {
      _elapsedSeconds = 0;
    });
  }

  void _processResults(VitalSignsResults results) {
    final allVitals = results.getResults();
    final processedResults = <String, dynamic>{};

    for (var sign in allVitals) {
      if (sign.type == VitalSignTypes.pulseRate) {
        processedResults['heartRate'] = sign.value is num ? sign.value : null;
      } else if (sign.type == VitalSignTypes.oxygenSaturation) {
        processedResults['oxygenSat'] = sign.value is num ? sign.value : null;
      } else if (sign.type == VitalSignTypes.stressLevel) {
        processedResults['stress'] = sign.value;
      } else if (sign.type == VitalSignTypes.stressIndex) {
        processedResults['stressScore'] = sign.value is num ? sign.value : null;
      } else if (sign.type == VitalSignTypes.sdnn) {
        processedResults['hrvSdnn'] = sign.value is num ? sign.value : null;
      } else if (sign.type == VitalSignTypes.rmssd) {
        processedResults['hrvRmsdd'] = sign.value is num ? sign.value : null;
      } else if (sign.type == VitalSignTypes.wellnessLevel ||
          sign.type == VitalSignTypes.wellnessIndex) {
        processedResults['generalWellness'] = sign.value is num
            ? sign.value
            : null;
      } else if (sign.type == VitalSignTypes.respirationRate) {
        processedResults['respiratoryRate'] = sign.value is num
            ? sign.value
            : null;
      }
    }

    if (mounted) {
      setState(() {
        _results = processedResults;
      });

      // Auto-save results
      _saveVitalsResults(results);
    }
  }

  Future<void> _saveVitalsResults(VitalSignsResults results) async {
    try {
      final user = ref.read(currentUserProvider);
      if (user == null) {
        _showError('Cannot save: User not authenticated');
        return;
      }

      final allVitals = results.getResults();
      final vitalsData = <String, dynamic>{'patientId': user.id};

      // Extract vital signs
      for (var sign in allVitals) {
        if (sign.value is num) {
          if (sign.type == VitalSignTypes.pulseRate) {
            vitalsData['heartRate'] = sign.value;
          } else if (sign.type == VitalSignTypes.oxygenSaturation) {
            vitalsData['spO2'] = sign.value;
          } else if (sign.type == VitalSignTypes.respirationRate) {
            vitalsData['respiratoryRate'] = sign.value;
          } else if (sign.type == VitalSignTypes.stressLevel) {
            vitalsData['stressLevel'] = sign.value;
          } else if (sign.type == VitalSignTypes.stressIndex) {
            vitalsData['stressScore'] = sign.value;
          } else if (sign.type == VitalSignTypes.sdnn) {
            vitalsData['hrvSdnn'] = sign.value;
          } else if (sign.type == VitalSignTypes.rmssd) {
            vitalsData['hrvRmsdd'] = sign.value;
          } else if (sign.type == VitalSignTypes.wellnessLevel ||
              sign.type == VitalSignTypes.wellnessIndex) {
            vitalsData['generalWellness'] = sign.value;
          }
        }
      }

      // Save to backend
      await HttpService.createSelfCheckVitals(
        patientId: user.id,
        heartRate: vitalsData['heartRate'] as double?,
        spO2: vitalsData['spO2'] as double?,
        respiratoryRate: vitalsData['respiratoryRate'] as double?,
        stressLevel: vitalsData['stressLevel'] as double?,
        stressScore: vitalsData['stressScore'] as double?,
        hrvSdnn: vitalsData['hrvSdnn'] as double?,
        hrvRmsdd: vitalsData['hrvRmsdd'] as double?,
        generalWellness: vitalsData['generalWellness'] as double?,
      );

      if (mounted) {
        ToastService.showMedicalSuccess(
          context: context,
          title: 'Vitals Saved',
          description: 'Your vital signs have been saved successfully',
        );
      }
    } catch (e) {
      debugPrint('Error saving vitals: $e');
      if (mounted) {
        _showError('Failed to save vitals: ${e.toString()}');
      }
    }
  }

  void _showError(String message) {
    if (mounted) {
      ToastService.showError(
        context: context,
        title: 'Error',
        description: message,
      );
    }
  }

  Future<void> _showHistory(BuildContext context) async {
    try {
      final user = ref.read(currentUserProvider);
      if (user == null) {
        _showError('Cannot load history: User not authenticated');
        return;
      }

      // Fetch history from API
      final historyData = await HttpService.getVitalsHistory(
        patientId: user.id,
        limit: 20,
      );

      final items = (historyData['items'] as List<dynamic>?) ?? [];

      if (!mounted) return;

      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        builder: (context) => DraggableScrollableSheet(
          initialChildSize: 0.7,
          maxChildSize: 0.9,
          minChildSize: 0.5,
          builder: (context, scrollController) {
            return Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(24),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Vitals History',
                        style: Theme.of(context).textTheme.headlineSmall
                            ?.copyWith(
                              color: Theme.of(context).colorScheme.onSurface,
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: Icon(
                          Icons.close,
                          color: Theme.of(context).colorScheme.onSurface,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Expanded(
                    child: items.isEmpty
                        ? Center(
                            child: Text(
                              'No vitals history found',
                              style: Theme.of(context).textTheme.bodyLarge
                                  ?.copyWith(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurface
                                        .withValues(alpha: 0.6),
                                  ),
                            ),
                          )
                        : ListView(
                            controller: scrollController,
                            children: items.map((item) {
                              final recordedAt = item['recordedAt'] != null
                                  ? DateTime.parse(item['recordedAt'] as String)
                                  : DateTime.now();
                              final results = <String, dynamic>{
                                if (item['heartRate'] != null)
                                  'heartRate': item['heartRate'],
                                if (item['spO2'] != null)
                                  'oxygenSat': item['spO2'],
                                if (item['stressLevel'] != null)
                                  'stress': item['stressLevel'],
                              };
                              return _buildHistoryItem(recordedAt, results);
                            }).toList(),
                          ),
                  ),
                ],
              ),
            );
          },
        ),
      );
    } catch (e) {
      if (mounted) {
        _showError('Failed to load history: ${e.toString()}');
      }
    }
  }

  Widget _buildHistoryItem(DateTime date, Map<String, dynamic> results) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.08),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                _formatDate(date),
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),
              Text(
                _formatTime(date),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(
                    context,
                  ).colorScheme.onSurface.withValues(alpha: 0.6),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildMiniVital(
                'HR',
                '${results['heartRate']} BPM',
                Icons.favorite,
                Theme.of(context).colorScheme.error,
              ),
              _buildMiniVital(
                'O2',
                '${results['oxygenSat']}%',
                Icons.air,
                Theme.of(context).colorScheme.tertiary,
              ),
              _buildMiniVital(
                'Stress',
                results['stress'],
                Icons.psychology,
                Theme.of(context).colorScheme.secondary,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMiniVital(
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Column(
      children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(height: 4),
        Text(
          label,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            fontSize: 12,
            color: Theme.of(
              context,
            ).colorScheme.onSurface.withValues(alpha: 0.6),
          ),
        ),
        Text(
          value,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w700,
            color: Theme.of(context).colorScheme.onSurface,
          ),
        ),
      ],
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date).inDays;

    if (difference == 0) {
      return 'Today';
    } else if (difference == 1) {
      return 'Yesterday';
    } else if (difference < 7) {
      return '$difference days ago';
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }

  String _formatTime(DateTime date) {
    return '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }
}
