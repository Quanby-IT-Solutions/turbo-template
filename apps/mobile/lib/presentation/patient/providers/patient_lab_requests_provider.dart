import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/data/repositories/lab_request_repository.dart';

// ==================
// Repository Provider
// ==================

/// Lab request repository provider
final labRequestRepositoryProvider = Provider<LabRequestRepository>((ref) {
  return LabRequestRepository();
});

// ==================
// Lab Request Entity (you may want to create this in domain/entities)
// ==================

class LabRequest {
  final String id;
  final String patientId;
  final String organizationId;
  final String? doctorId;
  final String? roomId;
  final String? note;
  final String status;
  final String? createdBy; // Make nullable
  final String? updatedBy;
  final String priority;
  final String? requestedTests;
  final String? instructions;
  final String? organizationName;
  final DateTime createdAt;
  final DateTime updatedAt;

  LabRequest({
    required this.id,
    required this.patientId,
    required this.organizationId,
    this.doctorId,
    this.roomId,
    this.note,
    required this.status,
    required this.priority,
    this.requestedTests,
    this.instructions,
    this.organizationName,
    this.createdBy, // Nullable
    this.updatedBy,
    required this.createdAt,
    required this.updatedAt,
  });

  factory LabRequest.fromJson(Map<String, dynamic> json) {
    return LabRequest(
      id: json['id'] as String,
      patientId: json['patientId'] as String,
      organizationId: json['organizationId'] as String,
      doctorId: json['doctorId'] as String?,
      roomId: json['roomId'] as String?,
      note: json['note'] as String?,
      status: json['status'] as String,
      priority: json['priority'] as String,
      requestedTests: json['requestedTests'] as String?,
      instructions: json['instructions'] as String?,
      organizationName: json['organizationName'] as String?,
      createdBy: json['createdBy'] as String?,
      updatedBy: json['updatedBy'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'patientId': patientId,
      'organizationId': organizationId,
      'doctorId': doctorId,
      'roomId': roomId,
      'note': note,
      'status': status,
      'priority': priority,
      'requestedTests': requestedTests,
      'instructions': instructions,
      'createdBy': createdBy,
      'updatedBy': updatedBy,
      'organizationName': organizationName,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}

// ==================
// Lab Requests List Provider
// ==================

/// Notifier for managing lab requests list
class LabRequestsListNotifier extends AsyncNotifier<List<LabRequest>> {
  LabRequestRepository get _repository =>
      ref.read(labRequestRepositoryProvider);

  @override
  Future<List<LabRequest>> build() async {
    // Initially load all lab requests
    return _fetchLabRequests();
  }

  /// Fetch all lab requests
  Future<List<LabRequest>> _fetchLabRequests() async {
    try {
      final labRequestsJson = await _repository.getAllLabRequests();
      return labRequestsJson.map((json) => LabRequest.fromJson(json)).toList();
    } catch (e) {
      throw Exception('Failed to load lab requests: ${e.toString()}');
    }
  }

  /// Refresh lab requests list
  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      return _fetchLabRequests();
    });
  }

  /// Add a newly created lab request to the list
  void addLabRequest(LabRequest labRequest) {
    state.whenData((labRequests) {
      state = AsyncData([labRequest, ...labRequests]);
    });
  }

  /// Update a lab request in the list
  void updateLabRequest(LabRequest updatedLabRequest) {
    state.whenData((labRequests) {
      final updatedList = labRequests.map((labRequest) {
        return labRequest.id == updatedLabRequest.id
            ? updatedLabRequest
            : labRequest;
      }).toList();
      state = AsyncData(updatedList);
    });
  }

  /// Remove a lab request from the list
  void removeLabRequest(String labRequestId) {
    state.whenData((labRequests) {
      final updatedList = labRequests
          .where((labRequest) => labRequest.id != labRequestId)
          .toList();
      state = AsyncData(updatedList);
    });
  }
}

/// Provider for lab requests list
final labRequestsListProvider =
    AsyncNotifierProvider<LabRequestsListNotifier, List<LabRequest>>(
      LabRequestsListNotifier.new,
    );

// ==================
// Patient Lab Requests Provider
// ==================

/// Provider for patient's lab requests
final patientLabRequestsProvider =
    FutureProvider.family<List<LabRequest>, String>((ref, patientId) async {
      final repository = ref.read(labRequestRepositoryProvider);
      final labRequestsJson = await repository.getPatientLabRequests(patientId);
      return labRequestsJson.map((json) => LabRequest.fromJson(json)).toList();
    });

// ==================
// Doctor Lab Requests Provider
// ==================

/// Provider for doctor's lab requests
final doctorLabRequestsProvider =
    FutureProvider.family<List<LabRequest>, String>((ref, doctorId) async {
      final repository = ref.read(labRequestRepositoryProvider);
      final labRequestsJson = await repository.getDoctorLabRequests(doctorId);
      return labRequestsJson.map((json) => LabRequest.fromJson(json)).toList();
    });

// ==================
// Room Lab Requests Provider
// ==================

/// Provider for room's lab requests
final roomLabRequestsProvider = FutureProvider.family<List<LabRequest>, String>(
  (ref, roomId) async {
    final repository = ref.read(labRequestRepositoryProvider);
    final labRequestsJson = await repository.getRoomLabRequests(roomId);
    return labRequestsJson.map((json) => LabRequest.fromJson(json)).toList();
  },
);

// ==================
// Single Lab Request Provider
// ==================

/// Provider for a single lab request by ID
final labRequestProvider = FutureProvider.family<LabRequest, String>((
  ref,
  labRequestId,
) async {
  final repository = ref.read(labRequestRepositoryProvider);
  final labRequestJson = await repository.getLabRequest(labRequestId);
  return LabRequest.fromJson(labRequestJson);
});

// ==================
// Lab Request Booking Provider
// ==================

/// State for lab request booking flow
class LabRequestBookingState {
  final bool isLoading;
  final LabRequest? createdLabRequest;
  final String? error;

  const LabRequestBookingState({
    this.isLoading = false,
    this.createdLabRequest,
    this.error,
  });

  LabRequestBookingState copyWith({
    bool? isLoading,
    LabRequest? createdLabRequest,
    String? error,
  }) {
    return LabRequestBookingState(
      isLoading: isLoading ?? this.isLoading,
      createdLabRequest: createdLabRequest ?? this.createdLabRequest,
      error: error,
    );
  }

  factory LabRequestBookingState.loading() {
    return const LabRequestBookingState(isLoading: true);
  }

  factory LabRequestBookingState.success(LabRequest labRequest) {
    return LabRequestBookingState(createdLabRequest: labRequest);
  }

  factory LabRequestBookingState.error(String error) {
    return LabRequestBookingState(error: error);
  }

  factory LabRequestBookingState.idle() {
    return const LabRequestBookingState();
  }
}

/// Notifier for managing lab request booking
class LabRequestBookingNotifier extends Notifier<LabRequestBookingState> {
  LabRequestRepository get _repository =>
      ref.read(labRequestRepositoryProvider);

  @override
  LabRequestBookingState build() {
    return LabRequestBookingState.idle();
  }

  /// Create a new lab request
  Future<LabRequest?> createLabRequest({
    required String patientId,
    required String organizationId,
    String? doctorId,
    String? roomId,
    String? note,
    String? status,
    String? priority,
    String? requestedTests, // Changed from List<String>?
    String? instructions,
  }) async {
    state = LabRequestBookingState.loading();

    try {
      final labRequestJson = await _repository.createLabRequest(
        patientId: patientId,
        organizationId: organizationId,
        doctorId: doctorId,
        roomId: roomId,
        note: note,
        status: status,
        priority: priority,
        requestedTests: requestedTests,
        instructions: instructions,
      );

      final labRequest = LabRequest.fromJson(labRequestJson);
      state = LabRequestBookingState.success(labRequest);

      ref.read(labRequestsListProvider.notifier).addLabRequest(labRequest);

      return labRequest;
    } catch (e) {
      String errorMessage = e.toString();
      if (errorMessage.startsWith('Exception: ')) {
        errorMessage = errorMessage.substring('Exception: '.length);
      }

      state = LabRequestBookingState.error(errorMessage);
      return null;
    }
  }

  /// Reset booking state
  void reset() {
    state = LabRequestBookingState.idle();
  }
}

/// Provider for lab request booking
final labRequestBookingProvider =
    NotifierProvider<LabRequestBookingNotifier, LabRequestBookingState>(
      LabRequestBookingNotifier.new,
    );

// ==================
// Lab Request Actions Provider
// ==================

/// Notifier for managing lab request actions (update, delete)
class LabRequestActionsNotifier extends Notifier<AsyncValue<void>> {
  LabRequestRepository get _repository =>
      ref.read(labRequestRepositoryProvider);

  @override
  AsyncValue<void> build() {
    return const AsyncData(null);
  }

  /// Update lab request
  Future<void> updateLabRequest({
    required String id,
    String? patientId,
    String? organizationId,
    String? doctorId,
    String? roomId,
    String? note,
    String? status,
    String? priority,
    String? requestedTests, // Changed from List<String>? to String?
    String? instructions,
  }) async {
    state = const AsyncLoading();

    try {
      final updatedLabRequestJson = await _repository.updateLabRequest(
        id: id,
        patientId: patientId,
        organizationId: organizationId,
        doctorId: doctorId,
        roomId: roomId,
        note: note,
        status: status,
        priority: priority,
        requestedTests: requestedTests,
        instructions: instructions,
      );

      final updatedLabRequest = LabRequest.fromJson(updatedLabRequestJson);

      // Update in lab requests list
      ref
          .read(labRequestsListProvider.notifier)
          .updateLabRequest(updatedLabRequest);

      state = const AsyncData(null);
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
    }
  }

  /// Delete a lab request
  Future<void> deleteLabRequest(String labRequestId) async {
    state = const AsyncLoading();

    try {
      await _repository.deleteLabRequest(labRequestId);

      // Remove from lab requests list
      ref.read(labRequestsListProvider.notifier).removeLabRequest(labRequestId);

      state = const AsyncData(null);
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
    }
  }

  /// Reset state
  void reset() {
    state = const AsyncData(null);
  }
}

/// Provider for lab request actions
final labRequestActionsProvider =
    NotifierProvider<LabRequestActionsNotifier, AsyncValue<void>>(
      LabRequestActionsNotifier.new,
    );
