import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_constants.dart';
import 'package:mobile/core/services/toast_service.dart';

class FaceScanScreen extends StatefulWidget {
  const FaceScanScreen({super.key});

  @override
  State<FaceScanScreen> createState() => _FaceScanScreenState();
}

class _FaceScanScreenState extends State<FaceScanScreen> {
  bool _isScanning = false;
  bool _scanCompleted = false;
  final Map<String, dynamic> _scanResults = {};

  Future<void> _startScan() async {
    setState(() {
      _isScanning = true;
      _scanCompleted = false;
      _scanResults.clear();
    });

    // Simulate scanning process
    await Future.delayed(const Duration(seconds: 4));

    // Simulate scan results
    setState(() {
      _isScanning = false;
      _scanCompleted = true;
      _scanResults.addAll({
        'heartRate': '72 BPM',
        'bloodPressure': '120/80 mmHg',
        'oxygenSaturation': '98%',
        'stressLevel': 'Low',
        'skinCondition': 'Normal',
        'eyeHealth': 'Good',
        'temperature': '98.6°F',
        'confidence': '94%',
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Face Scan Analysis'),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(AppConstants.defaultPadding),
        child: Column(
          children: [
            // Instructions
            Card(
              color: Colors.blue.shade50,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, color: Colors.blue.shade700),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'AI-Powered Health Scan',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.blue.shade700,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Position your face in the camera frame and hold still for accurate readings.',
                            style: TextStyle(color: Colors.blue.shade600),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            // Camera Preview Area
            Expanded(
              flex: 2,
              child: Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.black,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: _isScanning
                        ? Colors.green
                        : _scanCompleted
                            ? Colors.blue
                            : Colors.grey,
                    width: 3,
                  ),
                ),
                child: Stack(
                  children: [
                    // Camera preview simulation
                    Center(
                      child: Container(
                        width: 200,
                        height: 250,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade800,
                          borderRadius: BorderRadius.circular(100),
                        ),
                        child: const Icon(
                          Icons.face,
                          size: 120,
                          color: Colors.white54,
                        ),
                      ),
                    ),

                    // Face detection overlay
                    if (_isScanning || _scanCompleted)
                      Center(
                        child: Container(
                          width: 200,
                          height: 250,
                          decoration: BoxDecoration(
                            border: Border.all(
                              color: _scanCompleted ? Colors.green : Colors.yellow,
                              width: 2,
                            ),
                            borderRadius: BorderRadius.circular(100),
                          ),
                        ),
                      ),

                    // Scanning animation
                    if (_isScanning)
                      const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            SizedBox(height: 200),
                            CircularProgressIndicator(color: Colors.green),
                            SizedBox(height: 8),
                            Text(
                              'Scanning...',
                              style: TextStyle(color: Colors.white),
                            ),
                          ],
                        ),
                      ),

                    // Success indicator
                    if (_scanCompleted)
                      const Positioned(
                        top: 20,
                        right: 20,
                        child: Icon(
                          Icons.check_circle,
                          color: Colors.green,
                          size: 32,
                        ),
                      ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            // Scan Results
            if (_scanCompleted)
              Expanded(
                flex: 1,
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.analytics, color: Colors.green.shade600),
                            const SizedBox(width: 8),
                            const Text(
                              'Scan Results',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Expanded(
                          child: GridView.count(
                            crossAxisCount: 2,
                            childAspectRatio: 3,
                            crossAxisSpacing: 8,
                            mainAxisSpacing: 8,
                            children: _scanResults.entries.map((entry) {
                              return Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: Colors.green.shade50,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      _formatLabel(entry.key),
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: Colors.grey,
                                      ),
                                    ),
                                    Text(
                                      entry.value,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
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
                  ),
                ),
              ),

            // Action Buttons
            Row(
              children: [
                if (_scanCompleted)
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        setState(() {
                          _scanCompleted = false;
                          _scanResults.clear();
                        });
                      },
                      icon: const Icon(Icons.refresh),
                      label: const Text('Scan Again'),
                    ),
                  ),
                if (_scanCompleted) const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _isScanning ? null : (_scanCompleted ? _saveResults : _startScan),
                    icon: Icon(_scanCompleted ? Icons.save : Icons.camera_alt),
                    label: Text(_scanCompleted ? 'Save Results' : 'Start Scan'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatLabel(String key) {
    switch (key) {
      case 'heartRate':
        return 'Heart Rate';
      case 'bloodPressure':
        return 'Blood Pressure';
      case 'oxygenSaturation':
        return 'Oxygen Sat.';
      case 'stressLevel':
        return 'Stress Level';
      case 'skinCondition':
        return 'Skin Condition';
      case 'eyeHealth':
        return 'Eye Health';
      case 'temperature':
        return 'Temperature';
      case 'confidence':
        return 'Confidence';
      default:
        return key;
    }
  }

  void _saveResults() {
    ToastService.showVitals(
      context: context,
      title: 'Scan Results Saved',
      description: 'Face scan results saved to patient record',
    );
    Navigator.of(context).pop();
  }
}