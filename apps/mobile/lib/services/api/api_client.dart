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
///
/// MB-1 / F-23: the jar is the SINGLE cookie store. A second interceptor used
/// to copy the session cookie into secure storage and re-inject it as a header,
/// which duplicated the credential and re-serialised it badly: it joined every
/// `set-cookie` value with `'; '`, so cookie ATTRIBUTES (Path, HttpOnly,
/// SameSite, Max-Age) became name=value pairs in the request header, and the
/// scoping the server asked for was discarded. It also overwrote whatever
/// [CookieManager] had negotiated. One store, one serialiser, no duplicate on
/// disk to purge.
Future<Dio> createDio(
  SecureStorageService storage, {
  required PersistCookieJar cookieJar,
}) async {
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
  // session cookies survive between app launches. Supplied by the caller so
  // the same instance is reachable for the sign-out purge.
  dio.interceptors.add(CookieManager(cookieJar));

  return dio;
}

/// A configured [Dio] together with the cookie jar it uses.
///
/// MB-1 / F-43: the jar was previously unreachable outside [createDio], so
/// nothing could purge it and the session cookie survived sign-out on disk.
/// Returning it makes the single store addressable by the code that must
/// clear it.
class ApiClient {
  const ApiClient({required this.dio, required this.cookieJar});

  final Dio dio;
  final PersistCookieJar cookieJar;
}

/// Build the [Dio] client and hand back its jar alongside it.
Future<ApiClient> createApiClient(SecureStorageService storage) async {
  final appDocDir = await getApplicationDocumentsDirectory();
  final cookieJar = PersistCookieJar(
    storage: FileStorage('${appDocDir.path}/.cookies/'),
  );
  return ApiClient(
    dio: await createDio(storage, cookieJar: cookieJar),
    cookieJar: cookieJar,
  );
}

/// Provider for the app's single cookie jar.
///
/// Overridden in main.dart with the jar the live [Dio] is using, so sign-out
/// purges the same store the client writes to.
@Riverpod(keepAlive: true)
PersistCookieJar cookieJar(Ref ref) {
  throw UnimplementedError(
    'cookieJarProvider must be overridden in ProviderScope',
  );
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
