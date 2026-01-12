/// Stub implementation of HyperVergeService
/// TODO: Implement actual HyperVerge SDK integration when package is available
class HyperVergeService {
  /// Generate access token for HyperKYC SDK
  Future<Map<String, dynamic>> generateAccessToken({required String userId}) async {
    throw UnimplementedError(
      'HyperVergeService.generateAccessToken is not implemented. '
      'Please install hyperkyc_flutter package and implement this method.',
    );
  }

  /// Get verification status for a user
  Future<Map<String, dynamic>> getVerificationStatus(String userId) async {
    throw UnimplementedError(
      'HyperVergeService.getVerificationStatus is not implemented. '
      'Please install hyperkyc_flutter package and implement this method.',
    );
  }
}
