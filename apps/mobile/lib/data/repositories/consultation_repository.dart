import 'package:mobile/core/services/http_service.dart';
import 'package:mobile/domain/entities/consultation.dart';

/// Consultation repository for backend integration
class ConsultationRepository {
  /// Get consultations
  Future<List<Consultation>> getConsultations({
    String? patientId,
    String? doctorId,
    int? page,
    int? limit,
  }) async {
    try {
      final response = await HttpService.getConsultations(
        patientId: patientId,
        doctorId: doctorId,
        page: page,
        limit: limit,
      );

      // Backend returns {items: [...], total, page, limit, totalPages}
      final List<dynamic> consultationsList;
      if (response['items'] != null) {
        consultationsList = response['items'] as List<dynamic>;
      } else {
        consultationsList = [];
      }

      return consultationsList
          .map((json) => Consultation.fromMap(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      throw Exception('Failed to get consultations: ${e.toString()}');
    }
  }

  /// Get consultation by ID
  Future<Consultation> getConsultation(String id) async {
    try {
      final response = await HttpService.getConsultation(id);
      return Consultation.fromMap(response as Map<String, dynamic>);
    } catch (e) {
      throw Exception('Failed to get consultation: ${e.toString()}');
    }
  }

  /// Update consultation
  Future<Consultation> updateConsultation({
    required String consultationId,
    String? notes,
    String? diagnosis,
    String? treatment,
    DateTime? followUpDate,
    String? status,
  }) async {
    try {
      final response = await HttpService.updateConsultation(
        consultationId: consultationId,
        notes: notes,
        diagnosis: diagnosis,
        treatment: treatment,
        followUpDate: followUpDate?.toIso8601String(),
        status: status,
      );
      return Consultation.fromMap(response as Map<String, dynamic>);
    } catch (e) {
      throw Exception('Failed to update consultation: ${e.toString()}');
    }
  }
}
