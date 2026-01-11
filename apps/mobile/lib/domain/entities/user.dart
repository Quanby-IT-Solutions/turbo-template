import 'dart:convert';

import 'package:equatable/equatable.dart';

class User extends Equatable {
  static const String patientRole = 'patient';
  static const String doctorRole = 'doctor';
  static const String adminRole = 'admin';
  static const String superAdminRole = 'superadmin';

  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String role;
  final String? profileImageUrl;
  final String verificationStatus;
  final DateTime createdAt;
  final DateTime? lastLoginAt;
  final bool twoFactorEnabled;

  const User({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
    this.profileImageUrl,
    required this.verificationStatus,
    required this.createdAt,
    this.lastLoginAt,
    this.twoFactorEnabled = false,
  });

  String get _normalizedRole => role.trim().toLowerCase();

  bool get isDoctor => _normalizedRole == doctorRole;
  bool get isPatient => _normalizedRole == patientRole;
  bool get isAdmin => _normalizedRole == adminRole;
  bool get isSuperAdmin => _normalizedRole == superAdminRole;
  bool get isVerified => verificationStatus == 'verified';

  String get displayName {
    final parts = <String>[
      firstName.trim(),
      lastName.trim(),
    ].where((value) => value.isNotEmpty).toList();

    if (parts.isNotEmpty) {
      return parts.join(' ');
    }

    final fallback = (firstName + lastName).trim();
    if (fallback.isNotEmpty) {
      return fallback;
    }

    return email;
  }

  String get initials {
    final firstInitial = firstName.trim().isNotEmpty
        ? firstName.trim()[0].toUpperCase()
        : '';
    final lastInitial = lastName.trim().isNotEmpty
        ? lastName.trim()[0].toUpperCase()
        : '';

    final combined = (firstInitial + lastInitial).trim();
    if (combined.isNotEmpty) {
      return combined;
    }

    final display = displayName;
    return display.isNotEmpty ? display[0].toUpperCase() : 'U';
  }

  User copyWith({
    String? id,
    String? email,
    String? firstName,
    String? lastName,
    String? role,
    String? profileImageUrl,
    String? verificationStatus,
    DateTime? createdAt,
    DateTime? lastLoginAt,
    bool? twoFactorEnabled,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      role: role ?? this.role,
      profileImageUrl: profileImageUrl ?? this.profileImageUrl,
      verificationStatus: verificationStatus ?? this.verificationStatus,
      createdAt: createdAt ?? this.createdAt,
      lastLoginAt: lastLoginAt ?? this.lastLoginAt,
      twoFactorEnabled: twoFactorEnabled ?? this.twoFactorEnabled,
    );
  }

  Map<String, dynamic> toMap() => {
    'id': id,
    'email': email,
    'firstName': firstName,
    'lastName': lastName,
    'displayName': displayName,
    'role': role,
    'profileImageUrl': profileImageUrl,
    'verificationStatus': verificationStatus,
    'createdAt': createdAt.toIso8601String(),
    'lastLoginAt': lastLoginAt?.toIso8601String(),
    'twoFactorEnabled': twoFactorEnabled,
  };

  String toJson() => jsonEncode(toMap());

  factory User.fromMap(Map<String, dynamic> map) {
    String? rawFirstName;
    String? rawLastName;

    if (map.containsKey('firstName')) {
      rawFirstName = map['firstName'] as String?;
    }
    if (map.containsKey('lastName')) {
      rawLastName = map['lastName'] as String?;
    }

    final metadata = map['metadata'];
    if (metadata is Map<String, dynamic>) {
      rawFirstName ??= metadata['firstName'] as String?;
      rawLastName ??= metadata['lastName'] as String?;
      rawFirstName ??= metadata['givenName'] as String?;
      rawLastName ??= metadata['familyName'] as String?;
    }

    final rawDisplayName =
        (map['displayName'] ?? map['name'] ?? map['fullName']) as String? ??
        (metadata is Map<String, dynamic>
            ? metadata['displayName'] as String?
            : null);

    var normalizedFirstName = rawFirstName?.trim() ?? '';
    var normalizedLastName = rawLastName?.trim() ?? '';

    if (normalizedFirstName.isEmpty && normalizedLastName.isEmpty) {
      final fallback = rawDisplayName?.trim();
      if (fallback != null && fallback.isNotEmpty) {
        final parts = fallback.split(RegExp(r'\s+'));
        if (parts.length == 1) {
          normalizedFirstName = parts.first;
        } else if (parts.isNotEmpty) {
          normalizedFirstName = parts.first;
          normalizedLastName = parts.sublist(1).join(' ');
        }
      }
    }

    if (normalizedFirstName.isEmpty && map['email'] is String) {
      final email = map['email'] as String;
      final localPart = email.contains('@') ? email.split('@').first : email;
      normalizedFirstName = localPart.isNotEmpty ? localPart : email;
    }

    return User(
      id: map['id'] as String,
      email: map['email'] as String,
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      role: map['role'] as String,
      profileImageUrl: map['profileImageUrl'] as String?,
      verificationStatus: map['verificationStatus'] as String,
      createdAt: DateTime.parse(map['createdAt'] as String),
      lastLoginAt: map['lastLoginAt'] != null
          ? DateTime.parse(map['lastLoginAt'] as String)
          : null,
      twoFactorEnabled: map['twoFactorEnabled'] as bool? ?? false,
    );
  }

  factory User.fromJson(String source) =>
      User.fromMap(jsonDecode(source) as Map<String, dynamic>);

  @override
  List<Object?> get props => [
    id,
    email,
    firstName,
    lastName,
    role,
    profileImageUrl,
    verificationStatus,
    createdAt,
    lastLoginAt,
    twoFactorEnabled,
  ];
}
