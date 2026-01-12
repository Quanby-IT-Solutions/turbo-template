// TODO: Replace with WebRTC providers when implementing WebRTC backend integration
// This file previously contained LiveKit providers, which have been removed.
// The backend has WebRTC support via Socket.IO (see apps/backend/src/modules/v1/webrtc/)

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/services/http_service.dart';

// Placeholder provider - to be replaced with WebRTC implementation
final videoCallTokenProvider =
    FutureProvider.family<Map<String, dynamic>, String>((
      ref,
      consultationId,
    ) async {
      return await HttpService.generateVideoCallToken(
        consultationId: consultationId,
      );
    });

// TODO: Implement WebRTC room provider using Socket.IO client
// final videoCallRoomProvider = FutureProvider.family<...>(...);

// TODO: Implement WebRTC connection state provider
// final videoCallConnectionStateProvider = Provider<...>(...);
