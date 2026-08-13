import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/constants/redacted_fields.dart';

/// Dart ↔ JSON parity for the redaction deny-list.
///
/// `packages/observability/src/redaction-manifest.json` is the single source of
/// truth shared with the NestJS backend's Pino redaction config. Dart cannot
/// import JSON at compile time, so `kRedactedFieldNames` duplicates it. This
/// guard fails the build the moment the two drift — an addition, a removal, or
/// a reordering on either side — so the duplication stays a mirror rather than
/// a fork.
///
/// The manifest is read from disk with `dart:io`, never declared as a Flutter
/// asset: it is a build-time invariant, not something the app ships.
void main() {
  // Relative to the `apps/mobile` package root, which is the directory
  // `flutter test` runs from.
  final manifest =
      File('../../packages/observability/src/redaction-manifest.json');

  late List<String> manifestFieldNames;

  setUpAll(() {
    expect(manifest.existsSync(), isTrue,
        reason: 'redaction-manifest.json moved — update this guard '
            'and lib/core/constants/redacted_fields.dart');

    final decoded = jsonDecode(manifest.readAsStringSync());
    expect(decoded, isA<Map<String, dynamic>>(),
        reason: 'the manifest must stay a JSON object');

    final fieldNames = (decoded as Map<String, dynamic>)['fieldNames'];
    expect(fieldNames, isA<List<dynamic>>(),
        reason: 'the manifest must expose a fieldNames array');

    manifestFieldNames =
        (fieldNames as List<dynamic>).map((dynamic e) => e as String).toList();
  });

  group('redaction deny-list parity', () {
    test('the Dart mirror matches the manifest exactly, ordering included', () {
      expect(kRedactedFieldNames, equals(manifestFieldNames),
          reason: 'kRedactedFieldNames drifted from redaction-manifest.json; '
              'the manifest is the source of truth');
    });

    test('neither side is empty or carries duplicates', () {
      expect(manifestFieldNames, isNotEmpty);
      expect(kRedactedFieldNames.toSet().length, kRedactedFieldNames.length,
          reason: 'a duplicated field name hides a bad merge');
    });
  });
}
