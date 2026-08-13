/// Field names that must never leave the device in cleartext.
///
/// This is the Dart mirror of `fieldNames` in
/// `packages/observability/src/redaction-manifest.json`, which is the single
/// source of truth shared with the NestJS backend's Pino redaction config.
/// Dart cannot import that JSON at compile time, so the list is duplicated
/// here and `test/sentry_redaction_parity_test.dart` fails the build if the
/// two ever diverge — including on ordering, so a reviewer diffing the two
/// sees them line up.
///
/// Order and casing intentionally match the manifest exactly. Matching against
/// these is case-insensitive at the point of use (header names arrive in mixed
/// case); the constant keeps the manifest's spelling so the parity check stays
/// a literal comparison.
const List<String> kRedactedFieldNames = <String>[
  'authorization',
  'cookie',
  'set-cookie',
  'password',
  'token',
  'newPassword',
  'currentPassword',
  'email',
];
