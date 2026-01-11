import 'dart:convert';

import 'package:equatable/equatable.dart';

/// Patient entity representing patient information
class Patient extends Equatable {
  final String id;
  final String email;
  final String firstName;
  final String? middleName;
  final String lastName;
  final String gender; // MALE, FEMALE, OTHER
  final DateTime dateOfBirth;
  final String contactNumber;
  final String address;
  final double weight;
  final double height;
  final String bloodType;
  final String? medicalHistory;
  final String? allergies;
  final String? medications;
  final String? philHealthId;
  final String verificationStatus; // NOT_VERIFIED, PENDING, VERIFIED, REJECTED
  final DateTime createdAt;

  const Patient({
    required this.id,
    required this.email,
    required this.firstName,
    this.middleName,
    required this.lastName,
    required this.gender,
    required this.dateOfBirth,
    required this.contactNumber,
    required this.address,
    required this.weight,
    required this.height,
    required this.bloodType,
    this.medicalHistory,
    this.allergies,
    this.medications,
    this.philHealthId,
    required this.verificationStatus,
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

  int get age {
    final now = DateTime.now();
    int age = now.year - dateOfBirth.year;
    if (now.month < dateOfBirth.month ||
        (now.month == dateOfBirth.month && now.day < dateOfBirth.day)) {
      age--;
    }
    return age;
  }

  Map<String, dynamic> toMap() => {
        'id': id,
        'email': email,
        'firstName': firstName,
        'middleName': middleName,
        'lastName': lastName,
        'gender': gender,
        'dateOfBirth': dateOfBirth.toIso8601String(),
        'contactNumber': contactNumber,
        'address': address,
        'weight': weight,
        'height': height,
        'bloodType': bloodType,
        'medicalHistory': medicalHistory,
        'allergies': allergies,
        'medications': medications,
        'philHealthId': philHealthId,
        'verificationStatus': verificationStatus,
        'createdAt': createdAt.toIso8601String(),
      };

  String toJson() => jsonEncode(toMap());

  factory Patient.fromMap(Map<String, dynamic> map) {
    return Patient(
      id: map['id'] as String,
      email: map['email'] as String,
      firstName: map['patientInfo']?['firstName'] as String? ??
          map['firstName'] as String? ??
          '',
      middleName: map['patientInfo']?['middleName'] as String?,
      lastName: map['patientInfo']?['lastName'] as String? ??
          map['lastName'] as String? ??
          '',
      gender: map['patientInfo']?['gender'] as String? ?? map['gender'] as String? ?? 'OTHER',
      dateOfBirth: DateTime.parse(
        map['patientInfo']?['dateOfBirth'] as String? ??
            map['dateOfBirth'] as String,
      ),
      contactNumber: map['patientInfo']?['contactNumber'] as String? ??
          map['contactNumber'] as String? ??
          '',
      address: map['patientInfo']?['address'] as String? ??
          map['address'] as String? ??
          '',
      weight: (map['patientInfo']?['weight'] as num?)?.toDouble() ??
          (map['weight'] as num?)?.toDouble() ??
          0.0,
      height: (map['patientInfo']?['height'] as num?)?.toDouble() ??
          (map['height'] as num?)?.toDouble() ??
          0.0,
      bloodType: map['patientInfo']?['bloodType'] as String? ??
          map['bloodType'] as String? ??
          '',
      medicalHistory: map['patientInfo']?['medicalHistory'] as String?,
      allergies: map['patientInfo']?['allergies'] as String?,
      medications: map['patientInfo']?['medications'] as String?,
      philHealthId: map['patientInfo']?['philHealthId'] as String?,
      verificationStatus: map['patientInfo']?['verificationStatus'] as String? ??
          map['verificationStatus'] as String? ??
          'NOT_VERIFIED',
      createdAt: DateTime.parse(map['createdAt'] as String),
    );
  }

  factory Patient.fromJson(String source) =>
      Patient.fromMap(jsonDecode(source) as Map<String, dynamic>);

  @override
  List<Object?> get props => [
        id,
        email,
        firstName,
        middleName,
        lastName,
        gender,
        dateOfBirth,
        contactNumber,
        address,
        weight,
        height,
        bloodType,
        medicalHistory,
        allergies,
        medications,
        philHealthId,
        verificationStatus,
        createdAt,
      ];
}
