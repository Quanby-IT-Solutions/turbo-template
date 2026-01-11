import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/presentation/auth/providers/auth_providers.dart';

class HomeGateScreen extends ConsumerWidget {
  const HomeGateScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    return authState.when(
      data: (user) {
        if (user == null) {
          _scheduleNavigation(context, '/login');
        } else {
          final nextRoute = user.isDoctor ? '/doctor-home' : '/patient-home';
          _scheduleNavigation(context, nextRoute);
        }

        return const _HomeGateLoading();
      },
      loading: () => const _HomeGateLoading(),
      error: (_, __) {
        _scheduleNavigation(context, '/login');
        return const _HomeGateLoading();
      },
    );
  }

  void _scheduleNavigation(BuildContext context, String route) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!context.mounted) {
        return;
      }

      final currentLocation = GoRouterState.of(context).uri.toString();
      if (currentLocation == route) {
        return;
      }

      GoRouter.of(context).go(route);
    });
  }
}

class _HomeGateLoading extends StatelessWidget {
  const _HomeGateLoading();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}
