import 'package:mobile/core/services/http_service.dart';

/// Lab request repository for backend integration
class LabRequestRepository {
  /// Get all lab requests
  Future<List<Map<String, dynamic>>> getAllLabRequests() async {
    try {
      final labRequests = await HttpService.getAllLabRequests();
      return labRequests;
    } catch (e) {
      throw Exception('Failed to get all lab requests: ${e.toString()}');
    }
  }

  /// Create a new lab request
  Future<Map<String, dynamic>> createLabRequest({
    required String patientId,
    required String organizationId,
    String? doctorId,
    String? roomId,
    String? note,
    String? status,
    String? priority,
    List<String>? requestedTests,
    String? instructions,
  }) async {
    try {
      final labRequest = await HttpService.createLabRequest(
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
      return labRequest;
    } catch (e) {
      throw Exception('Failed to create lab request: ${e.toString()}');
    }
  }

  /// Get doctor lab requests
  Future<List<Map<String, dynamic>>> getDoctorLabRequests(
    String doctorId,
  ) async {
    try {
      final labRequests = await HttpService.getDoctorLabRequests(doctorId);
      return labRequests;
    } catch (e) {
      throw Exception('Failed to get doctor lab requests: ${e.toString()}');
    }
  }

  /// Get patient lab requests
  Future<List<Map<String, dynamic>>> getPatientLabRequests(
    String patientId,
  ) async {
    try {
      final labRequests = await HttpService.getPatientLabRequests(patientId);
      return labRequests;
    } catch (e) {
      throw Exception('Failed to get patient lab requests: ${e.toString()}');
    }
  }

  /// Get room lab requests
  Future<List<Map<String, dynamic>>> getRoomLabRequests(String roomId) async {
    try {
      final labRequests = await HttpService.getRoomLabRequests(roomId);
      return labRequests;
    } catch (e) {
      throw Exception('Failed to get room lab requests: ${e.toString()}');
    }
  }

  /// Get a single lab request by ID
  Future<Map<String, dynamic>> getLabRequest(String id) async {
    try {
      final labRequest = await HttpService.getLabRequest(id);
      return labRequest;
    } catch (e) {
      throw Exception('Failed to get lab request: ${e.toString()}');
    }
  }

  /// Update a lab request
  Future<Map<String, dynamic>> updateLabRequest({
    required String id,
    String? patientId,
    String? organizationId,
    String? doctorId,
    String? roomId,
    String? note,
    String? status,
    String? priority,
    List<String>? requestedTests,
    String? instructions,
  }) async {
    try {
      final labRequest = await HttpService.updateLabRequest(
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
      return labRequest;
    } catch (e) {
      throw Exception('Failed to update lab request: ${e.toString()}');
    }
  }

  /// Delete a lab request
  Future<void> deleteLabRequest(String id) async {
    try {
      await HttpService.deleteLabRequest(id);
    } catch (e) {
      throw Exception('Failed to delete lab request: ${e.toString()}');
    }
  }
}
