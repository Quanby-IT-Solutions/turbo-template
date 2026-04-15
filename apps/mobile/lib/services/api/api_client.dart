import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:path_provider/path_provider.dart';
import 'package:mobile/core/constants/api_constants.dart';
import 'package:mobile/services/storage/secure_storage_service.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'api_client.g.dart';

/// Creates a configured [Dio] client.
///
/// - Sets the base URL from [ApiConstants].
/// - Attaches a [PersistCookieJar] backed by the app's document directory
///   (via `path_provider`) so Better Auth session cookies survive app restarts.
/// - Attaches an interceptor that reads the session cookie from
///   [SecureStorageService] and injects it as a header when present.
Future<Dio> createDio(SecureStorageService storage) async {
  // Better Auth performs CSRF validation on POST requests by checking
  // the Origin header against its trustedOrigins list. Native mobile
  // HTTP clients don't send an Origin header by default, so we set one
  // explicitly to the backend's own address (already trusted).
  final backendOrigin = Uri.parse(ApiConstants.baseUrl).origin;

  final dio = Dio(
    BaseOptions(
      baseUrl: ApiConstants.baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': backendOrigin,
      },
    ),
  );

  // Persistent cookie jar — cookies are stored on disk so Better Auth
  // session cookies survive between app launches.
  final appDocDir = await getApplicationDocumentsDirectory();
  final cookieJar = PersistCookieJar(
    storage: FileStorage('${appDocDir.path}/.cookies/'),
  );
  dio.interceptors.add(CookieManager(cookieJar));

  // Inject persisted cookie header when available
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final cookie = await storage.getCookie();
        if (cookie != null && cookie.isNotEmpty) {
          options.headers['cookie'] = cookie;
        }
        handler.next(options);
      },
      onResponse: (response, handler) async {
        // Persist set-cookie header from the backend for subsequent requests
        final setCookie = response.headers['set-cookie'];
        if (setCookie != null && setCookie.isNotEmpty) {
          await storage.setCookie(setCookie.join('; '));
        }
        handler.next(response);
      },
    ),
  );

  return dio;
}

/// Provider for [Dio].
///
/// Overridden in main.dart with an eagerly created instance so the client
/// is available synchronously via `ref.read`.
@Riverpod(keepAlive: true)
Dio dio(Ref ref) {
  throw UnimplementedError(
    'dioProvider must be overridden in ProviderScope',
  );
}
