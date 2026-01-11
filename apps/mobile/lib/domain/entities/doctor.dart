import 'dart:convert';

import 'package:equatable/equatable.dart';

/// Doctor entity representing doctor information
class Doctor extends Equatable {
  final String id;
  final String email;
  final String firstName;
  final String? middleName;
  final String lastName;
  final String specialization;
  final String qualifications;
  final int experience;
  final String contactNumber;
  final String approvalStatus; // PENDING, APPROVED, REJECTED
  final DateTime? approvalStatusUpdatedAt;
  final String? approvalRejectionReason;
  final String? prcIdImage;
  final String? ptrIdImage;
  final String? medicalLicenseImage;
  final String? organizationId;
  final String? organizationName;
  final DateTime createdAt;

  const Doctor({
    required this.id,
    required this.email,
    required this.firstName,
    this.middleName,
    required this.lastName,
    required this.specialization,
    required this.qualifications,
    required this.experience,
    required this.contactNumber,
    required this.approvalStatus,
    this.approvalStatusUpdatedAt,
    this.approvalRejectionReason,
    this.prcIdImage,
    this.ptrIdImage,
    this.medicalLicenseImage,
    this.organizationId,
    this.organizationName,
    required this.createdAt,
  });

  String get displayName {
    final parts = <String>[
      firstName.trim(),
      if (middleName != null && middleName!.isNotEmpty) middleName!.trim(),
      lastName.trim(),
    ].where((value) => value.isNotEmpty).toList();

    if (parts.isNotEmpty) {
      return parts.join(' ');
    }
    return email;
  }

  String get fullName => displayName;

  bool get isApproved => approvalStatus == 'APPROVED';
  bool get isPending => approvalStatus == 'PENDING';
  bool get isRejected => approvalStatus == 'REJECTED';

  Map<String, dynamic> toMap() => {
        'id': id,
        'email': email,
        'firstName': firstName,
        'middleName': middleName,
        'lastName': lastName,
        'specialization': specialization,
        'qualifications': qualifications,
        'experience': experience,
        'contactNumber': contactNumber,
        'approvalStatus': approvalStatus,
        'approvalStatusUpdatedAt': approvalStatusUpdatedAt?.toIso8601String(),
        'approvalRejectionReason': approvalRejectionReason,
        'prcIdImage': prcIdImage,
        'ptrIdImage': ptrIdImage,
        'medicalLicenseImage': medicalLicenseImage,
        'organizationId': organizationId,
        'organizationName': organizationName,
        'createdAt': createdAt.toIso8601String(),
      };

  String toJson() => jsonEncode(toMap());

  factory Doctor.fromMap(Map<String, dynamic> map) {
    final doctorInfo = map['doctorInfo'] as Map<String, dynamic>?;
    final organization = map['organization'] as Map<String, dynamic>?;

    return Doctor(
      id: map['id'] as String,
      email: map['email'] as String,
      firstName: doctorInfo?['firstName'] as String? ??
          map['firstName'] as String? ??
          '',
      middleName: doctorInfo?['middleName'] as String?,
      lastName: doctorInfo?['lastName'] as String? ??
          map['lastName'] as String? ??
          '',
      specialization: doctorInfo?['specialization'] as String? ??
          map['specialization'] as String? ??
          '',
      qualifications: doctorInfo?['qualifications'] as String? ??
          map['qualifications'] as String? ??
          '',
      experience: (doctorInfo?['experience'] as num?)?.toInt() ??
          (map['experience'] as num?)?.toInt() ??
          0,
      contactNumber: doctorInfo?['contactNumber'] as String? ??
          map['contactNumber'] as String? ??
          '',
      approvalStatus: doctorInfo?['approvalStatus'] as String? ??
          map['approvalStatus'] as String? ??
          'PENDING',
      approvalStatusUpdatedAt: doctorInfo?['approvalStatusUpdatedAt'] != null
          ? DateTime.parse(doctorInfo!['approvalStatusUpdatedAt'] as String)
          : null,
      approvalRejectionReason: doctorInfo?['approvalRejectionReason'] as String?,
      prcIdImage: doctorInfo?['prcIdImage'] as String?,
      ptrIdImage: doctorInfo?['ptrIdImage'] as String?,
      medicalLicenseImage: doctorInfo?['medicalLicenseImage'] as String?,
      organizationId: map['organizationId'] as String?,
      organizationName: organization?['name'] as String?,
      createdAt: DateTime.parse(map['createdAt'] as String),
    );
  }

  factory Doctor.fromJson(String source) =>
      Doctor.fromMap(jsonDecode(source) as Map<String, dynamic>);

  @override
  List<Object?> get props => [
        id,
        email,
        firstName,
        middleName,
        lastName,
        specialization,
        qualifications,
        experience,
        contactNumber,
        approvalStatus,
        approvalStatusUpdatedAt,
        approvalRejectionReason,
        prcIdImage,
        ptrIdImage,
        medicalLicenseImage,
        organizationId,
        organizationName,
        createdAt,
      ];
}
