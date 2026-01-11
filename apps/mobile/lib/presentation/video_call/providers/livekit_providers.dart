import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:mobile/core/services/livekit_service.dart';
import 'package:mobile/core/services/http_service.dart';
import 'package:mobile/presentation/auth/providers/auth_providers.dart';

final liveKitServiceProvider = Provider<LiveKitService>((ref) {
  final service = LiveKitService();
  ref.onDispose(() => service.dispose());
  return service;
});

final videoCallTokenProvider =
    FutureProvider.family<Map<String, dynamic>, String>((
      ref,
      consultationId,
    ) async {
      return await HttpService.generateVideoCallToken(
        consultationId: consultationId,
      );
    });

final videoCallRoomProvider = FutureProvider.family<Room?, String>((
  ref,
  consultationId,
) async {
  final service = ref.read(liveKitServiceProvider);
  final user = ref.read(currentUserProvider);

  if (user == null) {
    throw Exception('User not authenticated');
  }

  try {
    // Get token from backend
    final tokenData = await ref.read(
      videoCallTokenProvider(consultationId).future,
    );

    final token = tokenData['token'] as String;
    final url = tokenData['url'] as String;
    final roomName = tokenData['roomName'] as String;

    // Connect to room
    final room = await service.connectToRoom(
      consultationId: roomName,
      token: token,
      url: url,
    );

    return room;
  } catch (e) {
    debugPrint('Failed to connect to video call room: $e');
    rethrow;
  }
});

final videoCallConnectionStateProvider = Provider<ConnectionState>((ref) {
  final service = ref.read(liveKitServiceProvider);
  return service.connectionStateNotifier.value;
});



