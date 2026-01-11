import 'package:mobile/domain/entities/user.dart';

class MockAuthRepository {
  // Simulate network delay
  Future<void> _delay() async {
    await Future.delayed(const Duration(milliseconds: 1500));
  }

  // Predefined user accounts for RBAC testing
  final Map<String, Map<String, dynamic>> _users = {
    'doctor@telemed.com': {
      'password': 'doctor123',
      'user': User(
        id: 'doc_001',
        email: 'doctor@telemed.com',
        firstName: 'Sarah',
        lastName: 'Johnson',
        role: 'patient', // All users are patients now
        profileImageUrl: null,
        verificationStatus: 'verified',
        createdAt: DateTime(2023, 1, 15),
        lastLoginAt: DateTime.now(),
        twoFactorEnabled: false,
      ),
    },
    'patient@telemed.com': {
      'password': 'patient123',
      'user': User(
        id: 'pat_001',
        email: 'patient@telemed.com',
        firstName: 'John',
        lastName: 'Smith',
        role: 'patient',
        profileImageUrl: null,
        verificationStatus: 'verified',
        createdAt: DateTime(2023, 3, 20),
        lastLoginAt: DateTime.now(),
        twoFactorEnabled: false,
      ),
    },
    'dr.wilson@hospital.com': {
      'password': 'wilson456',
      'user': User(
        id: 'doc_002',
        email: 'dr.wilson@hospital.com',
        firstName: 'Michael',
        lastName: 'Wilson',
        role: 'patient', // All users are patients now
        profileImageUrl: null,
        verificationStatus: 'verified',
        createdAt: DateTime(2022, 8, 10),
        lastLoginAt: DateTime.now(),
        twoFactorEnabled: false,
      ),
    },
    'mary.patient@email.com': {
      'password': 'mary789',
      'user': User(
        id: 'pat_002',
        email: 'mary.patient@email.com',
        firstName: 'Mary',
        lastName: 'Davis',
        role: 'patient',
        profileImageUrl: null,
        verificationStatus: 'verified',
        createdAt: DateTime(2023, 5, 5),
        lastLoginAt: DateTime.now(),
        twoFactorEnabled: false,
      ),
    },
  };

  Future<User?> login(String email, String password) async {
    await _delay();

    final userData = _users[email.toLowerCase()];

    if (userData != null && userData['password'] == password) {
      final user = userData['user'] as User;
      // Update last login time
      return User(
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profileImageUrl: user.profileImageUrl,
        verificationStatus: user.verificationStatus,
        createdAt: user.createdAt,
        lastLoginAt: DateTime.now(),
        twoFactorEnabled: user.twoFactorEnabled,
      );
    }

    throw Exception(
      'Invalid email or password. Please check your credentials.',
    );
  }

  // Get available test accounts for demo
  Map<String, String> getTestAccounts() {
    return {
      'Doctor Account': 'doctor@telemed.com / doctor123',
      'Patient Account': 'patient@telemed.com / patient123',
      'Dr. Wilson': 'dr.wilson@hospital.com / wilson456',
      'Mary (Patient)': 'mary.patient@email.com / mary789',
    };
  }

  Future<User> signup({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
  }) async {
    await _delay();

    return User(
      id: 'user_${DateTime.now().millisecondsSinceEpoch}',
      email: email,
      firstName: firstName,
      lastName: lastName,
      role: 'patient', // All registered users are patients
      profileImageUrl: null,
      verificationStatus: 'pending_verification',
      createdAt: DateTime.now(),
      twoFactorEnabled: false,
    );
  }

  Future<bool> verifyMFA(String code) async {
    await _delay();

    // Accept any 6-digit code
    return code.length == 6 && code.contains(RegExp(r'^[0-9]+\$'));
  }

  Future<bool> uploadCredentials(List<String> filePaths) async {
    await _delay();

    // Simulate successful upload
    return filePaths.isNotEmpty;
  }

  Future<bool> performKYCVerification({
    required String documentType,
    required String documentImage,
    required String selfieImage,
  }) async {
    await _delay();

    // Simulate successful KYC
    return true;
  }

  Future<void> logout() async {
    await _delay();
  }

  Future<User?> getCurrentUser() async {
    // Simulate getting current user from storage
    await _delay();

    return User(
      id: 'user_123',
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'patient',
      profileImageUrl: null,
      verificationStatus: 'verified',
      createdAt: DateTime.now().subtract(const Duration(days: 30)),
      lastLoginAt: DateTime.now(),
      twoFactorEnabled: false,
    );
  }
}
