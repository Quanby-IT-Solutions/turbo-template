import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:livekit_client/livekit_client.dart'
    as livekit
    show ConnectionState;
import 'package:mobile/core/services/http_service.dart';
import 'package:mobile/core/services/toast_service.dart';
import 'package:mobile/core/widgets/animated_nav_wrapper.dart';
import 'package:mobile/presentation/auth/providers/auth_providers.dart';
import 'package:mobile/presentation/video_call/providers/livekit_providers.dart';
import 'package:mobile/presentation/video_call/widgets/medical_history_sidebar.dart';

class VideoCallScreen extends ConsumerStatefulWidget {
  final String consultationId;

  const VideoCallScreen({super.key, required this.consultationId});

  @override
  ConsumerState<VideoCallScreen> createState() => _VideoCallScreenState();
}

class _VideoCallScreenState extends ConsumerState<VideoCallScreen> {
  Room? _room;
  bool _isMedicalHistoryVisible = false;
  bool _isCameraEnabled = true;
  bool _isMicrophoneEnabled = true;
  RemoteParticipant? _remoteParticipant;
  LocalParticipant? _localParticipant;
  VideoTrack? _remoteVideoTrack;
  VideoTrack? _localVideoTrack;
  EventsListener<RoomEvent>? _roomListener;
  Timer? _callDurationTimer;
  Duration _callDuration = Duration.zero;

  @override
  void initState() {
    super.initState();
    _connectToRoom();
  }

  @override
  void dispose() {
    _roomListener?.dispose();
    _callDurationTimer?.cancel();
    _disconnectFromRoom();
    super.dispose();
  }

  Future<void> _connectToRoom() async {
    try {
      // Get token from backend
      final tokenData = await HttpService.generateVideoCallToken(
        consultationId: widget.consultationId,
      );

      final token = tokenData['token'] as String;
      final url = tokenData['url'] as String;
      final roomName = tokenData['roomName'] as String;

      // Create room options
      final roomOptions = RoomOptions(adaptiveStream: true, dynacast: true);

      // Connect to room
      final room = Room();
      await room.connect(url, token, roomOptions: roomOptions);

      if (mounted) {
        setState(() {
          _room = room;
          _localParticipant = room.localParticipant;
        });

        // Set up room listeners
        _setupRoomListeners(room);

        // Enable camera and microphone
        await room.localParticipant?.setCameraEnabled(true);
        await room.localParticipant?.setMicrophoneEnabled(true);

        // Start call duration timer
        _startCallTimer();
      }
    } catch (e) {
      debugPrint('Failed to connect to room: $e');
      if (mounted) {
        ToastService.showError(
          context: context,
          title: 'Connection Failed',
          description: 'Failed to connect to video call: ${e.toString()}',
        );
        context.pop();
      }
    }
  }

  void _setupRoomListeners(Room room) {
    _roomListener?.dispose();
    _roomListener = room.createListener();

    // Listen to room events
    _roomListener!
      ..on<RoomDisconnectedEvent>((event) {
        debugPrint('Room disconnected: ${event.reason}');
        if (mounted) {
          _handleDisconnect(event.reason == DisconnectReason.disconnected);
        }
      })
      ..on<ParticipantConnectedEvent>((event) {
        debugPrint('Participant connected: ${event.participant.identity}');
        if (mounted) {
          setState(() {
            _remoteParticipant = event.participant as RemoteParticipant?;
          });
          _updateRemoteTracks();
        }
      })
      ..on<ParticipantDisconnectedEvent>((event) {
        debugPrint('Participant disconnected: ${event.participant.identity}');
        if (mounted) {
          setState(() {
            _remoteParticipant = null;
            _remoteVideoTrack = null;
          });
        }
      })
      ..on<TrackSubscribedEvent>((event) {
        debugPrint('Track subscribed: ${event.track.kind}');
        if (mounted && event.track.kind == 'video') {
          setState(() {
            _remoteVideoTrack = event.track as VideoTrack;
          });
        }
      })
      ..on<TrackUnsubscribedEvent>((event) {
        debugPrint('Track unsubscribed: ${event.track.kind}');
        if (mounted && event.track.kind == 'video') {
          setState(() {
            _remoteVideoTrack = null;
          });
        }
      })
      ..on<RoomReconnectedEvent>((event) {
        debugPrint('Room reconnected');
        if (mounted) {
          ToastService.showSuccess(
            context: context,
            title: 'Reconnected',
            description: 'Connection restored',
          );
        }
      });

    // Listen to participant changes
    room.addListener(_onRoomChanged);
  }

  void _onRoomChanged() {
    if (!mounted || _room == null) return;

    setState(() {
      _localParticipant = _room!.localParticipant;
      _updateRemoteParticipant();
      _updateLocalTracks();
      _updateRemoteTracks();
    });
  }

  void _updateRemoteParticipant() {
    if (_room == null) return;

    final remoteParticipants = _room!.remoteParticipants.values;
    if (remoteParticipants.isNotEmpty) {
      _remoteParticipant = remoteParticipants.first;
    } else {
      _remoteParticipant = null;
    }
  }

  void _updateLocalTracks() {
    if (_localParticipant == null) {
      _localVideoTrack = null;
      return;
    }

    final videoPub = _localParticipant!.videoTrackPublications
        .where((pub) => pub.subscribed)
        .firstOrNull;

    _localVideoTrack = videoPub?.track as VideoTrack?;
  }

  void _updateRemoteTracks() {
    if (_remoteParticipant == null) {
      _remoteVideoTrack = null;
      return;
    }

    final videoPub = _remoteParticipant!.videoTrackPublications
        .where((pub) => pub.subscribed)
        .firstOrNull;

    _remoteVideoTrack = videoPub?.track as VideoTrack?;
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

  Future<void> _disconnectFromRoom() async {
    _callDurationTimer?.cancel();
    _roomListener?.dispose();

    if (_room != null) {
      try {
        await _room!.disconnect();
      } catch (e) {
        debugPrint('Error disconnecting from room: $e');
      }
    }
  }

  void _handleDisconnect(bool wasIntentional) {
    _disconnectFromRoom();

    if (wasIntentional && mounted) {
      // Navigate to post-call notes screen
      context.push(
        '/consultation-notes',
        extra: {'consultationId': widget.consultationId},
      );
    } else if (mounted) {
      // Network error - show reconnecting or error message
      ToastService.showError(
        context: context,
        title: 'Connection Lost',
        description: 'The call was disconnected',
      );
      context.pop();
    }
  }

  Future<void> _toggleCamera() async {
    if (_localParticipant != null) {
      final enabled = _localParticipant!.isCameraEnabled();
      await _localParticipant!.setCameraEnabled(!enabled);
      if (mounted) {
        setState(() {
          _isCameraEnabled = !enabled;
        });
      }
    }
  }

  Future<void> _toggleMicrophone() async {
    if (_localParticipant != null) {
      final enabled = _localParticipant!.isMicrophoneEnabled();
      await _localParticipant!.setMicrophoneEnabled(!enabled);
      if (mounted) {
        setState(() {
          _isMicrophoneEnabled = !enabled;
        });
      }
    }
  }

  Future<void> _switchCamera() async {
    if (_localParticipant != null) {
      final publications = _localParticipant!.videoTrackPublications;
      for (final pub in publications) {
        if (pub.track is LocalVideoTrack) {
          final track = pub.track as LocalVideoTrack;
          // Toggle camera - LiveKit 2.4.8 API
          await track.restartTrack();
          break;
        }
      }
    }
  }

  Future<void> _endCall() async {
    await _disconnectFromRoom();
    if (mounted) {
      context.push(
        '/consultation-notes',
        extra: {'consultationId': widget.consultationId},
      );
    }
  }

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return AnimatedNavWrapper(
      child: Scaffold(
        backgroundColor: Colors.black,
        body: SafeArea(
          child: Stack(
            children: [
              // Remote video (main view)
              if (_remoteVideoTrack != null)
                Positioned.fill(
                  child: VideoTrackRenderer(
                    _remoteVideoTrack!,
                    mirrorMode:
                        VideoViewMirrorMode.off, // Critical: off for overlay
                  ),
                )
              else
                Positioned.fill(
                  child: Container(
                    color: Colors.black,
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          CircularProgressIndicator(color: colorScheme.primary),
                          const SizedBox(height: 16),
                          Text(
                            'Waiting for participant...',
                            style: TextStyle(color: Colors.white, fontSize: 16),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

              // Medical History Sidebar (overlay)
              if (_isMedicalHistoryVisible)
                Positioned(
                  left: 0,
                  top: 0,
                  bottom: 0,
                  child: MedicalHistorySidebar(
                    consultationId: widget.consultationId,
                    onClose: () {
                      setState(() {
                        _isMedicalHistoryVisible = false;
                      });
                    },
                  ),
                ),

              // Local video preview (picture-in-picture)
              Positioned(
                top: 16,
                right: 16,
                child: Container(
                  width: 120,
                  height: 160,
                  decoration: BoxDecoration(
                    color: Colors.black,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white24, width: 2),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: _localVideoTrack != null
                        ? VideoTrackRenderer(
                            _localVideoTrack!,
                            mirrorMode: VideoViewMirrorMode.mirror,
                          )
                        : Container(
                            color: Colors.grey[900],
                            child: Icon(
                              Icons.person,
                              color: Colors.white54,
                              size: 40,
                            ),
                          ),
                  ),
                ),
              ),

              // Top bar with call info
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.black.withValues(alpha: 0.7),
                        Colors.transparent,
                      ],
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Medical history toggle
                      IconButton(
                        onPressed: () {
                          setState(() {
                            _isMedicalHistoryVisible =
                                !_isMedicalHistoryVisible;
                          });
                        },
                        icon: Icon(
                          _isMedicalHistoryVisible
                              ? Icons.close
                              : Icons.medical_information,
                          color: Colors.white,
                        ),
                      ),
                      // Call duration
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          _formatDuration(_callDuration),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      // Switch camera
                      IconButton(
                        onPressed: _switchCamera,
                        icon: const Icon(
                          Icons.switch_camera,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Connection status indicator
              if (_room?.connectionState != livekit.ConnectionState.connected)
                Positioned(
                  top: 60,
                  left: 0,
                  right: 0,
                  child: Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.orange.withValues(alpha: 0.9),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          SizedBox(
                            width: 8,
                            height: 8,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(
                                Colors.white,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Text(
                            'Reconnecting...',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

              // Call controls (bottom)
              Positioned(
                bottom: 32,
                left: 0,
                right: 0,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _buildControlButton(
                        icon: _isMicrophoneEnabled ? Icons.mic : Icons.mic_off,
                        backgroundColor: _isMicrophoneEnabled
                            ? Colors.white24
                            : Colors.red,
                        onPressed: _toggleMicrophone,
                      ),
                      _buildControlButton(
                        icon: _isCameraEnabled
                            ? Icons.videocam
                            : Icons.videocam_off,
                        backgroundColor: _isCameraEnabled
                            ? Colors.white24
                            : Colors.red,
                        onPressed: _toggleCamera,
                      ),
                      _buildControlButton(
                        icon: Icons.call_end,
                        backgroundColor: Colors.red,
                        onPressed: _endCall,
                        size: 64,
                      ),
                    ],
                  ),
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
    required Color backgroundColor,
    required VoidCallback onPressed,
    double size = 56,
  }) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: backgroundColor,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: backgroundColor.withValues(alpha: 0.5),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: IconButton(
        onPressed: onPressed,
        icon: Icon(icon, color: Colors.white, size: size * 0.5),
      ),
    );
  }
}
