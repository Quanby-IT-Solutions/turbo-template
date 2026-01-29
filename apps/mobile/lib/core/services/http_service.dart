import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:cookie_jar/cookie_jar.dart';
import 'package:path_provider/path_provider.dart';

/// HTTP Service for API communication with cookie support
/// Handles all HTTP requests to the backend with Better Auth session management
class HttpService {
  static Dio? _dio;
  static PersistCookieJar? _cookieJar;

  // Base URL for the API - loaded from .env file
  static String get _baseUrl {
    final url = dotenv.env['BACKEND_API_URL'];
    if (url == null || url.isEmpty) {
      throw Exception(
        'BACKEND_API_URL not found in .env file. Please configure your .env file.',
      );
    }
    return url;
  }

  static const String _authEndpoint = '/api/v1/auth';

  /// Initialize Dio with cookie support
  static Future<Dio> _getDio() async {
    if (_dio != null && _cookieJar != null) {
      return _dio!;
    }

    _cookieJar = await _createCookieJar();

    // Initialize Dio
    _dio = Dio(
      BaseOptions(
        baseUrl: _baseUrl,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        validateStatus: (status) => status != null && status < 500,
        followRedirects: true,
        receiveTimeout: const Duration(seconds: 30),
        connectTimeout: const Duration(seconds: 30),
      ),
    );

    // Add cookie manager
    _dio!.interceptors.add(CookieManager(_cookieJar!));

    // Add logging interceptor in debug mode
    if (kDebugMode) {
      _dio!.interceptors.add(
        LogInterceptor(
          requestBody: true,
          responseBody: true,
          requestHeader: true,
          responseHeader: true,
        ),
      );
    }

    return _dio!;
  }

  /// Clear all cookies (used during logout)
  static Future<void> clearCookies() async {
    if (_cookieJar != null) {
      await _cookieJar!.deleteAll();
    }
  }

  /// Check if there are cookies stored for the auth domain
  static Future<bool> hasCookies() async {
    _cookieJar ??= await _createCookieJar();
    final uri = Uri.parse(_baseUrl);
    final cookies = await _cookieJar!.loadForRequest(uri);
    return cookies.isNotEmpty;
  }

  static Future<PersistCookieJar> _createCookieJar() async {
    final appDocDir = await getApplicationDocumentsDirectory();
    final cookiePath = '${appDocDir.path}/.cookies/';
    return PersistCookieJar(
      ignoreExpires: false,
      storage: FileStorage(cookiePath),
    );
  }

  /// Handle HTTP errors
  static Exception _handleError(Response response) {
    debugPrint('HTTP Error: ${response.statusCode}');
    debugPrint('Response: ${response.data}');

    try {
      final errorData = response.data is Map
          ? response.data
          : json.decode(response.data.toString());
      final message =
          errorData['message'] ?? errorData['error'] ?? 'An error occurred';
      return Exception(message);
    } catch (e) {
      return Exception(
        'HTTP ${response.statusCode}: ${response.statusMessage}',
      );
    }
  }

  /// Sign up a new user
  static Future<Map<String, dynamic>> signup({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    required String role,
  }) async {
    try {
      final dio = await _getDio();
      // Map domain roles to backend roles (uppercase)
      final backendRole = _mapRoleToBackend(role);
      final normalizedFirstName = firstName.trim();
      final normalizedLastName = lastName.trim();

      final response = await dio.post(
        '$_authEndpoint/register',
        data: {
          'email': email,
          'password': password,
          'firstName': normalizedFirstName,
          'lastName': normalizedLastName,
          'role': backendRole,
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final responseData = response.data as Map<String, dynamic>;
        // Backend returns {success: true, data: {...}}
        if (responseData['success'] == true && responseData['data'] != null) {
          return responseData['data'] as Map<String, dynamic>;
        }
        return responseData;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Signup error: $e');
      rethrow;
    }
  }

  /// Sign in an existing user
  static Future<Map<String, dynamic>> signin({
    required String email,
    required String password,
  }) async {
    try {
      final dio = await _getDio();
      final response = await dio.post(
        '$_authEndpoint/login',
        data: {'email': email, 'password': password},
      );

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        // Backend returns {success: true, data: {user: {...}, session: {...}, sessionToken: "..."}}
        if (responseData['success'] == true && responseData['data'] != null) {
          return responseData['data'] as Map<String, dynamic>;
        }
        return responseData;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Signin error: $e');
      rethrow;
    }
  }

  /// Sign out the current user
  static Future<void> signout() async {
    try {
      final dio = await _getDio();
      final response = await dio.post('$_authEndpoint/logout');

      if (response.statusCode != 200) {
        throw _handleError(response);
      }

      // Clear cookies after successful signout
      await clearCookies();
    } catch (e) {
      debugPrint('Signout error: $e');
      // Clear cookies even if signout fails
      await clearCookies();
      rethrow;
    }
  }

  /// Get current user session/profile
  static Future<Map<String, dynamic>> getSession() async {
    try {
      final dio = await _getDio();
      final response = await dio.get('$_authEndpoint/profile');

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        // Backend returns {success: true, data: user}
        if (responseData['success'] == true && responseData['data'] != null) {
          // Return user in format expected by auth repository
          final user = responseData['data'] as Map<String, dynamic>;
          return {'user': user};
        }
        return responseData;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Get session error: $e');
      rethrow;
    }
  }

  /// Verify email
  static Future<Map<String, dynamic>> verifyEmail({
    required String token,
  }) async {
    try {
      final dio = await _getDio();
      final response = await dio.post(
        '$_authEndpoint/verify-email',
        data: {'token': token},
      );

      if (response.statusCode == 200) {
        return response.data as Map<String, dynamic>;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Verify email error: $e');
      rethrow;
    }
  }

  /// Request password reset
  static Future<void> requestPasswordReset({required String email}) async {
    try {
      final dio = await _getDio();
      final response = await dio.post(
        '$_authEndpoint/forget-password',
        data: {'email': email},
      );

      if (response.statusCode != 200) {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Request password reset error: $e');
      rethrow;
    }
  }

  /// Reset password
  static Future<void> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    try {
      final dio = await _getDio();
      final response = await dio.post(
        '$_authEndpoint/reset-password',
        data: {'token': token, 'newPassword': newPassword},
      );

      if (response.statusCode != 200) {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Reset password error: $e');
      rethrow;
    }
  }

  /// Enable two-factor authentication
  static Future<void> enableTwoFactor({
    required String password,
    String? issuer,
  }) async {
    try {
      final dio = await _getDio();
      final payload = {
        'password': password,
        if (issuer != null) 'issuer': issuer,
      };
      final response = await dio.post(
        '$_authEndpoint/two-factor/enable',
        data: payload,
      );

      if (response.statusCode == 200) {
        return;
      }

      throw _handleError(response);
    } catch (e) {
      debugPrint('Enable two-factor error: $e');
      rethrow;
    }
  }

  /// Disable two-factor authentication
  static Future<void> disableTwoFactor({required String password}) async {
    try {
      final dio = await _getDio();
      final response = await dio.post(
        '$_authEndpoint/two-factor/disable',
        data: {'password': password},
      );

      if (response.statusCode != 200) {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Disable two-factor error: $e');
      rethrow;
    }
  }

  /// Send a two-factor OTP to the current user
  static Future<void> sendTwoFactorOtp({bool trustDevice = false}) async {
    try {
      final dio = await _getDio();
      final response = await dio.post(
        '$_authEndpoint/two-factor/send-otp',
        data: {'trustDevice': trustDevice},
      );

      if (response.statusCode != 200) {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Send OTP error: $e');
      rethrow;
    }
  }

  /// Verify a two-factor OTP code and optionally trust the device
  static Future<void> verifyTwoFactorOtp({
    required String code,
    bool trustDevice = false,
  }) async {
    try {
      final dio = await _getDio();
      final response = await dio.post(
        '$_authEndpoint/two-factor/verify-otp',
        data: {'code': code, 'trustDevice': trustDevice},
      );

      if (response.statusCode != 200) {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Verify OTP error: $e');
      rethrow;
    }
  }

  // ===================
  // Appointment Methods
  // ===================

  static const String _appointmentsEndpoint = '/api/v1/appointments';

  /// Create a new appointment
  static Future<Map<String, dynamic>> createAppointment({
    required String doctorId,
    required String requestedDate,
    required String requestedTime,
    String? reason,
    String? notes,
    String? priority,
    int? durationMinutes,
  }) async {
    try {
      final dio = await _getDio();

      final requestData = {
        'doctorId': doctorId,
        'requestedDate': requestedDate,
        'requestedTime': requestedTime,
        'reason': reason ?? '',
        'priority': priority ?? 'NORMAL',
        if (notes != null) 'notes': notes,
      };

      debugPrint('Creating appointment with data: $requestData');
      debugPrint('requestedDate type: ${requestedDate.runtimeType}');

      final response = await dio.post(
        '$_appointmentsEndpoint/request',
        data: requestData,
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final responseData = response.data as Map<String, dynamic>;
        // Backend returns {success: true, data: appointment}
        if (responseData['success'] == true && responseData['data'] != null) {
          // Backend returns array from .returning(), get first element
          final appointmentData = responseData['data'];
          if (appointmentData is List && appointmentData.isNotEmpty) {
            return appointmentData[0] as Map<String, dynamic>;
          }
          return appointmentData as Map<String, dynamic>;
        }
        return responseData;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Create appointment error: $e');
      rethrow;
    }
  }

  /// Get appointments list (for current user based on role)
  static Future<Map<String, dynamic>> getAppointments({
    String? status,
    int? limit,
  }) async {
    try {
      final dio = await _getDio();
      final queryParams = <String, dynamic>{};
      if (status != null) queryParams['status'] = status.toUpperCase();
      if (limit != null) queryParams['limit'] = limit;

      final response = await dio.get(
        '$_appointmentsEndpoint/my-appointments',
        queryParameters: queryParams,
      );

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        // Backend returns {success: true, data: {items: [...], total, page, limit, totalPages}}
        if (responseData['success'] == true && responseData['data'] != null) {
          return responseData['data'] as Map<String, dynamic>;
        }
        return responseData;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Get appointments error: $e');
      rethrow;
    }
  }

  /// Get a single appointment by ID
  static Future<Map<String, dynamic>> getAppointment(String id) async {
    try {
      final dio = await _getDio();
      final response = await dio.get('$_appointmentsEndpoint/$id');

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        // Backend returns {success: true, data: appointment}
        if (responseData['success'] == true && responseData['data'] != null) {
          return responseData['data'] as Map<String, dynamic>;
        }
        return responseData;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Get appointment error: $e');
      rethrow;
    }
  }

  /// Get doctor availability for a specific date
  static Future<dynamic> getDoctorAvailability({
    required String doctorId,
    required String date,
  }) async {
    try {
      final dio = await _getDio();
      final response = await dio.get(
        '/appointments/doctor/$doctorId/availability',
      );

      if (response.statusCode == 200) {
        return response.data;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Get doctor availability error: $e');
      rethrow;
    }
  }

  /// Get available time slots for a specific date
  static Future<dynamic> getDoctorAvailableSlots({
    required String doctorId,
    required String date,
  }) async {
    try {
      final dio = await _getDio();
      final response = await dio.get(
        '$_appointmentsEndpoint/doctor/$doctorId/available-slots',
        queryParameters: {'date': date},
      );

      if (response.statusCode == 200) {
        return response.data;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Get available slots error: $e');
      rethrow;
    }
  }

  /// Update appointment status
  static Future<Map<String, dynamic>> updateAppointmentStatus({
    required String id,
    required String status,
    String? notes,
  }) async {
    try {
      final dio = await _getDio();
      final response = await dio.patch(
        '$_appointmentsEndpoint/$id',
        data: {
          'status': status.toUpperCase(),
          if (notes != null) 'notes': notes,
        },
      );

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        // Backend returns {success: true, data: appointment}
        if (responseData['success'] == true && responseData['data'] != null) {
          return responseData['data'] as Map<String, dynamic>;
        }
        return responseData;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Update appointment status error: $e');
      rethrow;
    }
  }

  /// Cancel an appointment
  static Future<Map<String, dynamic>> cancelAppointment({
    required String id,
    String? cancellationReason,
  }) async {
    try {
      final dio = await _getDio();
      final response = await dio.patch(
        '$_appointmentsEndpoint/$id/cancel',
        data: {
          if (cancellationReason != null)
            'cancellationReason': cancellationReason,
        },
      );

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        // Backend returns {success: true, data: appointment}
        if (responseData['success'] == true && responseData['data'] != null) {
          return responseData['data'] as Map<String, dynamic>;
        }
        return responseData;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Cancel appointment error: $e');
      rethrow;
    }
  }

  /// Propose a reschedule for an appointment
  static Future<Map<String, dynamic>> proposeReschedule({
    required String appointmentId,
    required String newDate,
    required String newTime,
    required String reason,
    String? notes,
  }) async {
    try {
      final dio = await _getDio();
      final response = await dio.post(
        '$_appointmentsEndpoint/$appointmentId/reschedule',
        data: {
          'newDate': newDate,
          'newTime': newTime,
          'reason': reason,
          if (notes != null) 'notes': notes,
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final responseData = response.data as Map<String, dynamic>;
        // Backend returns {success: true, data: {...}}
        if (responseData['success'] == true && responseData['data'] != null) {
          return responseData['data'] as Map<String, dynamic>;
        }
        return responseData;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Propose reschedule error: $e');
      rethrow;
    }
  }

  /// Respond to a reschedule request (approve or reject)
  static Future<Map<String, dynamic>> respondToReschedule({
    required String appointmentId,
    required String requestId,
    required String response, // 'APPROVED' or 'REJECTED'
    String? notes,
  }) async {
    try {
      final dio = await _getDio();
      final responseData = await dio.post(
        '$_appointmentsEndpoint/$appointmentId/reschedule/$requestId/respond',
        data: {'response': response, if (notes != null) 'notes': notes},
      );

      if (responseData.statusCode == 200) {
        final data = responseData.data as Map<String, dynamic>;
        // Backend returns {success: true, data: {...}}
        if (data['success'] == true && data['data'] != null) {
          return data['data'] as Map<String, dynamic>;
        }
        return data;
      } else {
        throw _handleError(responseData);
      }
    } catch (e) {
      debugPrint('Respond to reschedule error: $e');
      rethrow;
    }
  }

  /// Get reschedule history for an appointment
  static Future<Map<String, dynamic>> getRescheduleHistory(
    String appointmentId,
  ) async {
    try {
      final dio = await _getDio();
      final response = await dio.get(
        '$_appointmentsEndpoint/$appointmentId/reschedule-history',
      );

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        // Backend returns {success: true, data: {...}}
        if (responseData['success'] == true && responseData['data'] != null) {
          return responseData['data'] as Map<String, dynamic>;
        }
        return responseData;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Get reschedule history error: $e');
      rethrow;
    }
  }

  // ===================
  // Availability Methods
  // ===================

  static const String _availabilityEndpoint = '/api/availability';

  /// Get weekly availability for a doctor
  static Future<Map<String, dynamic>> getWeeklyAvailability(
    String doctorId,
  ) async {
    try {
      final dio = await _getDio();
      final response = await dio.get('$_availabilityEndpoint/weekly/$doctorId');

      if (response.statusCode == 200) {
        return response.data as Map<String, dynamic>;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Get weekly availability error: $e');
      rethrow;
    }
  }

  /// Set weekly availability for a doctor
  static Future<Map<String, dynamic>> setWeeklyAvailability({
    required String doctorId,
    required List<Map<String, dynamic>> slots,
  }) async {
    try {
      final dio = await _getDio();
      final response = await dio.put(
        '$_availabilityEndpoint/weekly',
        data: {'doctorId': doctorId, 'slots': slots},
      );

      if (response.statusCode == 200) {
        return response.data as Map<String, dynamic>;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Set weekly availability error: $e');
      rethrow;
    }
  }

  // ===================
  // Vitals Methods
  // ===================

  static const String _vitalsEndpoint = '/api/v1/self-check';

  /// Create self-check vitals (doesn't require consultation)
  static Future<Map<String, dynamic>> createSelfCheckVitals({
    required String patientId,
    double? heartRate,
    double? spO2,
    double? respiratoryRate,
    double? stressLevel,
    double? stressScore,
    double? hrvSdnn,
    double? hrvRmsdd,
    double? generalWellness,
    String? bloodPressure,
  }) async {
    try {
      final dio = await _getDio();
      final response = await dio.post(
        _vitalsEndpoint,
        data: {
          'patientId': patientId,
          if (heartRate != null) 'heartRate': heartRate,
          if (spO2 != null) 'spO2': spO2,
          if (respiratoryRate != null) 'respiratoryRate': respiratoryRate,
          if (stressLevel != null) 'stressLevel': stressLevel,
          if (stressScore != null) 'stressScore': stressScore,
          if (hrvSdnn != null) 'hrvSdnn': hrvSdnn,
          if (hrvRmsdd != null) 'hrvRmsdd': hrvRmsdd,
          if (generalWellness != null) 'generalWellness': generalWellness,
          if (bloodPressure != null) 'bloodPressure': bloodPressure,
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final responseData = response.data as Map<String, dynamic>;
        // Backend returns {success: true, data: vitals}
        if (responseData['success'] == true && responseData['data'] != null) {
          return responseData['data'] as Map<String, dynamic>;
        }
        return responseData;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Create self-check vitals error: $e');
      rethrow;
    }
  }

  /// Get vitals history for a patient
  static Future<Map<String, dynamic>> getVitalsHistory({
    required String patientId,
    String? startDate,
    String? endDate,
    int? limit,
  }) async {
    try {
      final dio = await _getDio();
      final queryParams = <String, dynamic>{};
      if (startDate != null) queryParams['startDate'] = startDate;
      if (endDate != null) queryParams['endDate'] = endDate;
      if (limit != null) queryParams['limit'] = limit;

      final response = await dio.get(
        '$_vitalsEndpoint/history/$patientId',
        queryParameters: queryParams,
      );

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        // Backend returns {success: true, data: {...}}
        if (responseData['success'] == true && responseData['data'] != null) {
          return responseData['data'] as Map<String, dynamic>;
        }
        return responseData;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Get vitals history error: $e');
      rethrow;
    }
  }

  // ===================
  // Video Call Methods
  // ===================

  static const String _videoCallEndpoint = '/api/v1/webrtc';

  /// Generate WebRTC token for video call (placeholder - backend WebRTC implementation)
  static Future<Map<String, dynamic>> generateVideoCallToken({
    required String consultationId,
  }) async {
    try {
      final dio = await _getDio();
      final response = await dio.post(
        '$_videoCallEndpoint/token',
        data: {'consultationId': consultationId},
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final responseData = response.data as Map<String, dynamic>;
        // Backend returns {success: true, data: {...}}
        if (responseData['success'] == true && responseData['data'] != null) {
          return responseData['data'] as Map<String, dynamic>;
        }
        return responseData;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Generate video call token error: $e');
      rethrow;
    }
  }

  // ===================
  // Consultation Methods
  // ===================

  static const String _consultationsEndpoint = '/api/v1/consultations';

  /// Get consultations
  static Future<Map<String, dynamic>> getConsultations({
    String? patientId,
    String? doctorId,
    int? page,
    int? limit,
  }) async {
    try {
      final dio = await _getDio();
      final queryParams = <String, dynamic>{};
      if (patientId != null && patientId.isNotEmpty) {
        queryParams['patientId'] = patientId;
      }
      if (doctorId != null && doctorId.isNotEmpty) {
        queryParams['doctorId'] = doctorId;
      }
      if (page != null) queryParams['page'] = page;
      if (limit != null) queryParams['limit'] = limit;

      final response = await dio.get(
        _consultationsEndpoint,
        queryParameters: queryParams,
      );

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        // Backend returns {success: true, data: consultations[]} or {success: true, data: {items: [...], total, page, limit, totalPages}}
        if (responseData['success'] == true && responseData['data'] != null) {
          final data = responseData['data'];
          // Handle case where data is a List directly
          if (data is List) {
            return {
              'items': data,
              'total': data.length,
              'page': page ?? 1,
              'limit': limit ?? data.length,
              'totalPages': 1,
            };
          }
          // Handle case where data is already a Map (paginated response)
          if (data is Map<String, dynamic>) {
            return data;
          }
        }
        return responseData;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Get consultations error: $e');
      rethrow;
    }
  }

  /// Get consultation by ID
  static Future<Map<String, dynamic>> getConsultation(String id) async {
    try {
      final dio = await _getDio();
      final response = await dio.get('$_consultationsEndpoint/$id');

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        // Backend returns {success: true, data: consultation}
        if (responseData['success'] == true && responseData['data'] != null) {
          return responseData['data'] as Map<String, dynamic>;
        }
        return responseData;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Get consultation error: $e');
      rethrow;
    }
  }

  /// Update consultation (for post-call notes)
  static Future<Map<String, dynamic>> updateConsultation({
    required String consultationId,
    String? notes,
    String? diagnosis,
    String? treatment,
    String? followUpDate,
    String? status,
  }) async {
    try {
      final dio = await _getDio();
      final data = <String, dynamic>{};
      if (notes != null) data['notes'] = notes;
      if (diagnosis != null) data['diagnosis'] = diagnosis;
      if (treatment != null) data['treatment'] = treatment;
      if (followUpDate != null) data['followUpDate'] = followUpDate;
      if (status != null) data['status'] = status;

      final response = await dio.patch(
        '$_consultationsEndpoint/$consultationId',
        data: data,
      );

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        // Backend returns {success: true, data: {...}}
        if (responseData['success'] == true && responseData['data'] != null) {
          return responseData['data'] as Map<String, dynamic>;
        }
        return responseData;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Update consultation error: $e');
      rethrow;
    }
  }

  // ===================
  // Search Methods
  // ===================

  /// Search for doctors
  static Future<Map<String, dynamic>> searchDoctors({
    String? name,
    String? specialization,
    String? organizationId,
    bool? availableOnly,
    int? page,
    int? limit,
  }) async {
    try {
      final dio = await _getDio();
      final queryParams = <String, dynamic>{};
      if (name != null && name.isNotEmpty) queryParams['name'] = name;
      if (specialization != null && specialization.isNotEmpty) {
        queryParams['specialization'] = specialization;
      }
      if (organizationId != null && organizationId.isNotEmpty) {
        queryParams['organizationId'] = organizationId;
      }
      if (availableOnly != null) queryParams['availableOnly'] = availableOnly;
      if (page != null) queryParams['page'] = page;
      if (limit != null) queryParams['limit'] = limit;

      final response = await dio.get(
        '/api/v1/doctors',
        queryParameters: queryParams,
      );

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        // Backend returns {success: true, data: {items: [...], total, page, limit, totalPages}}
        if (responseData['success'] == true && responseData['data'] != null) {
          return responseData['data'] as Map<String, dynamic>;
        }
        return responseData;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Search doctors error: $e');
      rethrow;
    }
  }

  /// Search for organizations
  static Future<Map<String, dynamic>> searchOrganizations({
    String? name,
    String? type,
    bool? verified,
    int? page,
    int? limit,
  }) async {
    try {
      final dio = await _getDio();
      final queryParams = <String, dynamic>{};
      if (name != null && name.isNotEmpty) queryParams['name'] = name;
      if (type != null && type.isNotEmpty) queryParams['type'] = type;
      if (verified != null) queryParams['verified'] = verified;
      if (page != null) queryParams['page'] = page;
      if (limit != null) queryParams['limit'] = limit;

      final response = await dio.get(
        '/api/v1/organizations',
        queryParameters: queryParams,
      );

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;

        // ✅ Handle both response formats
        if (responseData['success'] == true && responseData['data'] != null) {
          final data = responseData['data'];

          // If data is a List, wrap it in the expected format
          if (data is List) {
            return {
              'data': data, // Keep it as 'data' key with the list
              'total': data.length,
              'page': page ?? 1,
              'limit': limit ?? data.length,
              'totalPages': 1,
            };
          }

          // If data is already a Map with items, return it as is
          if (data is Map<String, dynamic>) {
            return data;
          }
        }

        return responseData;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Search organizations error: $e');
      rethrow;
    }
  }

  /// Get organization by ID
  static Future<Map<String, dynamic>> getOrganization(String id) async {
    try {
      final dio = await _getDio();
      final response = await dio.get('/api/v1/organizations/$id');

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        if (responseData['success'] == true && responseData['data'] != null) {
          return responseData['data'] as Map<String, dynamic>;
        }
        return responseData;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Get organization error: $e');
      rethrow;
    }
  }

  // ===================
  // Patient Methods
  // ===================

  /// Get a patient by ID
  static Future<Map<String, dynamic>> getPatient(String id) async {
    try {
      final dio = await _getDio();
      final response = await dio.get('/api/v1/patients/$id');

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        // Backend returns {success: true, data: patient}
        if (responseData['success'] == true && responseData['data'] != null) {
          return responseData['data'] as Map<String, dynamic>;
        }
        return responseData;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Get patient error: $e');
      rethrow;
    }
  }

  /// Get list of patients (for doctors/admins)
  static Future<Map<String, dynamic>> getPatients({
    String? search,
    int? page,
    int? limit,
  }) async {
    try {
      final dio = await _getDio();
      final queryParams = <String, dynamic>{};
      if (search != null && search.isNotEmpty) queryParams['search'] = search;
      if (page != null) queryParams['page'] = page;
      if (limit != null) queryParams['limit'] = limit;

      final response = await dio.get(
        '/api/v1/patients',
        queryParameters: queryParams,
      );

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        // Backend returns {success: true, data: {items: [...], total, page, limit, totalPages}}
        if (responseData['success'] == true && responseData['data'] != null) {
          return responseData['data'] as Map<String, dynamic>;
        }
        return responseData;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Get patients error: $e');
      rethrow;
    }
  }

  /// Update patient information
  static const String _patientsEndpoint = '/api/v1/patients';

  static Future<Map<String, dynamic>> updatePatient(
    String id,
    Map<String, dynamic> data,
  ) async {
    try {
      final dio = await _getDio();

      // Use PUT method
      final response = await dio.put('$_patientsEndpoint/$id', data: data);

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        // Backend returns {success: true, data: patient}
        if (responseData['success'] == true && responseData['data'] != null) {
          return responseData['data'] as Map<String, dynamic>;
        }
        return responseData;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Update patient error: $e');
      rethrow;
    }
  }

  // ===================
  // Medical Records Methods
  // ===================

  static const String _medicalRecordsEndpoint = '/api/v1/medical-records';
  static const String _labRequestsEndpoint = '/api/v1/lab-requests';

  /// Get medical records
  static Future<List<Map<String, dynamic>>> getMedicalRecords({
    String? patientId,
    String? recordType,
  }) async {
    try {
      final dio = await _getDio();
      final queryParams = <String, dynamic>{};
      if (patientId != null && patientId.isNotEmpty) {
        queryParams['patientId'] = patientId;
      }
      if (recordType != null && recordType.isNotEmpty) {
        queryParams['recordType'] = recordType;
      }

      final response = await dio.get(
        _medicalRecordsEndpoint,
        queryParameters: queryParams,
      );

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        // Backend returns {success: true, data: records[]}
        if (responseData['success'] == true && responseData['data'] != null) {
          final data = responseData['data'];
          if (data is List) {
            return data.cast<Map<String, dynamic>>();
          }
          return [];
        }
        return [];
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Get medical records error: $e');
      rethrow;
    }
  }

  /// Get medical record by ID
  static Future<Map<String, dynamic>> getMedicalRecord(String id) async {
    try {
      final dio = await _getDio();
      final response = await dio.get('$_medicalRecordsEndpoint/$id');

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        // Backend returns {success: true, data: record}
        if (responseData['success'] == true && responseData['data'] != null) {
          return responseData['data'] as Map<String, dynamic>;
        }
        return responseData;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Get medical record error: $e');
      rethrow;
    }
  }

  // ===================
  // Prescriptions Methods
  // ===================

  static const String _prescriptionsEndpoint = '/api/v1/prescriptions';

  /// Get prescriptions
  static Future<Map<String, dynamic>> getPrescriptions({
    String? patientId,
    String? doctorId,
    bool? isActive,
    int? page,
    int? limit,
  }) async {
    try {
      final dio = await _getDio();
      final queryParams = <String, dynamic>{};
      if (patientId != null && patientId.isNotEmpty) {
        queryParams['patientId'] = patientId;
      }
      if (doctorId != null && doctorId.isNotEmpty) {
        queryParams['doctorId'] = doctorId;
      }
      if (isActive != null) queryParams['isActive'] = isActive;
      if (page != null) queryParams['page'] = page;
      if (limit != null) queryParams['limit'] = limit;

      final response = await dio.get(
        _prescriptionsEndpoint,
        queryParameters: queryParams,
      );

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        // Backend returns {success: true, data: prescriptions[]}
        if (responseData['success'] == true && responseData['data'] != null) {
          final data = responseData['data'];
          if (data is List) {
            return {'items': data};
          }
          return responseData['data'] as Map<String, dynamic>;
        }
        return responseData;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Get prescriptions error: $e');
      rethrow;
    }
  }

  /// Get prescription by ID
  static Future<Map<String, dynamic>> getPrescription(String id) async {
    try {
      final dio = await _getDio();
      final response = await dio.get('$_prescriptionsEndpoint/$id');

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        // Backend returns {success: true, data: prescription}
        if (responseData['success'] == true && responseData['data'] != null) {
          return responseData['data'] as Map<String, dynamic>;
        }
        return responseData;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Get prescription error: $e');
      rethrow;
    }
  }

  // ===================
  // Doctor Methods
  // ===================

  /// Get a doctor by ID
  static Future<Map<String, dynamic>> getDoctor(String id) async {
    try {
      final dio = await _getDio();
      final response = await dio.get('/api/v1/doctors/$id');

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        // Backend returns {success: true, data: doctor}
        if (responseData['success'] == true && responseData['data'] != null) {
          return responseData['data'] as Map<String, dynamic>;
        }
        return responseData;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Get doctor error: $e');
      rethrow;
    }
  }

  // ===================
  // Helper Methods
  // ===================

  /// Map domain role (lowercase) to backend role (uppercase)
  static String _mapRoleToBackend(String domainRole) {
    final normalized = domainRole.trim().toUpperCase();
    switch (normalized) {
      case 'DOCTOR':
        return 'DOCTOR';
      case 'PATIENT':
        return 'PATIENT';
      case 'ADMIN':
        return 'ADMIN';
      case 'SUPER_ADMIN':
      case 'SUPERADMIN':
        return 'SUPER_ADMIN';
      case 'ORGANIZATION':
        return 'ORGANIZATION';
      default:
        return 'PATIENT'; // Default to PATIENT
    }
  }

  // ===================
  // Lab Requests Methods
  // ===================

  /// Get patient lab requests
  static Future<List<Map<String, dynamic>>> getPatientLabRequests(
    String patientId,
  ) async {
    try {
      final dio = await _getDio();
      final response = await dio.get(
        '$_labRequestsEndpoint/patient/$patientId',
      );

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        // Backend returns {success: true, data: [...]}
        if (responseData['success'] == true && responseData['data'] != null) {
          final data = responseData['data'];
          if (data is List) {
            return data.cast<Map<String, dynamic>>();
          }
          return [];
        }
        return [];
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Get patient lab requests error: $e');
      rethrow;
    }
  }

  static Future<List<Map<String, dynamic>>> getAllLabRequests() async {
    try {
      final dio = await _getDio();
      final response = await dio.get(_labRequestsEndpoint);

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        // Backend returns {success: true, data: [...]}
        if (responseData['success'] == true && responseData['data'] != null) {
          final data = responseData['data'];
          if (data is List) {
            return data.cast<Map<String, dynamic>>();
          }
          return [];
        }
        return [];
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Get all lab requests error: $e');
      rethrow;
    }
  }

  /// Create a new lab request
  static Future<Map<String, dynamic>> createLabRequest({
    required String patientId,
    required String organizationId,
    String? doctorId,
    String? roomId,
    String? note,
    String? status,
    String? priority,
    String? requestedTests, // Changed from List<String>? to String?
    String? instructions,
  }) async {
    try {
      final dio = await _getDio();
      final response = await dio.post(
        _labRequestsEndpoint,
        data: {
          'patientId': patientId,
          'organizationId': organizationId,
          if (doctorId != null) 'doctorId': doctorId,
          if (roomId != null) 'roomId': roomId,
          if (note != null) 'note': note,
          'status': status ?? 'PENDING',
          'priority': priority ?? 'NORMAL',
          if (requestedTests != null)
            'requestedTests': requestedTests, // Send as string
          if (instructions != null) 'instructions': instructions,
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final responseData = response.data as Map<String, dynamic>;
        if (responseData['success'] == true && responseData['data'] != null) {
          return responseData['data'] as Map<String, dynamic>;
        }
        return responseData;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Create lab request error: $e');
      rethrow;
    }
  }

  /// Get doctors by organization ID
  static Future<List<Map<String, dynamic>>> getDoctorsByOrganization(
    String organizationId,
  ) async {
    try {
      final dio = await _getDio();
      final response = await dio.get(
        '/api/v1/doctors',
        queryParameters: {'organizationId': organizationId},
      );

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        if (responseData['success'] == true && responseData['data'] != null) {
          final data = responseData['data'];
          if (data is Map && data['items'] is List) {
            return (data['items'] as List).cast<Map<String, dynamic>>();
          }
        }
        return [];
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Get doctors by organization error: $e');
      rethrow;
    }
  }

  /// Get doctor lab requests
  static Future<List<Map<String, dynamic>>> getDoctorLabRequests(
    String doctorId,
  ) async {
    try {
      final dio = await _getDio();
      final response = await dio.get('$_labRequestsEndpoint/doctor/$doctorId');

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        // Backend returns {success: true, data: [...]}
        if (responseData['success'] == true && responseData['data'] != null) {
          final data = responseData['data'];
          if (data is List) {
            return data.cast<Map<String, dynamic>>();
          }
          return [];
        }
        return [];
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Get doctor lab requests error: $e');
      rethrow;
    }
  }

  /// Get room lab requests
  static Future<List<Map<String, dynamic>>> getRoomLabRequests(
    String roomId,
  ) async {
    try {
      final dio = await _getDio();
      final response = await dio.get('$_labRequestsEndpoint/room/$roomId');

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        // Backend returns {success: true, data: [...]}
        if (responseData['success'] == true && responseData['data'] != null) {
          final data = responseData['data'];
          if (data is List) {
            return data.cast<Map<String, dynamic>>();
          }
          return [];
        }
        return [];
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Get room lab requests error: $e');
      rethrow;
    }
  }

  /// Get a single lab request by ID
  static Future<Map<String, dynamic>> getLabRequest(String id) async {
    try {
      final dio = await _getDio();
      final response = await dio.get('$_labRequestsEndpoint/$id');

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        // Backend returns {success: true, data: labRequest}
        if (responseData['success'] == true && responseData['data'] != null) {
          return responseData['data'] as Map<String, dynamic>;
        }
        return responseData;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Get lab request error: $e');
      rethrow;
    }
  }

  /// Update a lab request
  static Future<Map<String, dynamic>> updateLabRequest({
    required String id,
    String? patientId,
    String? organizationId,
    String? doctorId,
    String? roomId,
    String? note,
    String? status,
    String? priority,
    String? requestedTests,
    String? instructions,
  }) async {
    try {
      final dio = await _getDio();

      final data = <String, dynamic>{};
      if (patientId != null) data['patientId'] = patientId;
      if (organizationId != null) data['organizationId'] = organizationId;
      if (doctorId != null) data['doctorId'] = doctorId;
      if (roomId != null) data['roomId'] = roomId;
      if (note != null) data['note'] = note;
      if (status != null) data['status'] = status.toUpperCase();
      if (priority != null) data['priority'] = priority.toUpperCase();
      if (requestedTests != null) {
        data['requestedTests'] = requestedTests; // String
      }
      if (instructions != null) data['instructions'] = instructions;

      final response = await dio.put('$_labRequestsEndpoint/$id', data: data);

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        if (responseData['success'] == true && responseData['data'] != null) {
          return responseData['data'] as Map<String, dynamic>;
        }
        return responseData;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Update lab request error: $e');
      rethrow;
    }
  }

  /// Delete a lab request
  static Future<void> deleteLabRequest(String id) async {
    try {
      final dio = await _getDio();
      final response = await dio.delete('$_labRequestsEndpoint/$id');

      if (response.statusCode != 200) {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Delete lab request error: $e');
      rethrow;
    }
  }

  // ===================
  // Notifications Methods
  // ===================

  static const String _notificationsEndpoint = '/api/v1/notifications';

  /// Get notifications for current user
  static Future<List<dynamic>> getNotifications({
    bool? isRead,
    bool? isArchived,
    String? type,
    String? priority,
    int? limit,
    int? offset,
  }) async {
    try {
      final dio = await _getDio();
      final queryParams = <String, dynamic>{};
      if (isRead != null) queryParams['isRead'] = isRead;
      if (isArchived != null) queryParams['isArchived'] = isArchived;
      if (type != null && type.isNotEmpty) queryParams['type'] = type;
      if (priority != null && priority.isNotEmpty) {
        queryParams['priority'] = priority;
      }
      if (limit != null) queryParams['limit'] = limit;
      if (offset != null) queryParams['offset'] = offset;

      final response = await dio.get(
        _notificationsEndpoint,
        queryParameters: queryParams,
      );

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        if (responseData['success'] == true && responseData['data'] != null) {
          // Backend returns {success: true, data: [...]} where data is a List
          final data = responseData['data'];
          if (data is List) {
            return data;
          }
          return [];
        }
        return [];
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Get notifications error: $e');
      rethrow;
    }
  }

  /// Mark notification as read
  static Future<Map<String, dynamic>> markNotificationRead(
    String notificationId,
  ) async {
    try {
      final dio = await _getDio();
      final response = await dio.patch(
        '$_notificationsEndpoint/$notificationId/read',
      );

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        if (responseData['success'] == true && responseData['data'] != null) {
          return responseData['data'] as Map<String, dynamic>;
        }
        return responseData;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Mark notification read error: $e');
      rethrow;
    }
  }

  /// Mark all notifications as read
  static Future<bool> markAllNotificationsRead() async {
    try {
      final dio = await _getDio();
      final response = await dio.patch('$_notificationsEndpoint/mark-all-read');

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        return responseData['success'] == true;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Mark all notifications read error: $e');
      rethrow;
    }
  }

  /// Get unread notifications count
  static Future<int> getUnreadNotificationsCount() async {
    try {
      final dio = await _getDio();
      final response = await dio.get('$_notificationsEndpoint/unread-count');

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        if (responseData['success'] == true && responseData['data'] != null) {
          final data = responseData['data'] as Map<String, dynamic>;
          return data['count'] as int? ?? 0;
        }
        return 0;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      debugPrint('Get unread notifications count error: $e');
      rethrow;
    }
  }
}
