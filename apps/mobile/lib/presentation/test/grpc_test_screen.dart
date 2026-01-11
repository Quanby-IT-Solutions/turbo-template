import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/providers/vitals_providers.dart';

class GrpcTestScreen extends ConsumerStatefulWidget {
  const GrpcTestScreen({super.key});

  @override
  ConsumerState<GrpcTestScreen> createState() => _GrpcTestScreenState();
}

class _GrpcTestScreenState extends ConsumerState<GrpcTestScreen> {
  String _patientId = 'test-patient-123';
  final _patientIdController = TextEditingController(text: 'test-patient-123');
  bool _isPolling = false;
  Timer? _pollTimer;
  Map<String, dynamic>? _currentVitals;
  bool _isLoading = false;
  String? _error;

  String get _serverAddress => ref.read(vitalsApiServiceProvider).baseUrl;

  @override
  void initState() {
    super.initState();
    _patientIdController.text = _patientId;
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _patientIdController.dispose();
    super.dispose();
  }

  void _togglePolling() {
    setState(() {
      _isPolling = !_isPolling;
      if (_isPolling) {
        _patientId = _patientIdController.text;
        _error = null;
        _startPolling();
      } else {
        _stopPolling();
      }
    });
  }

  void _startPolling() {
    // Fetch immediately
    _fetchLatestVitals();

    // Then poll every second
    _pollTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      _fetchLatestVitals();
    });
  }

  void _stopPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  Future<void> _fetchLatestVitals() async {
    if (!mounted) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final vitalsService = ref.read(vitalsApiServiceProvider);
      final vitals = await vitalsService.getLatestVitals(_patientId);

      if (mounted) {
        setState(() {
          _currentVitals = vitals;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Vitals Monitor Test'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Connection info card
            Card(
              color: Colors.blue.shade50,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.cloud_outlined, color: Colors.blue.shade700),
                        const SizedBox(width: 8),
                        Text(
                          'Backend Connection',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.blue.shade700,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Server: $_serverAddress',
                      style: TextStyle(
                        color: Colors.blue.shade900,
                        fontSize: 12,
                        fontFamily: 'monospace',
                      ),
                    ),
                    Text(
                      'Protocol: HTTP/REST → gRPC (Polling)',
                      style: TextStyle(
                        color: Colors.blue.shade700,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Patient ID input
            TextField(
              controller: _patientIdController,
              enabled: !_isPolling,
              decoration: InputDecoration(
                labelText: 'Patient ID',
                border: const OutlineInputBorder(),
                prefixIcon: const Icon(Icons.person),
                suffixIcon: _isPolling
                    ? const Icon(Icons.lock, color: Colors.grey)
                    : null,
              ),
            ),
            const SizedBox(height: 16),

            // Start/Stop button
            ElevatedButton.icon(
              onPressed: _togglePolling,
              icon: Icon(_isPolling ? Icons.stop : Icons.play_arrow),
              label: Text(_isPolling ? 'Stop Monitoring' : 'Start Monitoring'),
              style: ElevatedButton.styleFrom(
                backgroundColor: _isPolling ? Colors.red : Colors.green,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.all(16),
              ),
            ),
            const SizedBox(height: 24),

            // Vitals display
            Expanded(child: _buildVitalsView()),
          ],
        ),
      ),
    );
  }

  Widget _buildVitalsView() {
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 80, color: Colors.red.shade300),
            const SizedBox(height: 16),
            Text(
              'Connection Error',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.red.shade700,
              ),
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Text(
                _error!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.red),
              ),
            ),
          ],
        ),
      );
    }

    if (_currentVitals == null && !_isPolling) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.favorite, size: 100, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text(
              'Ready to monitor vitals',
              style: TextStyle(fontSize: 18, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 8),
            Text(
              'Enter a patient ID and tap "Start Monitoring"',
              style: TextStyle(color: Colors.grey.shade500, fontSize: 14),
            ),
          ],
        ),
      );
    }

    if (_currentVitals == null && _isLoading) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Fetching vitals...'),
          ],
        ),
      );
    }

    return _buildVitalsDisplay(_currentVitals!);
  }

  Widget _buildVitalsDisplay(Map<String, dynamic> vitals) {
    print('🔍 Vitals data: $vitals'); // Debug log

    // gRPC response uses camelCase field names
    final heartRate = vitals['heartRate']?.toString() ?? '--';
    final spo2 = vitals['spo2']?.toString() ?? '--';
    final systolic =
        vitals['systolicBp']?.toString() ??
        '--'; // Changed from bloodPressure.systolic
    final diastolic =
        vitals['diastolicBp']?.toString() ??
        '--'; // Changed from bloodPressure.diastolic
    final temperature = vitals['temperature']?.toString() ?? '--';
    final respiratoryRate =
        vitals['respiratoryRate']?.toString() ?? '--'; // Added
    final alertLevel = vitals['alertLevel']?.toString() ?? '0';
    final timestamp =
        vitals['recordedAt']?.toString() ?? ''; // Changed from timestamp

    // Map alert level number to string
    final alertLevelText = _getAlertLevelText(alertLevel);

    return SingleChildScrollView(
      child: Column(
        children: [
          // Timestamp
          if (timestamp.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 16.0),
              child: Text(
                'Last Update: ${_formatTimestamp(timestamp)}',
                style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
              ),
            ),

          // Alert level badge
          if (alertLevelText != 'NORMAL')
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: _getAlertColor(alertLevelText).withOpacity(0.2),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: _getAlertColor(alertLevelText),
                  width: 2,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.warning_amber_rounded,
                    color: _getAlertColor(alertLevelText),
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Alert: $alertLevelText',
                    style: TextStyle(
                      color: _getAlertColor(alertLevelText),
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
            ),

          // Vitals cards
          _buildVitalRow(
            Icons.favorite,
            'Heart Rate',
            '$heartRate BPM',
            Colors.red,
          ),
          const SizedBox(height: 12),
          _buildVitalRow(Icons.air, 'SpO2', '$spo2%', Colors.blue),
          const SizedBox(height: 12),
          _buildVitalRow(
            Icons.monitor_heart,
            'Blood Pressure',
            '$systolic/$diastolic mmHg',
            Colors.purple,
          ),
          const SizedBox(height: 12),
          _buildVitalRow(
            Icons.thermostat,
            'Temperature',
            '$temperature°C',
            Colors.orange,
          ),
          const SizedBox(height: 12),
          _buildVitalRow(
            Icons.air_outlined,
            'Respiratory Rate',
            '$respiratoryRate br/min',
            Colors.teal,
          ),

          const SizedBox(height: 24),

          // Connection status
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.green.shade50,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 12,
                  height: 12,
                  decoration: const BoxDecoration(
                    color: Colors.green,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                const Text(
                  'Live Stream Active',
                  style: TextStyle(
                    color: Colors.green,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatTimestamp(String timestamp) {
    try {
      final dt = DateTime.parse(timestamp);
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}:${dt.second.toString().padLeft(2, '0')}';
    } catch (e) {
      return timestamp;
    }
  }

  String _getAlertLevelText(String alertLevel) {
    // gRPC returns alert level as integer (0 = NORMAL, 1 = WARNING, 2 = CRITICAL, 3 = EMERGENCY)
    switch (alertLevel) {
      case '0':
        return 'NORMAL';
      case '1':
        return 'WARNING';
      case '2':
        return 'CRITICAL';
      case '3':
        return 'EMERGENCY';
      default:
        return 'NORMAL';
    }
  }

  Color _getAlertColor(String alertLevel) {
    switch (alertLevel.toUpperCase()) {
      case 'CRITICAL':
        return Colors.red.shade700;
      case 'WARNING':
        return Colors.orange.shade700;
      case 'INFO':
        return Colors.blue.shade700;
      default:
        return Colors.green.shade700;
    }
  }

  Widget _buildVitalRow(
    IconData icon,
    String label,
    String value,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 32),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(color: Colors.grey.shade700, fontSize: 14),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: TextStyle(
                    color: color,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
