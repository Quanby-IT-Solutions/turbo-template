import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/constants/api_constants.dart';
import 'package:mobile/features/auth/data/auth_repository.dart';
import 'package:mobile/services/storage/secure_storage_service.dart';

/// `AuthRepository.deleteAccount`: what it sends, how it reads a refusal, and
/// what it leaves on the device afterwards.
///
/// The device half is the part worth a real cookie jar on a real temp
/// directory, for the same reason `cookie_jar_purge_test.dart` uses one: the
/// claim is about bytes on disk, and the dangerous mistake is purging them
/// when the delete was *refused* — that signs a user out of an account that
/// still exists and still holds their data.

/// Returns a canned response for every request, and records what it was asked.
class _FakeAdapter implements HttpClientAdapter {
  _FakeAdapter({required this.statusCode, this.body});

  final int statusCode;
  final Object? body;

  RequestOptions? lastRequest;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    lastRequest = options;
    return ResponseBody.fromString(
      body == null ? '' : jsonEncode(body),
      statusCode,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

/// Throws a transport-level [DioException] — no response, as when the host is
/// unreachable.
class _UnreachableAdapter implements HttpClientAdapter {
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    throw DioException.connectionError(
      requestOptions: options,
      reason: 'host unreachable',
    );
  }

  @override
  void close({bool force = false}) {}
}

/// Records the clears without touching the platform keychain. Constructing
/// `FlutterSecureStorage` is channel-free; only its method calls are not, and
/// every one this test reaches is overridden.
class _FakeSecureStorage extends SecureStorageService {
  int deleteSessionTokenCalls = 0;
  int deleteCookieCalls = 0;

  @override
  Future<void> deleteSessionToken() async => deleteSessionTokenCalls++;

  @override
  Future<void> deleteCookie() async => deleteCookieCalls++;
}

void main() {
  late Directory dir;
  late PersistCookieJar jar;
  late _FakeSecureStorage storage;

  final authUri = Uri.parse(ApiConstants.deleteAccount);

  setUp(() async {
    dir = await Directory.systemTemp.createTemp('delete_account_');
    jar = PersistCookieJar(storage: FileStorage('${dir.path}/.cookies/'));
    storage = _FakeSecureStorage();
    await jar.saveFromResponse(authUri, [
      Cookie('better-auth.session_token', 'SESSIONVALUE123')..path = '/',
    ]);
  });

  tearDown(() async {
    if (dir.existsSync()) await dir.delete(recursive: true);
  });

  Future<String> cookiesOnDisk() async {
    final root = Directory('${dir.path}/.cookies/');
    if (!root.existsSync()) return '';
    final buffer = StringBuffer();
    await for (final entity in root.list(recursive: true)) {
      if (entity is File) buffer.write(await entity.readAsString());
    }
    return buffer.toString();
  }

  ({AuthRepository repository, _FakeAdapter adapter}) repositoryReturning({
    required int statusCode,
    Object? body,
  }) {
    final adapter = _FakeAdapter(statusCode: statusCode, body: body);
    final dio = Dio()..httpClientAdapter = adapter;
    return (repository: AuthRepository(dio, storage, jar), adapter: adapter);
  }

  group('a successful delete', () {
    test('posts the password to the delete-user endpoint', () async {
      final fixture = repositoryReturning(
        statusCode: 200,
        body: {'success': true, 'message': 'User deleted'},
      );

      await fixture.repository.deleteAccount(password: 'correct-horse');

      final request = fixture.adapter.lastRequest!;
      expect(request.method, 'POST');
      expect(request.path, contains('/auth/delete-user'));
      expect(request.data, {'password': 'correct-horse'});
    });

    test('purges the session cookie from disk and clears secure storage', () async {
      final fixture = repositoryReturning(
        statusCode: 200,
        body: {'success': true, 'message': 'User deleted'},
      );
      expect(await cookiesOnDisk(), contains('SESSIONVALUE123'));

      await fixture.repository.deleteAccount(password: 'correct-horse');

      expect(await cookiesOnDisk(), isNot(contains('SESSIONVALUE123')));
      expect(storage.deleteSessionTokenCalls, 1);
      expect(storage.deleteCookieCalls, 1);
    });
  });

  group('a refused delete leaves the device signed in', () {
    test('keeps the session cookie on disk', () async {
      final fixture = repositoryReturning(
        statusCode: 400,
        body: {'code': 'INVALID_PASSWORD', 'message': 'Invalid password'},
      );

      await expectLater(
        fixture.repository.deleteAccount(password: 'wrong'),
        throwsA(isA<DeleteAccountException>()),
      );

      // The whole reason the purge is not in a `finally`: the account still
      // exists, so the credentials for it must survive a mistyped password.
      expect(await cookiesOnDisk(), contains('SESSIONVALUE123'));
      expect(storage.deleteSessionTokenCalls, 0);
      expect(storage.deleteCookieCalls, 0);
    });

    test('keeps the session cookie when the host is unreachable', () async {
      final dio = Dio()..httpClientAdapter = _UnreachableAdapter();
      final repository = AuthRepository(dio, storage, jar);

      await expectLater(
        repository.deleteAccount(password: 'correct-horse'),
        throwsA(isA<DeleteAccountException>()),
      );

      expect(await cookiesOnDisk(), contains('SESSIONVALUE123'));
      expect(storage.deleteSessionTokenCalls, 0);
    });
  });

  group('refusals are classified so the dialog can explain them', () {
    Future<DeleteAccountFailure> failureFor({
      required int statusCode,
      Object? body,
    }) async {
      final fixture = repositoryReturning(statusCode: statusCode, body: body);
      try {
        await fixture.repository.deleteAccount(password: 'whatever');
      } on DeleteAccountException catch (error) {
        return error.failure;
      }
      fail('expected a DeleteAccountException');
    }

    test('a wrong password is retryable in place', () async {
      expect(
        await failureFor(statusCode: 400, body: {'code': 'INVALID_PASSWORD'}),
        DeleteAccountFailure.invalidPassword,
      );
    });

    test('a Google-only account reports that it has no password', () async {
      expect(
        await failureFor(
          statusCode: 400,
          body: {'code': 'CREDENTIAL_ACCOUNT_NOT_FOUND'},
        ),
        DeleteAccountFailure.noPasswordSet,
      );
    });

    test('a stale session asks for re-authentication', () async {
      expect(
        await failureFor(statusCode: 400, body: {'code': 'SESSION_EXPIRED'}),
        DeleteAccountFailure.reauthenticationRequired,
      );
    });

    test('a 404 means the server never enabled deletion', () async {
      // Better Auth 404s /delete-user unless user.deleteUser.enabled is set.
      // Distinct from a user error: nothing the user types can fix it.
      expect(
        await failureFor(statusCode: 404),
        DeleteAccountFailure.notEnabled,
      );
    });

    test('an unrecognised code falls back to unknown', () async {
      expect(
        await failureFor(statusCode: 400, body: {'code': 'SOMETHING_NEW'}),
        DeleteAccountFailure.unknown,
      );
    });

    test('a refusal with no body at all falls back to unknown', () async {
      expect(
        await failureFor(statusCode: 500),
        DeleteAccountFailure.unknown,
      );
    });
  });
}
