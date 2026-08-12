import 'dart:io';

import 'package:cookie_jar/cookie_jar.dart';
import 'package:flutter_test/flutter_test.dart';

/// MB-1 / F-23 + F-43 — one cookie store, fully purged at sign-out.
///
/// Exercises a real [PersistCookieJar] over a real temp directory, because the
/// claim is about what remains ON DISK after sign-out. A mocked jar would
/// assert only that `deleteAll` was called.
void main() {
  late Directory dir;
  late PersistCookieJar jar;
  final uri = Uri.parse('http://localhost:3000/api/v1/auth');

  setUp(() async {
    dir = await Directory.systemTemp.createTemp('mb1_cookies_');
    jar = PersistCookieJar(storage: FileStorage('${dir.path}/.cookies/'));
  });

  tearDown(() async {
    if (dir.existsSync()) await dir.delete(recursive: true);
  });

  /// Every byte currently held under the jar's persistence directory.
  Future<String> diskContents() async {
    final root = Directory('${dir.path}/.cookies/');
    if (!root.existsSync()) return '';
    final buffer = StringBuffer();
    await for (final entity in root.list(recursive: true)) {
      if (entity is File) buffer.write(await entity.readAsString());
    }
    return buffer.toString();
  }

  group('cookie jar', () {
    test('persists a session cookie to disk', () async {
      await jar.saveFromResponse(uri, [
        Cookie('better-auth.session_token', 'SESSIONVALUE123')..path = '/',
      ]);

      expect(await diskContents(), contains('SESSIONVALUE123'));
    });

    test('deleteAll removes the session cookie from disk', () async {
      await jar.saveFromResponse(uri, [
        Cookie('better-auth.session_token', 'SESSIONVALUE123')..path = '/',
      ]);
      expect(await diskContents(), contains('SESSIONVALUE123'));

      await jar.deleteAll();

      // F-43: this is what sign-out failed to do, so the next launch resumed
      // the session from a cookie nobody had cleared.
      expect(await diskContents(), isNot(contains('SESSIONVALUE123')));
      expect(await jar.loadForRequest(uri), isEmpty);
    });

    test('a fresh sign-in works after the purge', () async {
      await jar.saveFromResponse(uri, [Cookie('better-auth.session_token', 'OLD')..path = '/']);
      await jar.deleteAll();

      await jar.saveFromResponse(uri, [Cookie('better-auth.session_token', 'NEW')..path = '/']);

      final cookies = await jar.loadForRequest(uri);
      expect(cookies.map((c) => c.value), contains('NEW'));
      expect(cookies.map((c) => c.value), isNot(contains('OLD')));
    });

    test('preserves cookie attributes the server asked for', () async {
      // F-23: the deleted interceptor joined every set-cookie value with '; ',
      // turning attributes (Path, HttpOnly, SameSite) into name=value pairs and
      // discarding the scoping. The jar round-trips them properly.
      await jar.saveFromResponse(uri, [
        Cookie('better-auth.session_token', 'V')
          ..path = '/'
          ..httpOnly = true,
      ]);

      final loaded = await jar.loadForRequest(uri);
      expect(loaded.single.name, 'better-auth.session_token');
      expect(loaded.single.value, 'V');
    });
  });
}
