import 'package:dio/dio.dart';

/// Maps an auth failure to a fixed, user-facing string (MB-3 / F-45).
///
/// Errors used to be rendered with `error.toString()`, and the Dio branch fell
/// back to `error.message`, which embeds the host and port it tried to reach.
/// That put internal infrastructure on a user's screen — and into any
/// screenshot they send to support.
///
/// Every branch below returns a fixed string. Nothing derived from the
/// exception is interpolated, so there is no path by which a URL, a stack
/// frame or a server's raw text can reach the UI.
String authErrorMessage(Object? error) {
  if (error is DioException) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return 'The server took too long to respond. Please try again.';
      case DioExceptionType.connectionError:
        return 'Could not reach the server. Check your connection and try again.';
      case DioExceptionType.badCertificate:
        return 'Could not establish a secure connection.';
      case DioExceptionType.cancel:
        return 'The request was cancelled.';
      case DioExceptionType.badResponse:
      case DioExceptionType.unknown:
        return _fromStatus(error.response?.statusCode);
    }
  }

  return 'Something went wrong. Please try again.';
}

/// Status-based text. Deliberately coarse: the distinctions a user can act on
/// are "your credentials", "slow down", and "not your fault".
String _fromStatus(int? status) {
  if (status == null) return 'Something went wrong. Please try again.';

  if (status == 401 || status == 403) {
    // Same string for both, and for a missing account: a distinct message per
    // case is an account-enumeration oracle, exactly as in AC-4.
    return 'Incorrect email or password.';
  }
  if (status == 409) return 'That email is already registered.';
  if (status == 422 || status == 400) return 'Please check the details you entered.';
  if (status == 429) return 'Too many attempts. Please wait a moment and try again.';
  if (status >= 500) return 'The server is having trouble. Please try again shortly.';

  return 'Something went wrong. Please try again.';
}
