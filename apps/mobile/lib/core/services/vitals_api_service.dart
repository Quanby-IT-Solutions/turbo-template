import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class VitalsApiService {
  final String _baseUrl;

  VitalsApiService({String? baseUrl}) : _baseUrl = _resolveBaseUrl(baseUrl);

  static String _resolveBaseUrl(String? override) {
    if (override != null && override.isNotEmpty) {
      return override;
    }

    final envUrl = dotenv.env['BACKEND_API_URL'];
    if (envUrl != null && envUrl.isNotEmpty) {
      return envUrl;
    }

    const fallback = 'http://localhost:3000';
    if (kDebugMode) {
      debugPrint(
        'BACKEND_API_URL not configured in .env. Falling back to $fallback',
      );
    }
    return fallback;
  }

  String get baseUrl => _baseUrl;

  /// Get the latest vitals for a patient
  Future<Map<String, dynamic>> getLatestVitals(String patientId) async {
    final response = await http.get(
      Uri.parse('$_baseUrl/api/v1/self-check/latest/$patientId'),
      headers: {'Content-Type': 'application/json'},
    );

    if (response.statusCode == 200) {
      final jsonResponse = json.decode(response.body);
      print('🔍 Raw response: $jsonResponse'); // Debug log

      // Backend wraps response in {success: true, data: {...}}
      // Extract the actual data
      if (jsonResponse is Map<String, dynamic> &&
          jsonResponse['success'] == true &&
          jsonResponse['data'] != null) {
        final data = jsonResponse['data'] as Map<String, dynamic>;
        print('🔍 Extracted data: $data'); // Debug log

        // Check if data contains 'reading' field (from gRPC response)
        if (data['reading'] != null) {
          final reading = data['reading'] as Map<String, dynamic>;
          print('🔍 Reading: $reading'); // Debug log
          return reading;
        }
        return data;
      }
      return jsonResponse;
    } else {
      throw Exception('Failed to load vitals: ${response.statusCode}');
    }
  }

  /// Stream vitals for a patient using Server-Sent Events (SSE)
  Stream<Map<String, dynamic>> streamVitals(String patientId) async* {
    final url = Uri.parse('$_baseUrl/api/v1/self-check/stream/$patientId');
    final request = http.Request('GET', url);
    request.headers['Accept'] = 'text/event-stream';
    request.headers['Cache-Control'] = 'no-cache';

    final client = http.Client();
    try {
      final response = await client.send(request);

      if (response.statusCode != 200) {
        throw Exception(
          'Failed to connect to vitals stream: ${response.statusCode}',
        );
      }

      await for (final chunk in response.stream.transform(utf8.decoder)) {
        // Parse Server-Sent Events format
        final lines = chunk.split('\n');
        for (final line in lines) {
          if (line.startsWith('data:')) {
            final jsonStr = line.substring(5).trim();
            if (jsonStr.isNotEmpty) {
              try {
                final parsedData = json.decode(jsonStr);
                // Backend wraps SSE data: {success: true, data: {data: <vitals>}}
                // We need to unwrap it twice
                if (parsedData is Map<String, dynamic>) {
                  var vitalsData = parsedData['data'] ?? parsedData;
                  // Check if there's another nested 'data' key
                  if (vitalsData is Map<String, dynamic> &&
                      vitalsData['data'] != null) {
                    vitalsData = vitalsData['data'];
                  }
                  yield vitalsData as Map<String, dynamic>;
                } else {
                  yield parsedData as Map<String, dynamic>;
                }
              } catch (e) {
                print('Error parsing SSE data: $e');
                print('Raw data: $jsonStr');
              }
            }
          }
        }
      }
    } finally {
      client.close();
    }
  }

  /// Record new vitals
  Future<Map<String, dynamic>> recordVitals(
    Map<String, dynamic> vitalsData,
  ) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/api/v1/self-check'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(vitalsData),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      final jsonResponse = json.decode(response.body);
      // Backend wraps response in {success: true, data: {...}}
      if (jsonResponse is Map<String, dynamic> &&
          jsonResponse['success'] == true &&
          jsonResponse['data'] != null) {
        return jsonResponse['data'] as Map<String, dynamic>;
      }
      return jsonResponse;
    } else {
      throw Exception('Failed to record vitals: ${response.statusCode}');
    }
  }

  /// Get vitals history for a patient
  Future<List<Map<String, dynamic>>> getVitalsHistory(
    String patientId, {
    int limit = 10,
  }) async {
    final response = await http.get(
      Uri.parse('$_baseUrl/api/v1/self-check/history/$patientId?limit=$limit'),
      headers: {'Content-Type': 'application/json'},
    );

    if (response.statusCode == 200) {
      final jsonResponse = json.decode(response.body);
      // Backend wraps response in {success: true, data: [...]}
      dynamic data;
      if (jsonResponse is Map<String, dynamic> &&
          jsonResponse['success'] == true &&
          jsonResponse['data'] != null) {
        data = jsonResponse['data'];
      } else {
        data = jsonResponse;
      }

      if (data is List) {
        return data.cast<Map<String, dynamic>>();
      }
      return [];
    } else {
      throw Exception('Failed to load vitals history: ${response.statusCode}');
    }
  }

  /// Delete vitals by ID
  Future<void> deleteVitals(String vitalId) async {
    final response = await http.delete(
      Uri.parse('$_baseUrl/api/v1/self-check/$vitalId'),
      headers: {'Content-Type': 'application/json'},
    );

    if (response.statusCode != 200 && response.statusCode != 204) {
      throw Exception('Failed to delete vitals: ${response.statusCode}');
    }
  }
}
