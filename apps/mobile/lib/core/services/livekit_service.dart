// TODO: Replace with WebRTC service when implementing WebRTC backend integration
// This file previously contained LiveKitService, which has been removed.
// The backend has WebRTC support via Socket.IO (see apps/backend/src/modules/v1/webrtc/)

import 'package:flutter/foundation.dart';

/// Placeholder service for WebRTC video calls
/// TODO: Implement WebRTC service using Socket.IO client
/// The backend WebRTC gateway uses Socket.IO with events:
/// - webrtc:join
/// - webrtc:offer
/// - webrtc:answer
/// - webrtc:ice-candidate
/// - webrtc:leave
class WebRtcService {
  final ValueNotifier<dynamic> connectionStateNotifier = ValueNotifier(null);

  /// Connect to a video call room
  /// TODO: Implement using Socket.IO client to connect to WebRTC gateway
  Future<dynamic> connectToRoom({
    required String consultationId,
    required String token,
    required String url,
  }) async {
    throw UnimplementedError(
      'WebRTC service not yet implemented. '
      'Please implement using Socket.IO client to connect to the WebRTC gateway.',
    );
  }

  /// Dispose resources
  void dispose() {
    connectionStateNotifier.dispose();
  }
}
