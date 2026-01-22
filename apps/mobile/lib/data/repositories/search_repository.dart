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
      final responsePage = response['page'] as int? ?? 1;
      final responseLimit = response['limit'] as int? ?? 10;
      final totalPages = response['totalPages'] as int? ?? 0;

      return DoctorSearchResult(
        doctors: doctors,
        total: total,
        page: responsePage,
        limit: responseLimit,
        totalPages: totalPages,
        hasNext: responsePage < totalPages,
        hasPrev: responsePage > 1,
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

      // ✅ Handle both formats: {items: [...], total...} OR direct array [...]
      List<dynamic> organizationsList;
      int total;
      int responsePage;
      int responseLimit;
      int totalPages;

      if (response['items'] != null) {
        // Format 1: {items: [...], total, page, limit, totalPages}
        organizationsList = response['items'] as List? ?? [];
        total = response['total'] as int? ?? 0;
        responsePage = response['page'] as int? ?? 1;
        responseLimit = response['limit'] as int? ?? 10;
        totalPages = response['totalPages'] as int? ?? 0;
      } else if (response['data'] is List) {
        // Format 2: {success: true, data: [...]}
        organizationsList = response['data'] as List? ?? [];
        total = organizationsList.length;
        responsePage = 1;
        responseLimit = organizationsList.length;
        totalPages = 1;
      } else {
        // Fallback: empty result
        organizationsList = [];
        total = 0;
        responsePage = 1;
        responseLimit = 10;
        totalPages = 0;
      }

      final organizations = organizationsList
          .map((org) => Organization.fromJson(org as Map<String, dynamic>))
          .toList();

      return OrganizationSearchResult(
        organizations: organizations,
        total: total,
        page: responsePage,
        limit: responseLimit,
        totalPages: totalPages,
        hasNext: responsePage < totalPages,
        hasPrev: responsePage > 1,
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
    // Extract name from doctorInfo if present, otherwise try direct name field
    String doctorName;
    if (json['doctorInfo'] != null) {
      final doctorInfo = json['doctorInfo'] as Map<String, dynamic>;
      final firstName = doctorInfo['firstName'] as String? ?? '';
      final middleName = doctorInfo['middleName'] as String?;
      final lastName = doctorInfo['lastName'] as String? ?? '';

      final parts = <String>[
        firstName.trim(),
        if (middleName != null && middleName.isNotEmpty) middleName.trim(),
        lastName.trim(),
      ].where((value) => value.isNotEmpty).toList();

      doctorName = parts.isNotEmpty
          ? parts.join(' ')
          : (json['email'] as String? ?? 'Unknown Doctor');
    } else {
      // Fallback to direct name field or email
      doctorName =
          json['name'] as String? ??
          json['email'] as String? ??
          'Unknown Doctor';
    }

    // Extract specialization from doctorInfo if present
    List<String> specializationList = [];
    if (json['doctorInfo'] != null) {
      final doctorInfo = json['doctorInfo'] as Map<String, dynamic>;
      final spec = doctorInfo['specialization'] as String?;
      if (spec != null && spec.isNotEmpty) {
        specializationList = [spec];
      }
    }
    if (specializationList.isEmpty) {
      specializationList =
          (json['specialization'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [];
    }

    return DoctorSearchItem(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String? ?? json['id'] as String? ?? '',
      name: doctorName,
      email: json['email'] as String?,
      image: json['image'] as String?,
      specialization: specializationList,
      bio: json['bio'] as String?,
      qualifications: json['doctorInfo'] != null
          ? (json['doctorInfo'] as Map<String, dynamic>)['qualifications']
                as String?
          : json['qualifications'] as String?,
      experience: json['doctorInfo'] != null
          ? (json['doctorInfo'] as Map<String, dynamic>)['experience'] as int?
          : json['experience'] as int?,
      licenseNumber: json['licenseNumber'] as String?,
      isLicenseActive: json['isLicenseActive'] as bool? ?? false,
      isVerified: json['isVerified'] as bool? ?? false,
      organization: json['organization'] != null
          ? Organization.fromJson(json['organization'] as Map<String, dynamic>)
          : null,
      createdAt:
          json['createdAt'] as String? ?? DateTime.now().toIso8601String(),
      updatedAt:
          json['updatedAt'] as String? ?? DateTime.now().toIso8601String(),
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
  final String? description; // Added
  final String? address;
  final String? contactNumber;
  final String? email;
  final String? website; // Added
  final String? type; // Added
  final bool? verified; // Added
  final bool isActive;
  final int doctorCount;
  final String createdAt;
  final String updatedAt;

  Organization({
    required this.id,
    required this.name,
    this.description, // Added
    this.address,
    this.contactNumber,
    this.email,
    this.website, // Added
    this.type, // Added
    this.verified, // Added
    required this.isActive,
    required this.doctorCount,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Organization.fromJson(Map<String, dynamic> json) {
    return Organization(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Unknown Organization',
      description: json['description'] as String?,
      address: json['address'] as String?,
      contactNumber:
          json['phone'] as String? ??
          json['contactNumber']
              as String?, // ✅ Handle both 'phone' and 'contactNumber'
      email: json['email'] as String?,
      website: json['website'] as String?,
      type:
          json['type'] as String? ??
          json['subscriptionTier']
              as String?, // ✅ Fallback to subscriptionTier if type not available
      verified:
          json['verified'] as bool? ??
          (json['approvalStatus'] ==
              'APPROVED'), // ✅ Use approvalStatus if verified not available
      isActive: json['isActive'] as bool? ?? false,
      doctorCount: json['doctorCount'] as int? ?? 0,
      createdAt:
          json['createdAt'] as String? ?? DateTime.now().toIso8601String(),
      updatedAt:
          json['updatedAt'] as String? ?? DateTime.now().toIso8601String(),
    );
  }
}
