import 'package:awesome_notifications/awesome_notifications.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/app.dart';
import 'package:mobile/core/constants/redacted_fields.dart';
import 'package:mobile/core/constants/sentry_constants.dart';
import 'package:mobile/services/api/api_client.dart';
import 'package:mobile/services/notifications/notification_service.dart';
import 'package:mobile/services/storage/secure_storage_service.dart';
import 'package:mobile/services/storage/theme_storage_service.dart';
import 'package:sentry_flutter/sentry_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load environment variables
  // MB-2 / F-42: no `.env` is loaded. It used to be bundled as a Flutter
  // asset, which ships it inside the APK in cleartext where unzipping the
  // package reveals it. Configuration now arrives via --dart-define; see
  // ApiConstants.

  // Error monitoring is opt-in at build time. When the defines are absent
  // (SentryConstants.isEnabled == false) the startup path below is the exact
  // one that existed before Sentry was added: no SDK init, no integrations,
  // no network calls. When enabled, the very same [_bootstrap] runs as
  // `SentryFlutter.init`'s appRunner, so the startup order is identical in
  // both branches — only the surrounding zone differs.
  if (!SentryConstants.isEnabled) {
    await _bootstrap();
    return;
  }

  await SentryFlutter.init(
    (options) {
      options.dsn = SentryConstants.dsn;
      options.environment = SentryConstants.environment;
      options.release = SentryConstants.release;

      // Errors only by default. Performance tracing costs event quota and
      // adds request-shaped spans we have no use for yet.
      options.tracesSampleRate = 0.0;

      // Release health / crash-free rate. Sends a session ping, not user data.
      options.enableAutoSessionTracking = true;

      // Hard requirement: never send personally identifying information.
      // This also keeps the SDK from attaching the device's IP address.
      options.sendDefaultPii = false;

      // Deliberately off: a screenshot of the moment of a crash can capture
      // whatever the user had on screen — a session, an email, a form field.
      options.attachScreenshot = false;

      // Deliberately off for the same reason: the view hierarchy carries the
      // text of every rendered widget. Set explicitly rather than left to the
      // SDK default so the decision survives a dependency bump — the ignore is
      // only for the option being marked experimental upstream.
      // ignore: experimental_member_use
      options.attachViewHierarchy = false;

      // Native breadcrumbs (app lifecycle, system events) stay at the SDK
      // default of on: they are timing and state signals, carry no payload,
      // and are what makes a crash reconstructable.
      //
      // HTTP breadcrumbs are a different matter and are deliberately NOT
      // wired: `sentry_dio` is not a dependency and no SentryDioInterceptor
      // is added in api_client.dart, so no request URL, header, or body ever
      // becomes a breadcrumb.

      // Defence in depth. Nothing below should ever have anything to strip,
      // given the options above — which is exactly why it is cheap to run.
      options.beforeSend = _scrubEvent;
    },
    appRunner: _bootstrap,
  );
}

/// The app's real startup sequence.
///
/// Extracted verbatim from [main] so it can be invoked either directly or as
/// `SentryFlutter.init`'s `appRunner`. The order here matters: notification
/// channels must be registered before `runApp`, and the notification action
/// listeners must be attached after it so navigation works from a tap.
Future<void> _bootstrap() async {
  // Initialize awesome_notifications before runApp so channels are registered.
  await NotificationService.instance.initialize();

  // Initialize services in parallel for faster startup
  final results = await Future.wait([
    SharedPreferences.getInstance(),
    Future.value(SecureStorageService()),
  ]);

  final sharedPreferences = results[0] as SharedPreferences;
  final storage = results[1] as SecureStorageService;
  final apiClient = await createApiClient(storage);

  runApp(
    ProviderScope(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(sharedPreferences),
        secureStorageProvider.overrideWithValue(storage),
        dioProvider.overrideWithValue(apiClient.dio),
        // MB-1: sign-out purges the very jar the client writes to.
        cookieJarProvider.overrideWithValue(apiClient.cookieJar),
      ],
      child: const App(),
    ),
  );

  // Set up notification action listeners after runApp so navigation and
  // UI updates work correctly when the user taps a notification.
  await NotificationService.instance.setListeners(
    onAction: _handleNotificationAction,
  );
}

/// Strips anything the backend logger would redact before an event leaves
/// the device.
///
/// The field list is [kRedactedFieldNames], the Dart mirror of the shared
/// `@repo/observability` manifest, so "what the logger strips" and "what
/// Sentry strips" cannot drift apart — a parity test fails if they do.
SentryEvent? _scrubEvent(SentryEvent event, Hint hint) {
  // Identity is set to a user id and nothing else (see AuthState.signIn),
  // but re-assert it here so no other code path can widen it.
  final user = event.user;
  if (user != null) {
    user.email = null;
    user.username = null;
    user.ipAddress = null;
  }

  // No request is ever attached — no Dio integration is installed — so this
  // only fires if something starts attaching one later.
  final request = event.request;
  if (request != null) {
    event.request = SentryRequest(
      url: request.url,
      method: request.method,
      // cookies, headers, query string, and body are dropped wholesale
      // rather than filtered: the redaction list is a floor, not a ceiling.
    );
  }

  final breadcrumbs = event.breadcrumbs;
  if (breadcrumbs != null) {
    for (final breadcrumb in breadcrumbs) {
      breadcrumb.data?.removeWhere((key, _) => _isRedactedField(key));
    }
  }

  return event;
}

/// Case-insensitive match against the shared redaction list. Header names
/// arrive in mixed case (`Set-Cookie`, `Authorization`) while the manifest
/// spells them lowercase.
bool _isRedactedField(String key) {
  final lowered = key.toLowerCase();
  return kRedactedFieldNames.any(
    (String field) => field.toLowerCase() == lowered,
  );
}

/// Global handler for notification tap and action button events.
///
/// This runs on the main isolate after [runApp], so it has access to the
/// navigator and can route the user to the appropriate screen. Extend this
/// function to add routing logic based on the payload.
@pragma('vm:entry-point')
Future<void> _handleNotificationAction(ReceivedAction receivedAction) async {
  final payload = receivedAction.payload;
  if (payload == null) return;

  final screen = payload['screen'];
  debugPrint(
    'Notification action received: '
    'buttonKey=${receivedAction.buttonKeyPressed}, '
    'screen=$screen',
  );

  // TODO: Add navigation logic here once a global navigator key is available.
  // Example:
  // if (screen == 'todos') {
  //   navigatorKey.currentState?.pushNamed('/todos');
  // }
}
