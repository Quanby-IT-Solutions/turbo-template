import 'package:mobile/core/services/http_service.dart';

class SearchRepository {
  /// Search for doctors
  Future<DoctorSearchResult> searchDoctors({
    String? name,
    String? specialization,
    String? organizationId,
    bool? availableOnly,
    int page = 1,
    int limit = 10,
  }) async {
    try {
      final response = await HttpService.searchDoctors(
        name: name,
        specialization: specialization,
        organizationId: organizationId,
        availableOnly: availableOnly,
        page: page,
        limit: limit,
      );

      // Backend returns {items: [...], total, page, limit, totalPages}
      final List<dynamic> doctorsList = response['items'] as List? ?? [];
      final doctors = doctorsList
          .map((doc) => DoctorSearchItem.fromJson(doc as Map<String, dynamic>))
          .toList();

      final total = response['total'] as int? ?? 0;
      final page = response['page'] as int? ?? 1;
      final limit = response['limit'] as int? ?? 10;
      final totalPages = response['totalPages'] as int? ?? 0;

      return DoctorSearchResult(
        doctors: doctors,
        total: total,
        page: page,
        limit: limit,
        totalPages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      );
    } catch (e) {
      throw Exception('Failed to search doctors: $e');
    }
  }

  /// Search for organizations
  Future<OrganizationSearchResult> searchOrganizations({
    String? name,
    String? type,
    bool? verified,
    int page = 1,
    int limit = 10,
  }) async {
    try {
      final response = await HttpService.searchOrganizations(
        name: name,
        type: type,
        verified: verified,
        page: page,
        limit: limit,
      );

      // Backend returns {items: [...], total, page, limit, totalPages}
      final List<dynamic> organizationsList = response['items'] as List? ?? [];
      final organizations = organizationsList
          .map((org) => Organization.fromJson(org as Map<String, dynamic>))
          .toList();

      final total = response['total'] as int? ?? 0;
      final page = response['page'] as int? ?? 1;
      final limit = response['limit'] as int? ?? 10;
      final totalPages = response['totalPages'] as int? ?? 0;

      return OrganizationSearchResult(
        organizations: organizations,
        total: total,
        page: page,
        limit: limit,
        totalPages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      );
    } catch (e) {
      throw Exception('Failed to search organizations: $e');
    }
  }
}

class DoctorSearchResult {
  final List<DoctorSearchItem> doctors;
  final int total;
  final int page;
  final int limit;
  final int totalPages;
  final bool hasNext;
  final bool hasPrev;

  DoctorSearchResult({
    required this.doctors,
    required this.total,
    required this.page,
    required this.limit,
    required this.totalPages,
    required this.hasNext,
    required this.hasPrev,
  });
}

class OrganizationSearchResult {
  final List<Organization> organizations;
  final int total;
  final int page;
  final int limit;
  final int totalPages;
  final bool hasNext;
  final bool hasPrev;

  OrganizationSearchResult({
    required this.organizations,
    required this.total,
    required this.page,
    required this.limit,
    required this.totalPages,
    required this.hasNext,
    required this.hasPrev,
  });
}

class DoctorSearchItem {
  final String id;
  final String userId;
  final String name;
  final String? email;
  final String? image;
  final List<String> specialization;
  final String? bio;
  final String? qualifications;
  final int? experience;
  final String? licenseNumber;
  final bool isLicenseActive;
  final bool isVerified;
  final Organization? organization;
  final String createdAt;
  final String updatedAt;

  DoctorSearchItem({
    required this.id,
    required this.userId,
    required this.name,
    this.email,
    this.image,
    required this.specialization,
    this.bio,
    this.qualifications,
    this.experience,
    this.licenseNumber,
    required this.isLicenseActive,
    required this.isVerified,
    this.organization,
    required this.createdAt,
    required this.updatedAt,
  });

  factory DoctorSearchItem.fromJson(Map<String, dynamic> json) {
    return DoctorSearchItem(
      id: json['id'] as String,
      userId: json['userId'] as String,
      name: json['name'] as String,
      email: json['email'] as String?,
      image: json['image'] as String?,
      specialization:
          (json['specialization'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      bio: json['bio'] as String?,
      qualifications: json['qualifications'] as String?,
      experience: json['experience'] as int?,
      licenseNumber: json['licenseNumber'] as String?,
      isLicenseActive: json['isLicenseActive'] as bool? ?? false,
      isVerified: json['isVerified'] as bool? ?? false,
      organization: json['organization'] != null
          ? Organization.fromJson(json['organization'] as Map<String, dynamic>)
          : null,
      createdAt: json['createdAt'] as String,
      updatedAt: json['updatedAt'] as String,
    );
  }

  // Helper method to get primary specialty for display
  String get primarySpecialty =>
      specialization.isNotEmpty ? specialization[0] : 'General Practice';

  // Helper method to get formatted experience
  String get experienceText => experience != null ? '$experience years' : 'N/A';
}

class Organization {
  final String id;
  final String name;
  final String? address;
  final String? contactNumber;
  final String? email;
  final bool isActive;
  final int doctorCount;
  final String createdAt;
  final String updatedAt;

  Organization({
    required this.id,
    required this.name,
    this.address,
    this.contactNumber,
    this.email,
    required this.isActive,
    required this.doctorCount,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Organization.fromJson(Map<String, dynamic> json) {
    return Organization(
      id: json['id'] as String,
      name: json['name'] as String,
      address: json['address'] as String?,
      contactNumber: json['contactNumber'] as String?,
      email: json['email'] as String?,
      isActive: json['isActive'] as bool? ?? false,
      doctorCount: json['doctorCount'] as int? ?? 0,
      createdAt: json['createdAt'] as String,
      updatedAt: json['updatedAt'] as String,
    );
  }
}



