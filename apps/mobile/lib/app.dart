import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:toastification/toastification.dart';
import 'package:mobile/core/navigation/app_router.dart';
import 'package:mobile/core/theme/theme_provider.dart';

/// Root widget for the application.
///
/// Wrapped with [ToastificationWrapper] so toasts can show globally.
/// Uses [GoRouter] for declarative routing with redirect logic based on
/// onboarding completion and authentication state.
class App extends ConsumerWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(themeModeProvider);
    final light = ref.watch(lightThemeProvider);
    final dark = ref.watch(darkThemeProvider);
    final router = ref.watch(appRouterProvider);

    return ToastificationWrapper(
      child: MaterialApp.router(
        title: 'Turbo Template',
        debugShowCheckedModeBanner: false,
        themeMode: mode,
        theme: light,
        darkTheme: dark,
        routerConfig: router,
      ),
    );
  }
}
