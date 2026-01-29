import 'dart:async';
import 'package:biosensesignal_flutter_sdk/images/image_data.dart';
import 'package:biosensesignal_flutter_sdk/session/session_state.dart';
import 'package:biosensesignal_flutter_sdk/session/user_information.dart';
import 'package:biosensesignal_flutter_sdk/ui/camera_preview_view.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vital_sign_types.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vital_signs_results.dart';
import 'package:biosensesignal_flutter_sdk/vital_signs/vitals/vital_sign.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/services/biosense_signal_service.dart';
import 'package:mobile/core/services/toast_service.dart';
import 'package:mobile/core/services/vital_sign_info_service.dart';
import 'package:mobile/core/services/vitals_api_service.dart';
import 'package:mobile/presentation/auth/providers/auth_providers.dart';
import 'package:mobile/presentation/widgets/vital_sign_info_dialog.dart';
import 'package:mobile/presentation/widgets/guidance_flags_widget.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

final bioSenseServiceProvider = Provider<BioSenseSignalService>((ref) {
  final service = BioSenseSignalService();
  ref.onDispose(() => service.dispose());
  return service;
});

final vitalsApiServiceProvider = Provider<VitalsApiService>((ref) {
  return VitalsApiService();
});

class VitalsScannerScreen extends ConsumerStatefulWidget {
  const VitalsScannerScreen({super.key});

  @override
  ConsumerState<VitalsScannerScreen> createState() =>
      _VitalsScannerScreenState();
}

class _VitalsScannerScreenState extends ConsumerState<VitalsScannerScreen>
    with SingleTickerProviderStateMixin {
  bool _isSessionCreated = false;
  bool _isMeasuring = false;
  bool _isInitializing = false;
  static const int _measurementDuration =
      60; // Optimal duration for accurate measurements
  int _elapsedSeconds = 0;
  Timer? _measurementTimer;
  late AnimationController _pulseController;
  VitalSignsResults? _currentResults; // Store results for saving

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
    ref.read(bioSenseServiceProvider).terminateSession();
    super.dispose();
  }

  Future<void> _initializeSession() async {
    if (_isSessionCreated || _isInitializing) return;

    setState(() {
      _isInitializing = true;
    });

    try {
      // Check and request camera permission
      final cameraStatus = await Permission.camera.status;

      if (cameraStatus.isDenied) {
        final result = await Permission.camera.request();

        if (result.isDenied) {
          if (mounted) {
            setState(() {
              _isInitializing = false;
            });
            _showError('Camera permission is required to scan vital signs');
          }
          return;
        }

        if (result.isPermanentlyDenied) {
          if (mounted) {
            setState(() {
              _isInitializing = false;
            });
            _showError('Please enable camera permission in app settings');
            // Optionally open app settings
            await openAppSettings();
          }
          return;
        }
      }

      final service = ref.read(bioSenseServiceProvider);

      // Reset any previous session state
      setState(() {
        _isSessionCreated = false;
        _isMeasuring = false;
        _elapsedSeconds = 0;
      });

      // TODO: Implement proper patient demographics system
      // Create dedicated patient profile with age, gender, height, weight, smoking status
      // For now, calculate approximate age from account creation date
      final user = ref.read(currentUserProvider);
      final int? estimatedAge = user != null
          ? DateTime.now().year - user.createdAt.year
          : null;

      // Short delay so Activity/platform is ready before native session (avoids SIGSEGV on some devices e.g. MIUI)
      await Future<void>.delayed(const Duration(milliseconds: 300));
      if (!mounted) return;

      await service.createFaceSession(
        userInformation: estimatedAge != null
            ? UserInformation(age: estimatedAge.toDouble())
            : null, // SDK will use defaults if null
      );

      if (mounted) {
        setState(() {
          _isSessionCreated = true;
          _isInitializing = false;
        });
        _showSuccess('Camera initialized successfully!');
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isInitializing = false;
          _isSessionCreated = false;
        });
        final msg = e.toString();
        if (msg.contains('license') || msg.contains('BIOSENSESIGNAL')) {
          _showError(
            'SDK initialization failed. Please configure the license key.',
          );
        } else {
          _showError('Failed to initialize: ${msg.split(':').last}');
        }
      }
    }
  }

  Future<void> _startMeasurement() async {
    try {
      final service = ref.read(bioSenseServiceProvider);
      await service.startMeasurement(duration: _measurementDuration);

      if (mounted) {
        setState(() {
          _isMeasuring = true;
          _elapsedSeconds = 0;
        });
        _startTimer();
      }
    } catch (e) {
      _showError('Failed to start: ${e.toString().split(':').last}');
    }
  }

  Future<void> _stopMeasurement() async {
    try {
      final service = ref.read(bioSenseServiceProvider);
      await service.stopMeasurement();

      if (mounted) {
        setState(() {
          _isMeasuring = false;
        });
        _stopTimer();
      }
    } catch (e) {
      _showError('Failed to stop: ${e.toString().split(':').last}');
    }
  }

  Future<void> _resetSession() async {
    try {
      final service = ref.read(bioSenseServiceProvider);
      await service.terminateSession();

      if (mounted) {
        setState(() {
          _isSessionCreated = false;
          _isMeasuring = false;
          _elapsedSeconds = 0;
        });
        _stopTimer();
        debugPrint('Session reset successfully - ready for new scan');
      }
    } catch (e) {
      debugPrint('Failed to reset session: ${e.toString().split(':').last}');
      // Still reset the UI state even if service reset fails
      if (mounted) {
        setState(() {
          _isSessionCreated = false;
          _isMeasuring = false;
          _elapsedSeconds = 0;
        });
        _stopTimer();
      }
    }
  }

  void _startTimer() {
    _measurementTimer?.cancel();
    _measurementTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          _elapsedSeconds++;
          if (_elapsedSeconds >= _measurementDuration) {
            _isMeasuring = false;
            timer.cancel();
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

  void _showError(String message) {
    if (mounted) {
      ToastService.showError(
        context: context,
        title: 'Error',
        description: message,
      );
    }
  }

  void _showSuccess(String message) {
    if (mounted) {
      ToastService.showVitals(
        context: context,
        title: 'Vitals Recorded',
        description: message,
      );
    }
  }

  void _showVitalSignInfo(VitalSign sign) {
    final vitalSignInfo = VitalSignInfoService.getVitalSignInfo(sign.type);
    if (vitalSignInfo != null) {
      showDialog(
        context: context,
        builder: (context) => VitalSignInfoDialog(vitalSignInfo: vitalSignInfo),
      );
    } else {
      _showError('Information not available for this vital sign');
    }
  }

  /// Convert VitalSignsResults to API format and save
  Future<void> _saveVitalsResults(VitalSignsResults results) async {
    try {
      final user = ref.read(currentUserProvider);
      if (user == null) {
        _showError('Cannot save: User not authenticated');
        return;
      }

      // Convert SDK results to API format
      final vitalsData = <String, dynamic>{
        'patientId': user.id,
        'source': 'biosense_sdk',
        'recordedAt': DateTime.now().toIso8601String(),
        'measurements': {},
      };

      // Extract all vital signs from results
      final allVitals = results.getResults();
      for (var sign in allVitals) {
        // Store each vital sign with its type as key
        vitalsData['measurements'][sign.type.toString()] = {
          'value': sign.value,
          'timestamp': DateTime.now().toIso8601String(),
        };
      }

      // Save to local storage first (backup in case API fails)
      await _saveToLocalStorage(vitalsData);

      // Save to backend via API
      final apiService = ref.read(vitalsApiServiceProvider);
      await apiService.recordVitals(vitalsData);

      if (mounted) {
        ToastService.showMedicalSuccess(
          context: context,
          title: 'Vitals Saved',
          description: 'Your vital signs have been saved to medical records',
        );
      }
    } catch (e) {
      debugPrint('Error saving vitals: $e');
      if (mounted) {
        _showError('Failed to save vitals: ${e.toString()}');
      }
    }
  }

  /// Save vitals to local storage as backup
  Future<void> _saveToLocalStorage(Map<String, dynamic> vitalsData) async {
    try {
      final prefs = await SharedPreferences.getInstance();

      // Get existing vitals history
      final String? existingData = prefs.getString('vitals_history');
      List<dynamic> vitalsHistory = [];

      if (existingData != null) {
        vitalsHistory = jsonDecode(existingData) as List<dynamic>;
      }

      // Add new vitals record
      vitalsHistory.insert(
        0,
        vitalsData,
      ); // Insert at beginning (most recent first)

      // Keep only last 50 records to prevent storage bloat
      if (vitalsHistory.length > 50) {
        vitalsHistory = vitalsHistory.sublist(0, 50);
      }

      // Save back to storage
      await prefs.setString('vitals_history', jsonEncode(vitalsHistory));

      debugPrint(
        '✅ Vitals saved to local storage (${vitalsHistory.length} total records)',
      );
    } catch (e) {
      debugPrint('⚠️ Failed to save to local storage: $e');
      // Don't throw - local storage is just a backup
    }
  }

  void _showResults(VitalSignsResults results) {
    // Store results for saving later
    _currentResults = results;

    final allVitals = results.getResults();

    // Show ALL vital signs returned by the SDK
    print('📊 Final results received with ${allVitals.length} signs');

    // Print all vital sign types for debugging
    for (var sign in allVitals) {
      final formattedValue = sign.value is List
          ? '(${sign.value.length} items)'
          : sign.value.toString();
      print('  - ${sign.type}: $formattedValue');
    }

    // Group vitals by category for better organization
    final Map<String, List<VitalSign>> categorizedVitals = {
      'Primary Vitals': [],
      'Cardiovascular': [],
      'Stress & Wellness': [],
      'HRV Metrics': [],
      'ANS Balance': [],
      'Risk Assessment': [],
      'Blood Analysis': [],
      'Other': [],
    };

    for (var sign in allVitals) {
      final category = _getVitalCategory(sign.type);
      if (categorizedVitals.containsKey(category)) {
        categorizedVitals[category]!.add(sign);
      } else {
        categorizedVitals['Other']!.add(sign);
      }
    }

    // Remove empty categories
    categorizedVitals.removeWhere((key, value) => value.isEmpty);

    final filteredVitals = allVitals;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.8,
            maxWidth: MediaQuery.of(context).size.width * 0.9,
          ),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Colors.blue.shade50, Colors.white],
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.green.shade100,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.favorite,
                  size: 48,
                  color: Colors.green.shade700,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Measurement Complete',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                '${filteredVitals.length} vital signs measured',
                style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              Flexible(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: categorizedVitals.entries.map((entry) {
                      final category = entry.key;
                      final vitals = entry.value;

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Category Header
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 4,
                                vertical: 8,
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 4,
                                    height: 20,
                                    decoration: BoxDecoration(
                                      color: _getCategoryColor(category),
                                      borderRadius: BorderRadius.circular(2),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Text(
                                    category,
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.grey[800],
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: _getCategoryColor(
                                        category,
                                      ).withOpacity(0.2),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Text(
                                      '${vitals.length}',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        color: _getCategoryColor(category),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            // Vitals in this category
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: _getCategoryColor(
                                    category,
                                  ).withOpacity(0.2),
                                  width: 1,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.03),
                                    blurRadius: 8,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Column(
                                children: vitals.map((sign) {
                                  final vitalInfo = _getVitalSignInfo(sign);
                                  return Padding(
                                    padding: const EdgeInsets.symmetric(
                                      vertical: 8,
                                    ),
                                    child: Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.all(10),
                                          decoration: BoxDecoration(
                                            color: vitalInfo['color']
                                                .withOpacity(0.1),
                                            borderRadius: BorderRadius.circular(
                                              10,
                                            ),
                                          ),
                                          child: Icon(
                                            vitalInfo['icon'],
                                            color: vitalInfo['color'],
                                            size: 20,
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                vitalInfo['name'],
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.w600,
                                                  fontSize: 14,
                                                ),
                                              ),
                                              if (vitalInfo['unit']
                                                  .toString()
                                                  .isNotEmpty)
                                                Text(
                                                  vitalInfo['unit'],
                                                  style: TextStyle(
                                                    fontSize: 11,
                                                    color: Colors.grey[600],
                                                  ),
                                                ),
                                            ],
                                          ),
                                        ),
                                        Flexible(
                                          child: Text(
                                            _formatVitalValue(sign.value),
                                            style: TextStyle(
                                              fontSize: 20,
                                              fontWeight: FontWeight.bold,
                                              color: vitalInfo['color'],
                                            ),
                                            textAlign: TextAlign.right,
                                            overflow: TextOverflow.ellipsis,
                                            maxLines: 2,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        // Info button
                                        GestureDetector(
                                          onTap: () => _showVitalSignInfo(sign),
                                          child: Container(
                                            padding: const EdgeInsets.all(8),
                                            decoration: BoxDecoration(
                                              color: vitalInfo['color']
                                                  .withOpacity(0.1),
                                              borderRadius:
                                                  BorderRadius.circular(8),
                                              border: Border.all(
                                                color: vitalInfo['color']
                                                    .withOpacity(0.3),
                                                width: 1,
                                              ),
                                            ),
                                            child: Icon(
                                              Icons.info_outline,
                                              color: vitalInfo['color'],
                                              size: 16,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  );
                                }).toList(),
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close),
                      label: const Text('Close'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () async {
                        Navigator.pop(context);
                        if (_currentResults != null) {
                          await _saveVitalsResults(_currentResults!);
                        } else {
                          _showError('No results to save');
                        }
                      },
                      icon: const Icon(Icons.save),
                      label: const Text('Save'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue.shade700,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatVitalValue(dynamic value) {
    // Handle null values
    if (value == null) return 'N/A';

    // Handle lists/arrays (like RRI intervals)
    if (value is List) {
      // For RRI intervals, show count instead of full list
      return '${value.length} intervals';
    }

    // Handle double values
    if (value is double) {
      return value.toStringAsFixed(1);
    }

    // Handle all other values (int, string, etc.)
    return value.toString();
  }

  Color _getCategoryColor(String category) {
    switch (category) {
      case 'Primary Vitals':
        return Colors.blue.shade700;
      case 'Cardiovascular':
        return Colors.purple.shade700;
      case 'Stress & Wellness':
        return Colors.orange.shade700;
      case 'HRV Metrics':
        return Colors.teal.shade700;
      case 'ANS Balance':
        return Colors.green.shade700;
      case 'Risk Assessment':
        return Colors.red.shade700;
      case 'Blood Analysis':
        return Colors.pink.shade700;
      case 'Heart Health':
        return Colors.pinkAccent.shade700;
      default:
        return Colors.grey.shade700;
    }
  }

  String _getVitalCategory(int type) {
    // Primary vitals
    if (type == VitalSignTypes.pulseRate ||
        type == VitalSignTypes.respirationRate ||
        type == VitalSignTypes.oxygenSaturation) {
      return 'Primary Vitals';
    }

    // Cardiovascular
    if (type == VitalSignTypes.bloodPressure ||
        type == VitalSignTypes.meanArterialPressure ||
        type == VitalSignTypes.pulsePressure ||
        type == VitalSignTypes.cardiacWorkload) {
      return 'Cardiovascular';
    }

    // Stress & Wellness
    if (type == VitalSignTypes.stressLevel ||
        type == VitalSignTypes.stressIndex ||
        type == VitalSignTypes.wellnessLevel ||
        type == VitalSignTypes.wellnessIndex ||
        type == VitalSignTypes.normalizedStressIndex ||
        type == VitalSignTypes.bodyTensionScore) {
      return 'Stress & Wellness';
    }

    // HRV Metrics
    if (type == VitalSignTypes.sdnn ||
        type == VitalSignTypes.rmssd ||
        type == VitalSignTypes.rri ||
        type == VitalSignTypes.meanRri ||
        type == VitalSignTypes.sd1 ||
        type == VitalSignTypes.sd2 ||
        type == VitalSignTypes.prq ||
        type == VitalSignTypes.lfhf) {
      return 'HRV Metrics';
    }

    // ANS Balance
    if (type == VitalSignTypes.pnsIndex ||
        type == VitalSignTypes.pnsZone ||
        type == VitalSignTypes.snsIndex ||
        type == VitalSignTypes.snsZone) {
      return 'ANS Balance';
    }

    // Risk Assessment
    if (type == VitalSignTypes.highHemoglobinA1CRisk ||
        type == VitalSignTypes.highBloodPressureRisk ||
        type == VitalSignTypes.ascvdRisk ||
        type == VitalSignTypes.ascvdRiskLevel ||
        type == VitalSignTypes.highTotalCholesterolRisk ||
        type == VitalSignTypes.highFastingGlucoseRisk ||
        type == VitalSignTypes.lowHemoglobinRisk) {
      return 'Risk Assessment';
    }

    // Blood Analysis
    if (type == VitalSignTypes.hemoglobin ||
        type == VitalSignTypes.hemoglobinA1C) {
      return 'Blood Analysis';
    }

    // Heart Health
    if (type == VitalSignTypes.heartAge) {
      return 'Heart Health';
    }

    return 'Other';
  }

  Map<String, dynamic> _getVitalSignInfo(VitalSign sign) {
    final type = sign.type;

    // Primary Vitals
    if (type == VitalSignTypes.pulseRate) {
      return {
        'name': 'Heart Rate',
        'unit': 'bpm',
        'icon': Icons.favorite,
        'color': Colors.red.shade600,
      };
    }
    if (type == VitalSignTypes.respirationRate) {
      return {
        'name': 'Respiration Rate',
        'unit': 'breaths/min',
        'icon': Icons.air,
        'color': Colors.blue.shade600,
      };
    }
    if (type == VitalSignTypes.oxygenSaturation) {
      return {
        'name': 'Oxygen Saturation',
        'unit': 'SpO2 %',
        'icon': Icons.water_drop,
        'color': Colors.cyan.shade600,
      };
    }

    // Cardiovascular
    if (type == VitalSignTypes.bloodPressure) {
      return {
        'name': 'Blood Pressure',
        'unit': 'mmHg',
        'icon': Icons.monitor_heart,
        'color': Colors.purple.shade600,
      };
    }
    if (type == VitalSignTypes.meanArterialPressure) {
      return {
        'name': 'Mean Arterial Pressure',
        'unit': 'mmHg',
        'icon': Icons.show_chart,
        'color': Colors.purple.shade500,
      };
    }
    if (type == VitalSignTypes.pulsePressure) {
      return {
        'name': 'Pulse Pressure',
        'unit': 'mmHg',
        'icon': Icons.graphic_eq,
        'color': Colors.purple.shade400,
      };
    }
    if (type == VitalSignTypes.cardiacWorkload) {
      return {
        'name': 'Cardiac Workload',
        'unit': '',
        'icon': Icons.fitness_center,
        'color': Colors.deepPurple.shade600,
      };
    }

    // Stress & Wellness
    if (type == VitalSignTypes.stressLevel) {
      return {
        'name': 'Stress Level',
        'unit': '',
        'icon': Icons.psychology,
        'color': Colors.orange.shade600,
      };
    }
    if (type == VitalSignTypes.stressIndex) {
      return {
        'name': 'Stress Index',
        'unit': '',
        'icon': Icons.trending_up,
        'color': Colors.orange.shade500,
      };
    }
    if (type == VitalSignTypes.normalizedStressIndex) {
      return {
        'name': 'Normalized Stress Index',
        'unit': '',
        'icon': Icons.insights,
        'color': Colors.orange.shade400,
      };
    }
    if (type == VitalSignTypes.wellnessLevel) {
      return {
        'name': 'Wellness Level',
        'unit': '',
        'icon': Icons.health_and_safety,
        'color': Colors.green.shade600,
      };
    }
    if (type == VitalSignTypes.wellnessIndex) {
      return {
        'name': 'Wellness Index',
        'unit': '',
        'icon': Icons.eco,
        'color': Colors.green.shade500,
      };
    }
    if (type == VitalSignTypes.bodyTensionScore) {
      return {
        'name': 'Body Tension Score',
        'unit': '',
        'icon': Icons.sports_martial_arts,
        'color': Colors.deepOrange.shade600,
      };
    }

    // HRV Metrics
    if (type == VitalSignTypes.sdnn) {
      return {
        'name': 'SDNN',
        'unit': 'ms',
        'icon': Icons.show_chart,
        'color': Colors.teal.shade600,
      };
    }
    if (type == VitalSignTypes.rmssd) {
      return {
        'name': 'RMSSD',
        'unit': 'ms',
        'icon': Icons.analytics,
        'color': Colors.teal.shade500,
      };
    }
    if (type == VitalSignTypes.rri) {
      return {
        'name': 'RR Interval',
        'unit': 'ms',
        'icon': Icons.timeline,
        'color': Colors.teal.shade400,
      };
    }
    if (type == VitalSignTypes.meanRri) {
      return {
        'name': 'Mean RR Interval',
        'unit': 'ms',
        'icon': Icons.assessment,
        'color': Colors.teal.shade300,
      };
    }
    if (type == VitalSignTypes.sd1) {
      return {
        'name': 'SD1',
        'unit': 'ms',
        'icon': Icons.scatter_plot,
        'color': Colors.cyan.shade600,
      };
    }
    if (type == VitalSignTypes.sd2) {
      return {
        'name': 'SD2',
        'unit': 'ms',
        'icon': Icons.scatter_plot,
        'color': Colors.cyan.shade500,
      };
    }
    if (type == VitalSignTypes.prq) {
      return {
        'name': 'PRQ',
        'unit': '',
        'icon': Icons.query_stats,
        'color': Colors.lightBlue.shade600,
      };
    }
    if (type == VitalSignTypes.lfhf) {
      return {
        'name': 'LF/HF Ratio',
        'unit': '',
        'icon': Icons.equalizer,
        'color': Colors.indigo.shade600,
      };
    }

    // ANS Balance
    if (type == VitalSignTypes.pnsIndex) {
      return {
        'name': 'PNS Index',
        'unit': '',
        'icon': Icons.spa,
        'color': Colors.green.shade400,
      };
    }
    if (type == VitalSignTypes.pnsZone) {
      return {
        'name': 'PNS Zone',
        'unit': '',
        'icon': Icons.self_improvement,
        'color': Colors.lightGreen.shade600,
      };
    }
    if (type == VitalSignTypes.snsIndex) {
      return {
        'name': 'SNS Index',
        'unit': '',
        'icon': Icons.flash_on,
        'color': Colors.amber.shade600,
      };
    }
    if (type == VitalSignTypes.snsZone) {
      return {
        'name': 'SNS Zone',
        'unit': '',
        'icon': Icons.person_outline,
        'color': Colors.orange.shade300,
      };
    }

    // Risk Assessment
    if (type == VitalSignTypes.highHemoglobinA1CRisk) {
      return {
        'name': 'High HbA1c Risk',
        'unit': '',
        'icon': Icons.warning,
        'color': Colors.red.shade400,
      };
    }
    if (type == VitalSignTypes.highBloodPressureRisk) {
      return {
        'name': 'High BP Risk',
        'unit': '',
        'icon': Icons.warning_amber,
        'color': Colors.red.shade500,
      };
    }
    if (type == VitalSignTypes.ascvdRisk) {
      return {
        'name': 'ASCVD Risk',
        'unit': '%',
        'icon': Icons.heart_broken,
        'color': Colors.red.shade600,
      };
    }
    if (type == VitalSignTypes.ascvdRiskLevel) {
      return {
        'name': 'ASCVD Risk Level',
        'unit': '',
        'icon': Icons.security,
        'color': Colors.red.shade700,
      };
    }
    if (type == VitalSignTypes.highTotalCholesterolRisk) {
      return {
        'name': 'High Cholesterol Risk',
        'unit': '',
        'icon': Icons.warning_rounded,
        'color': Colors.deepOrange.shade600,
      };
    }
    if (type == VitalSignTypes.highFastingGlucoseRisk) {
      return {
        'name': 'High Glucose Risk',
        'unit': '',
        'icon': Icons.report_problem,
        'color': Colors.orange.shade700,
      };
    }
    if (type == VitalSignTypes.lowHemoglobinRisk) {
      return {
        'name': 'Low Hemoglobin Risk',
        'unit': '',
        'icon': Icons.error_outline,
        'color': Colors.amber.shade700,
      };
    }

    // Blood Analysis
    if (type == VitalSignTypes.hemoglobin) {
      return {
        'name': 'Hemoglobin',
        'unit': 'g/dL',
        'icon': Icons.bloodtype,
        'color': Colors.red.shade800,
      };
    }
    if (type == VitalSignTypes.hemoglobinA1C) {
      return {
        'name': 'Hemoglobin A1C',
        'unit': '%',
        'icon': Icons.science,
        'color': Colors.pink.shade600,
      };
    }

    // Heart Health
    if (type == VitalSignTypes.heartAge) {
      return {
        'name': 'Heart Age',
        'unit': 'years',
        'icon': Icons.cake,
        'color': Colors.pinkAccent.shade400,
      };
    }

    // Default fallback
    return {
      'name': 'Vital Sign (${type.toRadixString(16)})',
      'unit': '',
      'icon': Icons.monitor_heart_outlined,
      'color': Colors.grey.shade600,
    };
  }

  @override
  Widget build(BuildContext context) {
    final service = ref.watch(bioSenseServiceProvider);
    final theme = Theme.of(context);

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [theme.colorScheme.primary.withOpacity(0.1), Colors.white],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Custom App Bar
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.arrow_back),
                      style: IconButton.styleFrom(
                        backgroundColor: Colors.white,
                        padding: const EdgeInsets.all(12),
                      ),
                    ),
                    const SizedBox(width: 16),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Vital Signs Scanner',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            'Measure your health vitals',
                            style: TextStyle(fontSize: 14, color: Colors.grey),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: _isSessionCreated
                            ? Colors.green.shade100
                            : Colors.grey.shade200,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: _isSessionCreated
                                  ? Colors.green
                                  : Colors.grey,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            _isSessionCreated ? 'Ready' : 'Offline',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: _isSessionCreated
                                  ? Colors.green.shade700
                                  : Colors.grey.shade700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // Camera Preview
              Expanded(
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.1),
                        blurRadius: 20,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(24),
                    child: Stack(
                      children: [
                        // Camera view or placeholder (Fix 5: show camera only when session past initializing, like SampleApp)
                        _isSessionCreated
                            ? ValueListenableBuilder<SessionState?>(
                                valueListenable: service.sessionStateNotifier,
                                builder: (context, state, _) {
                                  if (state == null ||
                                      state == SessionState.initializing) {
                                    return Container(
                                      color: Colors.grey.shade900,
                                      child: Center(
                                        child: Column(
                                          mainAxisAlignment:
                                              MainAxisAlignment.center,
                                          children: [
                                            const SizedBox(
                                              width: 32,
                                              height: 32,
                                              child: CircularProgressIndicator(
                                                strokeWidth: 3,
                                              ),
                                            ),
                                            const SizedBox(height: 16),
                                            Text(
                                              'Preparing camera...',
                                              style: TextStyle(
                                                color: Colors.grey[400],
                                                fontSize: 16,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    );
                                  }
                                  return Stack(
                                    children: [
                                      const CameraPreviewView(),
                                      if (!_isMeasuring)
                                        FaceGuideOverlay(
                                          imageData: ref
                                              .watch(bioSenseServiceProvider)
                                              .imageDataNotifier
                                              .value,
                                        ),
                                      if (_isMeasuring)
                                        ScanningAnimationOverlay(
                                          imageData: ref
                                              .watch(bioSenseServiceProvider)
                                              .imageDataNotifier
                                              .value,
                                        ),
                                    ],
                                  );
                                },
                              )
                            : Container(
                                color: Colors.grey.shade900,
                                child: Center(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        Icons.camera_alt_outlined,
                                        size: 80,
                                        color: Colors.grey[700],
                                      ),
                                      const SizedBox(height: 24),
                                      Text(
                                        'Camera Not Initialized',
                                        style: TextStyle(
                                          color: Colors.grey[400],
                                          fontSize: 18,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        'Tap the button below to start',
                                        style: TextStyle(
                                          color: Colors.grey[600],
                                          fontSize: 14,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),

                        // Enhanced measurement overlay with progress
                        if (_isMeasuring)
                          Container(
                            color: Colors.black.withOpacity(0.3),
                            child: Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  // Circular progress indicator
                                  Stack(
                                    alignment: Alignment.center,
                                    children: [
                                      // Background circle
                                      Container(
                                        width: 180,
                                        height: 180,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          border: Border.all(
                                            color: Colors.white.withOpacity(
                                              0.2,
                                            ),
                                            width: 8,
                                          ),
                                        ),
                                      ),
                                      // Progress circle
                                      SizedBox(
                                        width: 180,
                                        height: 180,
                                        child: CircularProgressIndicator(
                                          value:
                                              _elapsedSeconds /
                                              _measurementDuration,
                                          strokeWidth: 8,
                                          backgroundColor: Colors.transparent,
                                          valueColor:
                                              AlwaysStoppedAnimation<Color>(
                                                Color.lerp(
                                                  Colors.greenAccent,
                                                  Colors.blueAccent,
                                                  _elapsedSeconds /
                                                      _measurementDuration,
                                                )!,
                                              ),
                                        ),
                                      ),
                                      // Center content
                                      Column(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          // Pulsing heart
                                          AnimatedBuilder(
                                            animation: _pulseController,
                                            builder: (context, child) {
                                              return Transform.scale(
                                                scale:
                                                    1.0 +
                                                    (_pulseController.value *
                                                        0.2),
                                                child: Icon(
                                                  Icons.favorite,
                                                  color: Color.lerp(
                                                    Colors.red.shade300,
                                                    Colors.red.shade600,
                                                    _pulseController.value,
                                                  ),
                                                  size: 40,
                                                ),
                                              );
                                            },
                                          ),
                                          const SizedBox(height: 12),
                                          // Time remaining
                                          Text(
                                            '${_measurementDuration - _elapsedSeconds}s',
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 32,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            'remaining',
                                            style: TextStyle(
                                              color: Colors.white.withOpacity(
                                                0.7,
                                              ),
                                              fontSize: 14,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),

                                  const SizedBox(height: 40),

                                  // Percentage
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 24,
                                      vertical: 12,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(
                                        color: Colors.white.withOpacity(0.3),
                                        width: 1,
                                      ),
                                    ),
                                    child: Text(
                                      '${((_elapsedSeconds / _measurementDuration) * 100).toInt()}%',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 24,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),

                                  const SizedBox(height: 40),

                                  // Instructions
                                  Container(
                                    margin: const EdgeInsets.symmetric(
                                      horizontal: 32,
                                    ),
                                    padding: const EdgeInsets.all(20),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(16),
                                      border: Border.all(
                                        color: Colors.white.withOpacity(0.2),
                                        width: 1,
                                      ),
                                    ),
                                    child: Column(
                                      children: [
                                        Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.center,
                                          children: [
                                            Icon(
                                              Icons.face_retouching_natural,
                                              color: Colors.white.withOpacity(
                                                0.9,
                                              ),
                                              size: 24,
                                            ),
                                            const SizedBox(width: 12),
                                            const Text(
                                              'Scanning in Progress',
                                              style: TextStyle(
                                                color: Colors.white,
                                                fontSize: 18,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 16),
                                        Text(
                                          '• Keep your face clearly visible in the frame',
                                          style: TextStyle(
                                            color: Colors.white.withOpacity(
                                              0.9,
                                            ),
                                            fontSize: 14,
                                            height: 1.5,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        Text(
                                          '• Stay still and breathe normally',
                                          style: TextStyle(
                                            color: Colors.white.withOpacity(
                                              0.8,
                                            ),
                                            fontSize: 14,
                                            height: 1.5,
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        Text(
                                          '• Avoid talking or moving',
                                          style: TextStyle(
                                            color: Colors.white.withOpacity(
                                              0.8,
                                            ),
                                            fontSize: 14,
                                            height: 1.5,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),

                        // Session state indicator
                        ValueListenableBuilder<SessionState?>(
                          valueListenable: service.sessionStateNotifier,
                          builder: (context, state, _) {
                            if (state == null ||
                                !_isSessionCreated ||
                                _isMeasuring) {
                              return const SizedBox.shrink();
                            }
                            return Positioned(
                              top: 16,
                              right: 16,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 8,
                                ),
                                decoration: BoxDecoration(
                                  color: _getStateColor(state).withOpacity(0.9),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      _getStateIcon(state),
                                      color: Colors.white,
                                      size: 16,
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      _getStateText(state),
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              // Controls Section
              Container(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    // Info: Fixed measurement duration
                    if (_isSessionCreated && !_isMeasuring)
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.blue.shade50,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: Colors.blue.shade200,
                            width: 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: Colors.blue.shade100,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(
                                Icons.timer,
                                color: Colors.blue.shade700,
                                size: 24,
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Measurement Duration',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w600,
                                      fontSize: 14,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Optimized for accurate results',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey[600],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 8,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.blue.shade700,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Text(
                                '60 sec',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                    const SizedBox(height: 16),

                    // Control Buttons
                    if (!_isSessionCreated)
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _isInitializing
                              ? null
                              : _initializeSession,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: theme.colorScheme.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 18),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                            elevation: 4,
                          ),
                          child: _isInitializing
                              ? const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    ),
                                    SizedBox(width: 12),
                                    Text(
                                      'Initializing Camera...',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                )
                              : const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.camera_alt, size: 24),
                                    SizedBox(width: 12),
                                    Text(
                                      'Initialize Camera',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                        ),
                      )
                    else if (!_isMeasuring)
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: _resetSession,
                              icon: const Icon(Icons.refresh),
                              label: const Text('Reset'),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(
                                  vertical: 18,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: _startMeasurement,
                              icon: const Icon(Icons.play_circle, size: 24),
                              label: const Text('Start Measurement'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.green.shade600,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                  vertical: 18,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                elevation: 4,
                              ),
                            ),
                          ),
                        ],
                      )
                    else
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _stopMeasurement,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.red.shade600,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 18),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                            elevation: 4,
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.stop_circle, size: 24),
                              SizedBox(width: 12),
                              Text(
                                'Stop Measurement',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                    // Error Display
                    ValueListenableBuilder<String?>(
                      valueListenable: service.errorNotifier,
                      builder: (context, error, _) {
                        if (error == null) return const SizedBox.shrink();
                        return Container(
                          margin: const EdgeInsets.only(top: 12),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.red.shade50,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: Colors.red.shade200,
                              width: 1,
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.error_outline,
                                color: Colors.red.shade700,
                                size: 20,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  error,
                                  style: TextStyle(
                                    color: Colors.red.shade700,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),

                    // Listen for final results
                    ValueListenableBuilder<VitalSignsResults?>(
                      valueListenable: service.finalResultsNotifier,
                      builder: (context, results, _) {
                        if (results != null) {
                          WidgetsBinding.instance.addPostFrameCallback((_) {
                            _stopTimer();
                            setState(() {
                              _isMeasuring = false;
                            });
                            _showResults(results);
                            service.finalResultsNotifier.value = null;

                            // Auto-reset session after showing results to prepare for next scan
                            Future.delayed(const Duration(seconds: 2), () {
                              if (mounted) {
                                _resetSession();
                              }
                            });
                          });
                        }
                        return const SizedBox.shrink();
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _getStateIcon(SessionState? state) {
    if (state == null) return Icons.help_outline;
    switch (state) {
      case SessionState.initializing:
        return Icons.refresh;
      case SessionState.ready:
        return Icons.check_circle;
      case SessionState.starting:
        return Icons.play_arrow;
      case SessionState.processing:
        return Icons.timer;
      case SessionState.stopping:
        return Icons.stop;
      case SessionState.terminating:
        return Icons.close;
      case SessionState.terminated:
        return Icons.cancel;
    }
  }

  Color _getStateColor(SessionState? state) {
    if (state == null) return Colors.grey;
    switch (state) {
      case SessionState.initializing:
        return Colors.blue;
      case SessionState.ready:
        return Colors.green;
      case SessionState.starting:
        return Colors.orange;
      case SessionState.processing:
        return Colors.purple;
      case SessionState.stopping:
        return Colors.orange;
      case SessionState.terminating:
        return Colors.red;
      case SessionState.terminated:
        return Colors.grey;
    }
  }

  String _getStateText(SessionState? state) {
    if (state == null) return 'Unknown';
    return state.toString().split('.').last.toUpperCase();
  }
}

/// Face guide overlay widget to help users position their face correctly
class FaceGuideOverlay extends StatelessWidget {
  final ImageData? imageData;

  const FaceGuideOverlay({super.key, this.imageData});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Darkened background with cutout
        CustomPaint(size: Size.infinite, painter: FaceFramePainter()),

        // Positioning instructions at top
        Positioned(
          top: 40,
          left: 0,
          right: 0,
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 32),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.7),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.face, color: Colors.white, size: 20),
                SizedBox(width: 8),
                Flexible(
                  child: Text(
                    'Position your face in the frame',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
            ),
          ),
        ),

        // Tips at bottom
        Positioned(
          bottom: 40,
          left: 0,
          right: 0,
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 20),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.75),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.green.withOpacity(0.2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.check_circle,
                        color: Colors.greenAccent,
                        size: 16,
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'Keep still and look at the camera',
                        style: TextStyle(color: Colors.white, fontSize: 13),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.blue.withOpacity(0.2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.light_mode,
                        color: Colors.blueAccent,
                        size: 16,
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'Ensure good lighting on your face',
                        style: TextStyle(color: Colors.white, fontSize: 13),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.orange.withOpacity(0.2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.straighten,
                        color: Colors.orangeAccent,
                        size: 16,
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'Fill the oval frame with your face',
                        style: TextStyle(color: Colors.white, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),

        // Guidance flags for real-time warnings
        AnimatedGuidanceFlagsWidget(imageData: imageData, isVisible: true),
      ],
    );
  }
}

/// Custom painter for the face frame guide
class FaceFramePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final centerX = size.width / 2;
    final centerY = size.height / 2;

    // Oval dimensions (face guide) - increased for better face positioning
    final ovalWidth = size.width * 0.7;
    final ovalHeight = size.height * 0.6;

    // Create the face guide oval
    final ovalRect = Rect.fromCenter(
      center: Offset(centerX, centerY - 20),
      width: ovalWidth,
      height: ovalHeight,
    );

    // Create a path for the darkened area with transparent oval cutout
    final path = Path()
      ..addRect(Rect.fromLTWH(0, 0, size.width, size.height))
      ..addOval(ovalRect)
      ..fillType = PathFillType.evenOdd;

    // Draw semi-transparent overlay
    final overlayPaint = Paint()
      ..color = Colors.black.withOpacity(0.5)
      ..style = PaintingStyle.fill;
    canvas.drawPath(path, overlayPaint);

    // Draw the oval frame with gradient effect
    final framePaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..shader = LinearGradient(
        colors: [
          Colors.greenAccent.withOpacity(0.8),
          Colors.blueAccent.withOpacity(0.8),
          Colors.greenAccent.withOpacity(0.8),
        ],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ).createShader(ovalRect);
    canvas.drawOval(ovalRect, framePaint);

    // Draw corner guides
    _drawCornerGuides(canvas, ovalRect);

    // Draw center crosshair
    _drawCenterCrosshair(canvas, centerX, centerY - 20);
  }

  void _drawCornerGuides(Canvas canvas, Rect ovalRect) {
    final cornerPaint = Paint()
      ..color = Colors.white.withOpacity(0.9)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;

    final cornerLength = 20.0;
    final positions = [
      // Top-left
      {
        'x': ovalRect.left,
        'y': ovalRect.top,
        'angles': [0, 270],
      },
      // Top-right
      {
        'x': ovalRect.right,
        'y': ovalRect.top,
        'angles': [180, 270],
      },
      // Bottom-left
      {
        'x': ovalRect.left,
        'y': ovalRect.bottom,
        'angles': [0, 90],
      },
      // Bottom-right
      {
        'x': ovalRect.right,
        'y': ovalRect.bottom,
        'angles': [180, 90],
      },
    ];

    for (var pos in positions) {
      final x = pos['x'] as double;
      final y = pos['y'] as double;
      final angles = pos['angles'] as List<int>;

      // Horizontal line
      if (angles[0] == 0) {
        canvas.drawLine(Offset(x, y), Offset(x + cornerLength, y), cornerPaint);
      } else {
        canvas.drawLine(Offset(x, y), Offset(x - cornerLength, y), cornerPaint);
      }

      // Vertical line
      if (angles[1] == 270) {
        canvas.drawLine(Offset(x, y), Offset(x, y - cornerLength), cornerPaint);
      } else {
        canvas.drawLine(Offset(x, y), Offset(x, y + cornerLength), cornerPaint);
      }
    }
  }

  void _drawCenterCrosshair(Canvas canvas, double centerX, double centerY) {
    final crosshairPaint = Paint()
      ..color = Colors.white.withOpacity(0.3)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;

    const crosshairSize = 15.0;

    // Horizontal line
    canvas.drawLine(
      Offset(centerX - crosshairSize, centerY),
      Offset(centerX + crosshairSize, centerY),
      crosshairPaint,
    );

    // Vertical line
    canvas.drawLine(
      Offset(centerX, centerY - crosshairSize),
      Offset(centerX, centerY + crosshairSize),
      crosshairPaint,
    );

    // Center dot
    canvas.drawCircle(
      Offset(centerX, centerY),
      2,
      Paint()
        ..color = Colors.white.withOpacity(0.5)
        ..style = PaintingStyle.fill,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Scanning animation overlay during vital signs measurement
class ScanningAnimationOverlay extends StatefulWidget {
  final ImageData? imageData;

  const ScanningAnimationOverlay({super.key, this.imageData});

  @override
  State<ScanningAnimationOverlay> createState() =>
      _ScanningAnimationOverlayState();
}

class _ScanningAnimationOverlayState extends State<ScanningAnimationOverlay>
    with SingleTickerProviderStateMixin {
  late AnimationController _scanController;
  late Animation<double> _scanAnimation;

  @override
  void initState() {
    super.initState();
    _scanController = AnimationController(
      duration: const Duration(milliseconds: 2500),
      vsync: this,
    )..repeat(reverse: true);

    _scanAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _scanController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _scanController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Semi-transparent overlay with face cutout
        CustomPaint(size: Size.infinite, painter: ScanningOverlayPainter()),

        // Face frame during scanning (prominent and visible)
        CustomPaint(size: Size.infinite, painter: ScanningFramePainter()),

        // Scanning line animation
        AnimatedBuilder(
          animation: _scanAnimation,
          builder: (context, child) {
            return CustomPaint(
              size: Size.infinite,
              painter: ScanLinePainter(progress: _scanAnimation.value),
            );
          },
        ),

        // Guidance flags for real-time warnings
        AnimatedGuidanceFlagsWidget(
          imageData: widget.imageData,
          isVisible: true,
        ),

        // Corner indicators
        Positioned.fill(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final centerX = constraints.maxWidth / 2;
              final centerY = constraints.maxHeight / 2;
              final ovalWidth = constraints.maxWidth * 0.7;
              final ovalHeight = constraints.maxHeight * 0.6;

              return Stack(
                children: [
                  // Top-left corner
                  Positioned(
                    left: centerX - ovalWidth / 2 - 10,
                    top: centerY - ovalHeight / 2 - 30,
                    child: _buildCornerIndicator(),
                  ),
                  // Top-right corner
                  Positioned(
                    right: centerX - ovalWidth / 2 - 10,
                    top: centerY - ovalHeight / 2 - 30,
                    child: _buildCornerIndicator(),
                  ),
                  // Bottom-left corner
                  Positioned(
                    left: centerX - ovalWidth / 2 - 10,
                    bottom:
                        constraints.maxHeight - (centerY + ovalHeight / 2) - 10,
                    child: _buildCornerIndicator(),
                  ),
                  // Bottom-right corner
                  Positioned(
                    right: centerX - ovalWidth / 2 - 10,
                    bottom:
                        constraints.maxHeight - (centerY + ovalHeight / 2) - 10,
                    child: _buildCornerIndicator(),
                  ),
                ],
              );
            },
          ),
        ),

        // Status badge at top
        Positioned(
          top: 20,
          left: 0,
          right: 0,
          child: Center(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.9),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.green.withOpacity(0.3),
                    blurRadius: 8,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SizedBox(
                    width: 12,
                    height: 12,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'SCANNING',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.2,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCornerIndicator() {
    return AnimatedBuilder(
      animation: _scanAnimation,
      builder: (context, child) {
        return Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: Color.lerp(
              Colors.greenAccent,
              Colors.blueAccent,
              _scanAnimation.value,
            ),
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: Color.lerp(
                  Colors.greenAccent,
                  Colors.blueAccent,
                  _scanAnimation.value,
                )!.withOpacity(0.8),
                blurRadius: 12,
                spreadRadius: 3,
              ),
            ],
          ),
        );
      },
    );
  }
}

/// Custom painter for the scanning overlay with face cutout
class ScanningOverlayPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final centerX = size.width / 2;
    final centerY = size.height / 2;

    // Oval dimensions for face area
    final ovalWidth = size.width * 0.7;
    final ovalHeight = size.height * 0.6;

    final ovalRect = Rect.fromCenter(
      center: Offset(centerX, centerY - 20),
      width: ovalWidth,
      height: ovalHeight,
    );

    // Create a path for the darkened area with transparent oval cutout
    final path = Path()
      ..addRect(Rect.fromLTWH(0, 0, size.width, size.height))
      ..addOval(ovalRect)
      ..fillType = PathFillType.evenOdd;

    // Draw semi-transparent overlay with face cutout
    final overlayPaint = Paint()
      ..color = Colors.black.withOpacity(0.4)
      ..style = PaintingStyle.fill;
    canvas.drawPath(path, overlayPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Custom painter for the scanning frame
class ScanningFramePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final centerX = size.width / 2;
    final centerY = size.height / 2;

    // Oval dimensions - increased for better face positioning
    final ovalWidth = size.width * 0.7;
    final ovalHeight = size.height * 0.6;

    final ovalRect = Rect.fromCenter(
      center: Offset(centerX, centerY - 20),
      width: ovalWidth,
      height: ovalHeight,
    );

    // Draw prominent oval frame for better visibility
    final framePaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..color = Colors.greenAccent.withOpacity(0.8);

    canvas.drawOval(ovalRect, framePaint);

    // Draw inner glow effect
    final glowPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..color = Colors.white.withOpacity(0.6)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3);

    canvas.drawOval(ovalRect, glowPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Custom painter for the scanning line
class ScanLinePainter extends CustomPainter {
  final double progress;

  ScanLinePainter({required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    final centerX = size.width / 2;
    final centerY = size.height / 2;

    // Oval dimensions - increased for better face positioning
    final ovalWidth = size.width * 0.7;
    final ovalHeight = size.height * 0.6;

    final ovalTop = centerY - 20 - ovalHeight / 2;
    final ovalBottom = centerY - 20 + ovalHeight / 2;

    // Calculate scan line position
    final scanY = ovalTop + (ovalBottom - ovalTop) * progress;

    // Draw scan line with gradient
    final gradient = LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [
        Colors.transparent,
        Colors.greenAccent.withOpacity(0.8),
        Colors.blueAccent.withOpacity(0.8),
        Colors.transparent,
      ],
      stops: const [0.0, 0.4, 0.6, 1.0],
    );

    final paint = Paint()
      ..shader = gradient.createShader(
        Rect.fromCenter(
          center: Offset(centerX, scanY),
          width: ovalWidth * 0.9,
          height: 20,
        ),
      )
      ..strokeWidth = 3
      ..style = PaintingStyle.fill;

    // Draw the scan line
    canvas.drawRect(
      Rect.fromCenter(
        center: Offset(centerX, scanY),
        width: ovalWidth * 0.9,
        height: 3,
      ),
      paint,
    );

    // Draw scan line glow
    final glowPaint = Paint()
      ..color = Color.lerp(
        Colors.greenAccent,
        Colors.blueAccent,
        progress,
      )!.withOpacity(0.3)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 10);

    canvas.drawRect(
      Rect.fromCenter(
        center: Offset(centerX, scanY),
        width: ovalWidth * 0.9,
        height: 8,
      ),
      glowPaint,
    );
  }

  @override
  bool shouldRepaint(ScanLinePainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}
