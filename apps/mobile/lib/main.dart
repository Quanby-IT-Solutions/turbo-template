import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/theme/theme_provider.dart';
import 'package:mobile/core/utils/app_router.dart';
import 'package:flutter_native_splash/flutter_native_splash.dart';
import 'package:mobile/core/services/onboarding_service.dart';
import 'package:mobile/core/services/notification_service.dart';
import 'package:mobile/core/controllers/notification_controller.dart';
import 'package:responsive_framework/responsive_framework.dart';
import 'package:mobile/core/widgets/animated_loading_indicator.dart';
import 'package:toastification/toastification.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:mobile/presentation/auth/providers/auth_providers.dart';
import 'package:mobile/domain/entities/user.dart';

void main() async {
  WidgetsBinding widgetsBinding = WidgetsFlutterBinding.ensureInitialized();
  FlutterNativeSplash.preserve(widgetsBinding: widgetsBinding);

  // Load environment variables
  await dotenv.load(fileName: ".env");

  // Initialize notifications
  await NotificationService.initialize();

  runApp(const ProviderScope(child: TeleMedApp()));
}

class TeleMedApp extends ConsumerStatefulWidget {
  const TeleMedApp({super.key});

  @override
  ConsumerState<TeleMedApp> createState() => _TeleMedAppState();
}

class _TeleMedAppState extends ConsumerState<TeleMedApp> {
  bool _showLoadingScreen = true;

  @override
  void initState() {
    super.initState();
    _initializeApp();
  }

  Future<void> _initializeApp() async {
    try {
      // Initialize notification listeners up front
      await NotificationController.initializeListeners();

      // Check for initial notification action (app opened from notification)
      final initialAction =
          await NotificationController.getInitialNotificationAction();
      if (initialAction != null) {
        debugPrint('App opened from notification: ${initialAction.toMap()}');
      }

      // Transition from native splash to branded loading state
      FlutterNativeSplash.remove();

      // Fetch onboarding + session state in parallel
      final onboardingFuture = OnboardingService.hasCompletedOnboarding();

      // Reuse any cached value before awaiting the future to avoid duplicate work
      final authAsync = ref.read(authProvider);
      final cachedUser = authAsync.asData?.value;
      final userFuture = cachedUser != null
          ? Future<User?>.value(cachedUser)
          : ref.read(authProvider.future);

      final hasCompletedOnboarding = await onboardingFuture;
      final user = await userFuture;

      if (!mounted) {
        return;
      }

      String targetRoute;
      if (!hasCompletedOnboarding) {
        targetRoute = '/onboarding';
      } else if (user != null) {
        targetRoute = user.isDoctor ? '/doctor-home' : '/patient-home';
      } else {
        targetRoute = '/login';
      }

      appRouter.go(targetRoute);
    } catch (error, stackTrace) {
      debugPrint('App initialization error: $error');
      debugPrint(stackTrace.toString());
      FlutterNativeSplash.remove();
      if (!mounted) return;
      setState(() {
        _showLoadingScreen = false;
      });
      return;
    }

    if (mounted) {
      setState(() {
        _showLoadingScreen = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeMode = ref.watch(themeProvider);

    return ToastificationWrapper(
      child: ToastificationConfigProvider(
        config: ToastificationConfig(
          alignment: Alignment.topRight,
          animationDuration: const Duration(milliseconds: 400),
          itemWidth: 440,
          marginBuilder: (context, alignment) {
            return const EdgeInsets.symmetric(horizontal: 12, vertical: 8);
          },
        ),
        child: MaterialApp.router(
          title: 'TeleMed',
          theme: AppTheme.light,
          darkTheme: AppTheme.dark,
          themeMode: themeMode,
          routerConfig: appRouter,
          debugShowCheckedModeBanner: false,
          builder: (context, child) {
            Widget content = ResponsiveBreakpoints.builder(
              child: child!,
              breakpoints: [
                const Breakpoint(start: 0, end: 450, name: MOBILE),
                const Breakpoint(start: 451, end: 800, name: TABLET),
                const Breakpoint(start: 801, end: 1920, name: DESKTOP),
              ],
            );

            // Show animated loading screen between native splash and app navigation
            if (_showLoadingScreen) {
              content = _buildLoadingScreen(context);
            }

            return content;
          },
        ),
      ),
    );
  }

  Widget _buildLoadingScreen(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0170B0), // Match native splash color
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Logo
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(30),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.15),
                    spreadRadius: 5,
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Image.asset(
                  'assets/images/logo.png',
                  fit: BoxFit.contain,
                ),
              ),
            ),
            const SizedBox(height: 30),
            // Title
            const Text(
              'Q-Health',
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: Colors.white,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 10),
            // Subtitle
            const Text(
              'Initializing your health companion...',
              style: TextStyle(fontSize: 16, color: Colors.white70),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 50),
            // Loading indicator
            const AnimatedLoadingIndicator(
              type: LoadingAnimationType.pulse,
              size: 50,
            ),
          ],
        ),
      ),
    );
  }
}
