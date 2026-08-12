/// Client-side auth field rules (MB-3 / F-46).
///
/// The login and register forms enforced a 6-character password minimum while
/// the server requires 8 (`register.schema.ts`). A user could satisfy the form
/// and still be rejected, with the mismatch surfacing as a server error rather
/// than inline validation.
///
/// Kept in one place so the two screens cannot drift from each other again.
/// The server remains the authority; this only stops the form accepting input
/// the server will certainly refuse.
class AuthValidation {
  AuthValidation._();

  /// Must match `passwordMinLength` in the backend register schema.
  static const int passwordMinLength = 8;

  /// Inline error for a password field, or null when acceptable.
  static String? password(String? value) {
    if (value == null || value.isEmpty) return 'Please enter your password';
    if (value.length < passwordMinLength) {
      return 'Password must be at least $passwordMinLength characters';
    }
    return null;
  }
}
