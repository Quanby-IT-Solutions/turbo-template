import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// Guards `ios/Runner/PrivacyInfo.xcprivacy`.
///
/// Three of these failures are invisible locally and only surface as an App
/// Store Connect rejection days later, which is the whole reason they are
/// tests: a manifest that is not in the target's Resources phase, a tracking
/// declaration that contradicts itself, and a `Linked` flag that drifts away
/// from what the app actually does with identity.
void main() {
  String read(String p) => File(p).readAsStringSync();

  const manifestPath = 'ios/Runner/PrivacyInfo.xcprivacy';

  group('privacy manifest', () {
    test('is bundled into the Runner target, not just present on disk', () {
      // A manifest sitting in the repo but missing from the Resources build
      // phase never reaches the .app, so Apple's privacy report comes back
      // empty and the build is rejected for the APIs it already declares.
      // Two hits: the PBXBuildFile entry and the Resources phase entry.
      expect(File(manifestPath).existsSync(), isTrue);
      expect(
        RegExp(
          r'PrivacyInfo\.xcprivacy in Resources',
        ).allMatches(read('ios/Runner.xcodeproj/project.pbxproj')).length,
        2,
        reason:
            'PrivacyInfo.xcprivacy must appear in both PBXBuildFile and the '
            "Runner target's PBXResourcesBuildPhase",
      );
    });

    test('declares no tracking and no tracking domains', () {
      // A non-empty NSPrivacyTrackingDomains while NSPrivacyTracking is false
      // is rejected as self-contradictory. Sentry's and PostHog's ingest hosts
      // are not tracking domains: they receive the app's own diagnostics.
      final manifest = read(manifestPath);
      expect(
        manifest,
        contains(RegExp(r'<key>NSPrivacyTracking</key>\s*<false/>')),
      );
      expect(
        manifest,
        contains(RegExp(r'<key>NSPrivacyTrackingDomains</key>\s*<array/>')),
      );
    });

    test('marks every collected data type as linked to the user', () {
      // Signing in sets SentryUser(id:) and Posthog().identify(userId:), so
      // everything collected is associated with an account. Every third-party
      // manifest in the tree says Linked = false because an SDK cannot know
      // that; the app's manifest has to say true. If a row ever legitimately
      // becomes unlinked, change it here deliberately.
      final manifest = read(manifestPath);
      final linked = manifest
          .split('<key>NSPrivacyCollectedDataTypeLinked</key>')
          .skip(1)
          .map((chunk) => chunk.trimLeft());

      expect(linked, isNotEmpty);
      for (final chunk in linked) {
        expect(
          chunk,
          startsWith('<true/>'),
          reason: 'found an unlinked collected data type',
        );
      }
    });

    test('declares exactly the data types the app collects', () {
      // Derived from main.dart, analytics_service.dart, auth_provider.dart and
      // auth_repository.dart. Adding an SDK, enabling session replay, or
      // raising tracesSampleRate changes this list — and the App Store Connect
      // questionnaire along with it.
      final manifest = read(manifestPath);
      const expected = <String>{
        'NSPrivacyCollectedDataTypeEmailAddress',
        'NSPrivacyCollectedDataTypeName',
        'NSPrivacyCollectedDataTypeUserID',
        'NSPrivacyCollectedDataTypeCrashData',
        'NSPrivacyCollectedDataTypePerformanceData',
        'NSPrivacyCollectedDataTypeOtherDiagnosticData',
        'NSPrivacyCollectedDataTypeProductInteraction',
        'NSPrivacyCollectedDataTypeOtherUsageData',
      };
      final declared = RegExp(
        r'<string>(NSPrivacyCollectedDataType(?!Linked|Tracking|Purpose)[A-Za-z]+)</string>',
      ).allMatches(manifest).map((m) => m.group(1)!).toSet();

      expect(declared, expected);
    });

    test('declares UserDefaults with the app-exclusive reason', () {
      // The single most common cause of ITMS-91053. shared_preferences backs
      // the theme mode, the onboarding and tour flags, and the
      // `analytics-identified` marker. Not covered by the plugin's own
      // manifest, which declares 1C8F.1 — the App Group case.
      expect(
        read(manifestPath),
        contains(
          RegExp(
            r'<string>NSPrivacyAccessedAPICategoryUserDefaults</string>\s*'
            r'<key>NSPrivacyAccessedAPITypeReasons</key>\s*<array>\s*'
            r'<string>CA92\.1</string>',
          ),
        ),
      );
    });

    test('uses only reason codes from Apple\'s closed lists', () {
      // An unlisted code fails validation exactly as a missing declaration
      // does, and the codes are per-category rather than interchangeable.
      const allowed = <String, Set<String>>{
        'NSPrivacyAccessedAPICategoryUserDefaults': {
          'CA92.1',
          '1C8F.1',
          'C56D.1',
          'AC6B.1',
        },
        'NSPrivacyAccessedAPICategoryFileTimestamp': {
          'DDA9.1',
          'C617.1',
          '3B52.1',
          '0A2A.1',
        },
        'NSPrivacyAccessedAPICategorySystemBootTime': {
          '35F9.1',
          '8FFB.1',
          '3D61.1',
        },
        'NSPrivacyAccessedAPICategoryDiskSpace': {
          'E174.1',
          '85F4.1',
          '7D9E.1',
          'B728.1',
        },
        'NSPrivacyAccessedAPICategoryActiveKeyboards': {'3EC4.1', '54BD.1'},
      };

      final manifest = read(manifestPath);
      final blocks = RegExp(
        r'<string>(NSPrivacyAccessedAPICategory[A-Za-z]+)</string>\s*'
        r'<key>NSPrivacyAccessedAPITypeReasons</key>\s*<array>(.*?)</array>',
        dotAll: true,
      ).allMatches(manifest);

      expect(blocks, isNotEmpty);
      for (final block in blocks) {
        final category = block.group(1)!;
        expect(
          allowed.keys,
          contains(category),
          reason: '$category is not a required-reason category',
        );
        final codes = RegExp(r'<string>([^<]+)</string>')
            .allMatches(block.group(2)!)
            .map((m) => m.group(1)!);
        for (final code in codes) {
          expect(
            allowed[category],
            contains(code),
            reason: '$code is not an approved reason for $category',
          );
        }
      }
    });

    test('stays in step with the privacy-relevant Sentry options', () {
      // Parity guard, the same idea as sentry_redaction_parity_test.dart.
      // Each of these options, once flipped on, starts collecting something
      // the manifest and the store questionnaire do not currently admit to:
      // screen content, or the device's IP address.
      final main = read('lib/main.dart');
      expect(
        main,
        contains('options.sendDefaultPii = false'),
        reason: 'sendDefaultPii collects the IP address — declare it first',
      );
      expect(
        main,
        contains('options.attachScreenshot = false'),
        reason: 'screenshots capture screen content — declare it first',
      );
      expect(
        main,
        contains('options.attachViewHierarchy = false'),
        reason: 'the view hierarchy carries rendered text — declare it first',
      );
      expect(
        read('lib/services/analytics/analytics_service.dart'),
        contains('..sessionReplay = false'),
        reason: 'session replay records the screen — declare it first',
      );
    });
  });
}
