import 'package:mobile/core/services/http_service.dart';
import 'package:mobile/domain/entities/doctor.dart';

/// Doctor repository for backend integration
/// Handles all doctor-related API calls and data transformation
class DoctorRepository {
  /// Get a doctor by ID
  Future<Doctor> getDoctor(String id) async {
    try {
      final response = await HttpService.getDoctor(id);
      return Doctor.fromMap(response as Map<String, dynamic>);
    } catch (e) {
      throw Exception('Failed to get doctor: ${e.toString()}');
    }
  }
}
