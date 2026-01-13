import 'package:mobile/core/services/http_service.dart';

/// Lab request repository for backend integration
class LabRequestRepository {
  /// Get patient lab requests
  Future<List<Map<String, dynamic>>> getPatientLabRequests(String patientId) async {
    try {
      final response = await HttpService.getPatientLabRequests(patientId);

      // Backend returns {success: true, data: [...]}
      final List<dynamic> labRequestsList;
      if (response['success'] == true && response['data'] != null) {
        labRequestsList = response['data'] as List<dynamic>;
      } else {
        labRequestsList = [];
      }

      return labRequestsList
          .map((json) => json as Map<String, dynamic>)
          .toList();
    } catch (e) {
      throw Exception('Failed to get patient lab requests: ${e.toString()}');
    }
  }
}
