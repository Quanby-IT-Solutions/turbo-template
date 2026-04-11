import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:introduction_screen/introduction_screen.dart';
import 'package:mobile/features/onboarding/presentation/providers/onboarding_provider.dart';

class OnboardingScreen extends ConsumerWidget {
  const OnboardingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return IntroductionScreen(
      globalBackgroundColor: theme.scaffoldBackgroundColor,
      pages: [
        PageViewModel(
          title: 'Welcome',
          body:
              'Manage your tasks and stay productive with Turbo Template.',
          image: Center(
            child: Icon(
              CupertinoIcons.rocket_fill,
              size: 120,
              color: theme.colorScheme.primary,
            ),
          ),
          decoration: _pageDecoration(theme),
        ),
        PageViewModel(
          title: 'Stay Organized',
          body:
              'Create, track, and complete todos across all your devices seamlessly.',
          image: Center(
            child: Icon(
              CupertinoIcons.checkmark_seal_fill,
              size: 120,
              color: theme.colorScheme.primary,
            ),
          ),
          decoration: _pageDecoration(theme),
        ),
        PageViewModel(
          title: 'Get Started',
          body:
              'Sign in to sync your data or explore the app right away.',
          image: Center(
            child: Icon(
              CupertinoIcons.lock_open_fill,
              size: 120,
              color: theme.colorScheme.primary,
            ),
          ),
          decoration: _pageDecoration(theme),
        ),
      ],
      showSkipButton: true,
      skip: const Text('Skip'),
      next: const Icon(CupertinoIcons.arrow_right),
      done: const Text(
        'Get Started',
        style: TextStyle(fontWeight: FontWeight.w600),
      ),
      onDone: () {
        ref.read(onboardingStateProvider.notifier).completeOnboarding();
      },
      onSkip: () {
        ref.read(onboardingStateProvider.notifier).completeOnboarding();
      },
      dotsDecorator: DotsDecorator(
        size: const Size.square(10.0),
        activeSize: const Size(22.0, 10.0),
        activeColor: theme.colorScheme.primary,
        color: theme.colorScheme.outline,
        activeShape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
        ),
      ),
    );
  }

  PageDecoration _pageDecoration(ThemeData theme) {
    return PageDecoration(
      titleTextStyle: theme.textTheme.headlineMedium!.copyWith(
        fontWeight: FontWeight.bold,
        color: theme.colorScheme.onSurface,
      ),
      bodyTextStyle: theme.textTheme.bodyLarge!.copyWith(
        color: theme.colorScheme.onSurfaceVariant,
      ),
      imagePadding: const EdgeInsets.only(top: 80),
      bodyPadding: const EdgeInsets.symmetric(horizontal: 16),
    );
  }
}
