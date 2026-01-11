import 'package:mobile/core/services/http_service.dart';
import 'package:mobile/domain/entities/two_factor_challenge.dart';
import 'package:mobile/domain/entities/user.dart';
import 'package:shared_preferences/shared_preferences.dart';

class TwoFactorRequiredException implements Exception {
  TwoFactorRequiredException(this.challenge);

  final TwoFactorChallenge challenge;

  @override
  String toString() => 'Two-factor authentication required';
}

/// Auth repository for real backend integration with better-auth
/// Uses cookie-based session management (no manual token handling)
class AuthRepository {
  static const String _userKey = 'user_data';
  static const String _hasSessionKey = 'has_session';
  static const String _userRoleKeyPrefix = 'user_role_';

  /// Save user data locally for quick access
  Future<void> _saveUser(User user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userKey, user.toJson());
    await prefs.setBool(_hasSessionKey, true);
  }

  String _roleStorageKey(String userId) => '$_userRoleKeyPrefix$userId';

  String? _normalizeRole(String? role) {
    if (role == null) return null;
    final normalized = role.trim().toUpperCase();
    // Map backend roles (uppercase) to domain roles (lowercase)
    switch (normalized) {
      case 'DOCTOR':
        return User.doctorRole;
      case 'PATIENT':
        return User.patientRole;
      case 'ADMIN':
        return User.adminRole;
      case 'SUPER_ADMIN':
        return User.superAdminRole;
      case 'ORGANIZATION':
        return User.doctorRole; // Organizations can be treated as doctors for now
      default:
        return normalized.toLowerCase();
    }
  }

  Future<User> _resolveUserRole(User user, {String? overrideRole}) async {
    final prefs = await SharedPreferences.getInstance();
    final key = _roleStorageKey(user.id);
    final storedRole = _normalizeRole(prefs.getString(key));
    final serverRole = _normalizeRole(user.role);
    final override = _normalizeRole(overrideRole);

    String resolvedRole;
    if (override != null) {
      resolvedRole = override;
    } else if (serverRole != null && serverRole != User.patientRole) {
      resolvedRole = serverRole;
    } else if (storedRole != null && storedRole != User.patientRole) {
      resolvedRole = storedRole;
    } else if (serverRole != null) {
      resolvedRole = serverRole;
    } else if (storedRole != null) {
      resolvedRole = storedRole;
    } else {
      resolvedRole = User.patientRole;
    }

    await prefs.setString(key, resolvedRole);
    return user.copyWith(role: resolvedRole);
  }

  Future<User> _persistUser(User user, {String? overrideRole}) async {
    final resolved = await _resolveUserRole(user, overrideRole: overrideRole);
    await _saveUser(resolved);
    return resolved;
  }

  /// Read user from local cache
  Future<User?> getStoredUser() async {
    final prefs = await SharedPreferences.getInstance();
    final cached = prefs.getString(_userKey);
    if (cached == null) return null;

    try {
      return User.fromJson(cached);
    } catch (_) {
      await _clearAuthData();
      return null;
    }
  }

  /// Check if user has a session marker
  Future<bool> _hasSessionMarker() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_hasSessionKey) ?? false;
  }

  /// Clear authentication data
  Future<void> _clearAuthData() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_userKey);
    await prefs.remove(_hasSessionKey);
  }

  /// Parse user from response data
  User _parseUser(Map<String, dynamic> data) {
    // Backend returns user directly (from profile) or wrapped in {user: {...}} (from login/register)
    Map<String, dynamic> user;
    if (data.containsKey('user')) {
      user = data['user'] as Map<String, dynamic>;
    } else {
      user = data;
    }

    if (user.isEmpty) {
      throw Exception('Invalid user data received from server');
    }

    // Get role from user object (backend uses uppercase: DOCTOR, PATIENT, etc.)
    final rawRole = user['role'] as String?;

    // Get firstName/lastName from patientInfo or doctorInfo (backend structure)
    String? rawFirstName;
    String? rawLastName;
    
    final patientInfo = user['patientInfo'] as Map<String, dynamic>?;
    final doctorInfo = user['doctorInfo'] as Map<String, dynamic>?;
    
    if (patientInfo != null) {
      rawFirstName = patientInfo['firstName'] as String?;
      rawLastName = patientInfo['lastName'] as String?;
    } else if (doctorInfo != null) {
      rawFirstName = doctorInfo['firstName'] as String?;
      rawLastName = doctorInfo['lastName'] as String?;
    }

    // Fallback to name field (backend users table has 'name' field)
    if (rawFirstName == null && rawLastName == null) {
      final name = user['name'] as String?;
      if (name != null && name.isNotEmpty) {
        final parts = name.trim().split(RegExp(r'\s+'));
        if (parts.isNotEmpty) {
          rawFirstName = parts.first;
          if (parts.length > 1) {
            rawLastName = parts.sublist(1).join(' ');
          }
        }
      }
    }

    var normalizedFirstName = rawFirstName?.trim() ?? '';
    var normalizedLastName = rawLastName?.trim() ?? '';

    // Final fallback to email
    if (normalizedFirstName.isEmpty && normalizedLastName.isEmpty) {
      final emailAddress = user['email'] as String;
      final localPart = emailAddress.contains('@')
          ? emailAddress.split('@').first
          : emailAddress;
      normalizedFirstName = localPart.isNotEmpty ? localPart : emailAddress;
      normalizedLastName = '';
    }

    final normalizedRole = _normalizeRole(rawRole) ?? User.patientRole;

    return User(
      id: user['id'] as String,
      email: user['email'] as String,
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      role: normalizedRole,
      profileImageUrl: user['profilePicture'] as String? ?? user['image'] as String?,
      verificationStatus: (user['emailVerified'] == true)
          ? 'verified'
          : 'pending_verification',
      createdAt: DateTime.parse(user['createdAt'] as String),
      lastLoginAt: DateTime.now(),
      twoFactorEnabled: user['twoFactorEnabled'] as bool? ?? false,
    );
  }

  /// Sign up a new user
  Future<User> signup({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    required String role,
  }) async {
    try {
      final response = await HttpService.signup(
        email: email,
        password: password,
        firstName: firstName,
        lastName: lastName,
        role: role,
      );

      final user = _parseUser(response);
      return _persistUser(user, overrideRole: role);
    } catch (e) {
      throw Exception('Registration failed: ${e.toString()}');
    }
  }

  /// Sign in an existing user
  Future<User> login(String email, String password) async {
    try {
      final response = await HttpService.signin(
        email: email,
        password: password,
      );

      if (response['twoFactorRedirect'] == true) {
        await HttpService.sendTwoFactorOtp();
        throw TwoFactorRequiredException(TwoFactorChallenge(email: email));
      }

      final user = _parseUser(response);
      return _persistUser(user);
    } catch (e) {
      if (e is TwoFactorRequiredException) {
        rethrow;
      }
      throw Exception('Login failed: ${e.toString()}');
    }
  }

  /// Sign out the current user
  Future<void> logout() async {
    try {
      if (await HttpService.hasCookies()) {
        await HttpService.signout();
      }
    } finally {
      await _clearAuthData();
    }
  }

  /// Get current user from stored session
  /// Validates session with backend to ensure it's still valid
  Future<User?> getCurrentUser() async {
    try {
      final hasSession = await _hasSessionMarker();
      if (!hasSession) return null;

      try {
        final response = await HttpService.getSession();
        final user = _parseUser(response);
        return _persistUser(user);
      } catch (_) {
        await _clearAuthData();
        return null;
      }
    } catch (_) {
      await _clearAuthData();
      return null;
    }
  }

  Future<User?> refreshSession() => getCurrentUser();

  /// Verify email with token
  Future<bool> verifyEmail(String token) async {
    try {
      await HttpService.verifyEmail(token: token);
      return true;
    } catch (e) {
      throw Exception('Email verification failed: ${e.toString()}');
    }
  }

  /// Request password reset
  Future<void> requestPasswordReset(String email) async {
    try {
      await HttpService.requestPasswordReset(email: email);
    } catch (e) {
      throw Exception('Password reset request failed: ${e.toString()}');
    }
  }

  /// Reset password with token
  Future<void> resetPassword(String token, String newPassword) async {
    try {
      await HttpService.resetPassword(token: token, newPassword: newPassword);
    } catch (e) {
      throw Exception('Password reset failed: ${e.toString()}');
    }
  }

  /// Enable two-factor authentication for the current user
  Future<void> enableTwoFactor(String password) async {
    try {
      await HttpService.enableTwoFactor(password: password);

      final session = await HttpService.getSession();
      final user = _parseUser(session);
      await _persistUser(user);
    } catch (e) {
      throw Exception('Failed to enable two-factor authentication: $e');
    }
  }

  /// Disable two-factor authentication for the current user
  Future<void> disableTwoFactor(String password) async {
    try {
      await HttpService.disableTwoFactor(password: password);
      final session = await HttpService.getSession();
      final user = _parseUser(session);
      await _persistUser(user);
    } catch (e) {
      throw Exception('Failed to disable two-factor authentication: $e');
    }
  }

  /// Request a new OTP for two-factor verification
  Future<void> sendTwoFactorOtp({bool trustDevice = false}) async {
    try {
      await HttpService.sendTwoFactorOtp(trustDevice: trustDevice);
    } catch (e) {
      throw Exception('Failed to send verification code: $e');
    }
  }

  /// Verify the OTP and refresh the user session
  Future<User> verifyTwoFactorOtp(
    String code, {
    bool trustDevice = false,
  }) async {
    try {
      await HttpService.verifyTwoFactorOtp(
        code: code,
        trustDevice: trustDevice,
      );

      final session = await HttpService.getSession();
      final user = _parseUser(session);
      await _persistUser(user);
      return user;
    } catch (e) {
      throw Exception('Two-factor verification failed: $e');
    }
  }
}
