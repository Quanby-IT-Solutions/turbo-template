// TODO: Implement WebRTC video call screen using Socket.IO and native WebRTC
// LiveKit has been removed in favor of the backend WebRTC implementation
// See apps/backend/src/modules/v1/webrtc/ for WebRTC gateway implementation

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/core/widgets/animated_nav_wrapper.dart';
import 'package:mobile/presentation/video_call/widgets/medical_history_sidebar.dart';

class VideoCallScreen extends ConsumerStatefulWidget {
  final String consultationId;

  const VideoCallScreen({super.key, required this.consultationId});

  @override
  ConsumerState<VideoCallScreen> createState() => _VideoCallScreenState();
}

class _VideoCallScreenState extends ConsumerState<VideoCallScreen> {
  bool _isMedicalHistoryVisible = false;
  bool _isCameraEnabled = true;
  bool _isMicrophoneEnabled = true;
  Timer? _callDurationTimer;
  Duration _callDuration = Duration.zero;

  @override
  void initState() {
    super.initState();
    // TODO: Connect to WebRTC room using Socket.IO
    _startCallTimer();
  }

  @override
  void dispose() {
    _callDurationTimer?.cancel();
    // TODO: Disconnect from WebRTC room
    super.dispose();
  }

  void _startCallTimer() {
    _callDurationTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          _callDuration = Duration(seconds: _callDuration.inSeconds + 1);
        });
      }
    });
  }

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  void _toggleMedicalHistory() {
    setState(() {
      _isMedicalHistoryVisible = !_isMedicalHistoryVisible;
    });
  }

  void _toggleCamera() {
    setState(() {
      _isCameraEnabled = !_isCameraEnabled;
    });
    // TODO: Toggle camera via WebRTC
  }

  void _toggleMicrophone() {
    setState(() {
      _isMicrophoneEnabled = !_isMicrophoneEnabled;
    });
    // TODO: Toggle microphone via WebRTC
  }

  void _endCall() {
    // TODO: Disconnect from WebRTC room
    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedNavWrapper(
      child: Scaffold(
        backgroundColor: Colors.black,
        body: SafeArea(
          child: Stack(
            children: [
              // Video placeholder - TODO: Replace with WebRTC video tracks
              Positioned.fill(
                child: Container(
                  color: Colors.black,
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.videocam_outlined,
                          size: 80,
                          color: Colors.white54,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'WebRTC Video Call',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Implementation coming soon',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 24),
                        Text(
                          _formatDuration(_callDuration),
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              // Medical History Sidebar (overlay)
              if (_isMedicalHistoryVisible)
                Positioned(
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: MediaQuery.of(context).size.width * 0.4,
                  child: MedicalHistorySidebar(
                    consultationId: widget.consultationId,
                    onClose: _toggleMedicalHistory,
                  ),
                ),

              // Top bar with call info
              Positioned(
                top: 16,
                left: 16,
                right: 16,
                child: Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.black54,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          'Consultation: ${widget.consultationId.substring(0, 8)}...',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      icon: Icon(
                        _isMedicalHistoryVisible
                            ? Icons.close
                            : Icons.medical_information_outlined,
                        color: Colors.white,
                      ),
                      onPressed: _toggleMedicalHistory,
                      tooltip: _isMedicalHistoryVisible
                          ? 'Close Medical History'
                          : 'Open Medical History',
                    ),
                  ],
                ),
              ),

              // Bottom controls
              Positioned(
                bottom: 32,
                left: 0,
                right: 0,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Toggle microphone
                    _buildControlButton(
                      icon: _isMicrophoneEnabled
                          ? Icons.mic
                          : Icons.mic_off,
                      isEnabled: _isMicrophoneEnabled,
                      onPressed: _toggleMicrophone,
                      tooltip: _isMicrophoneEnabled
                          ? 'Mute Microphone'
                          : 'Unmute Microphone',
                    ),
                    const SizedBox(width: 16),

                    // End call
                    _buildControlButton(
                      icon: Icons.call_end,
                      isEnabled: true,
                      onPressed: _endCall,
                      backgroundColor: Colors.red,
                      tooltip: 'End Call',
                    ),
                    const SizedBox(width: 16),

                    // Toggle camera
                    _buildControlButton(
                      icon: _isCameraEnabled
                          ? Icons.videocam
                          : Icons.videocam_off,
                      isEnabled: _isCameraEnabled,
                      onPressed: _toggleCamera,
                      tooltip: _isCameraEnabled
                          ? 'Turn Off Camera'
                          : 'Turn On Camera',
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

  Widget _buildControlButton({
    required IconData icon,
    required bool isEnabled,
    required VoidCallback onPressed,
    Color? backgroundColor,
    required String tooltip,
  }) {
    return Tooltip(
      message: tooltip,
      child: Container(
        decoration: BoxDecoration(
          color: backgroundColor ?? Colors.black54,
          shape: BoxShape.circle,
        ),
        child: IconButton(
          icon: Icon(icon, color: Colors.white),
          onPressed: onPressed,
          iconSize: 28,
          padding: const EdgeInsets.all(16),
        ),
      ),
    );
  }
}
