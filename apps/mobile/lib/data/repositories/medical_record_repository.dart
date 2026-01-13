import 'package:mobile/core/services/http_service.dart';
import 'package:mobile/domain/entities/medical_record.dart';

/// Medical records repository for backend integration
class MedicalRecordRepository {
  /// Get medical records
  Future<List<MedicalRecord>> getMedicalRecords({
    String? patientId,
    String? recordType,
  }) async {
    try {
      final records = await HttpService.getMedicalRecords(
        patientId: patientId,
        recordType: recordType,
      );
      return records
          .map((json) => MedicalRecord.fromMap(json))
          .toList();
    } catch (e) {
      throw Exception('Failed to get medical records: ${e.toString()}');
    }
  }

  /// Get medical record by ID
  Future<MedicalRecord> getMedicalRecord(String id) async {
    try {
      final response = await HttpService.getMedicalRecord(id);
      return MedicalRecord.fromMap(response);
    } catch (e) {
      throw Exception('Failed to get medical record: ${e.toString()}');
    }
  }
}
