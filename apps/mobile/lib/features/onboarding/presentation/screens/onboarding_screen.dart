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
    final colorScheme = theme.colorScheme;

    return IntroductionScreen(
      globalBackgroundColor: theme.scaffoldBackgroundColor,
      pages: [
        _buildPage(
          theme: theme,
          icon: CupertinoIcons.rocket_fill,
          gradientColors: [colorScheme.primary, colorScheme.tertiary],
          title: 'Welcome to Turbo',
          body:
              'Your all-in-one productivity companion.\n'
              'Manage tasks, stay organized, and get things done.',
          badge: '🚀',
        ),
        _buildPage(
          theme: theme,
          icon: CupertinoIcons.checkmark_seal_fill,
          gradientColors: [colorScheme.tertiary, colorScheme.secondary],
          title: 'Stay Organized',
          body:
              'Create, track, and complete todos across\n'
              'all your devices — seamlessly synced.',
          badge: '✓',
        ),
        _buildPage(
          theme: theme,
          icon: CupertinoIcons.person_2_fill,
          gradientColors: [colorScheme.secondary, colorScheme.primary],
          title: 'Secure & Personal',
          body:
              'Sign in to keep your data safe and access\n'
              'it anywhere, anytime.',
          badge: '🔐',
        ),
      ],
      showSkipButton: true,
      skip: Text(
        'Skip',
        style: TextStyle(
          color: colorScheme.onSurfaceVariant,
          fontWeight: FontWeight.w500,
        ),
      ),
      next: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: colorScheme.primaryContainer,
          shape: BoxShape.circle,
        ),
        child: Icon(
          CupertinoIcons.arrow_right,
          color: colorScheme.onPrimaryContainer,
          size: 20,
        ),
      ),
      done: Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [colorScheme.primary, colorScheme.tertiary],
          ),
          borderRadius: BorderRadius.circular(24),
        ),
        child: const Text(
          'Get Started',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      onDone: () {
        ref.read(onboardingStateProvider.notifier).completeOnboarding();
      },
      onSkip: () {
        ref.read(onboardingStateProvider.notifier).completeOnboarding();
      },
      dotsDecorator: DotsDecorator(
        size: const Size.square(8.0),
        activeSize: const Size(28.0, 8.0),
        activeColor: colorScheme.primary,
        color: colorScheme.outlineVariant,
        activeShape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
        ),
        spacing: const EdgeInsets.symmetric(horizontal: 4),
      ),
      isProgressTap: false,
      curve: Curves.easeInOut,
      controlsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
    );
  }

  PageViewModel _buildPage({
    required ThemeData theme,
    required IconData icon,
    required List<Color> gradientColors,
    required String title,
    required String body,
    required String badge,
  }) {
    return PageViewModel(
      titleWidget: Padding(
        padding: const EdgeInsets.only(top: 32),
        child: Text(
          title,
          textAlign: TextAlign.center,
          style: theme.textTheme.headlineMedium!.copyWith(
            fontWeight: FontWeight.w800,
            color: theme.colorScheme.onSurface,
            letterSpacing: -0.5,
          ),
        ),
      ),
      bodyWidget: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Text(
          body,
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyLarge!.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
            height: 1.6,
          ),
        ),
      ),
      image: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 60),
            Container(
              width: 180,
              height: 180,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    gradientColors[0].withValues(alpha: 0.15),
                    gradientColors[1].withValues(alpha: 0.15),
                  ],
                ),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: gradientColors,
                    ),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: gradientColors[0].withValues(alpha: 0.3),
                        blurRadius: 24,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Icon(
                    icon,
                    size: 52,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              badge,
              style: const TextStyle(fontSize: 28),
            ),
          ],
        ),
      ),
      decoration: PageDecoration(
        imagePadding: EdgeInsets.zero,
        bodyPadding: const EdgeInsets.symmetric(horizontal: 8),
        titlePadding: const EdgeInsets.only(bottom: 16),
        bodyAlignment: Alignment.center,
        imageAlignment: Alignment.center,
      ),
    );
  }
}
