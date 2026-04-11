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
        ),
        _buildPage(
          theme: theme,
          icon: CupertinoIcons.checkmark_seal_fill,
          gradientColors: [colorScheme.tertiary, colorScheme.secondary],
          title: 'Stay Organized',
          body:
              'Create, track, and complete todos across\n'
              'all your devices — seamlessly synced.',
        ),
        _buildPage(
          theme: theme,
          icon: CupertinoIcons.person_2_fill,
          gradientColors: [colorScheme.secondary, colorScheme.primary],
          title: 'Secure & Personal',
          body:
              'Sign in to keep your data safe and access\n'
              'it anywhere, anytime.',
        ),
      ],
      showSkipButton: true,
      skip: Text(
        'Skip',
        style: TextStyle(
          color: colorScheme.onSurface.withOpacity(0.6),
          fontWeight: FontWeight.w500,
          letterSpacing: 0.5,
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
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: colorScheme.primary,
          borderRadius: BorderRadius.circular(20),
        ),
        child: const Text(
          'Start',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.5,
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
        activeSize: const Size(24.0, 8.0),
        activeColor: colorScheme.primary,
        color: colorScheme.outlineVariant.withOpacity(0.5),
        activeShape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
        ),
        spacing: const EdgeInsets.symmetric(horizontal: 4),
      ),
      isProgressTap: false,
      curve: Curves.easeOutCubic,
      scrollPhysics: const BouncingScrollPhysics(),
      controlsPadding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
    );
  }

  PageViewModel _buildPage({
    required ThemeData theme,
    required IconData icon,
    required List<Color> gradientColors,
    required String title,
    required String body,
  }) {
    return PageViewModel(
      titleWidget: Padding(
        padding: const EdgeInsets.only(top: 48), // Generous spacing
        child: Text(
          title,
          textAlign: TextAlign.center,
          style: theme.textTheme.headlineLarge!.copyWith(
            fontWeight: FontWeight.w600, // Semibold Apple style
            color: theme.colorScheme.onSurface.withOpacity(0.9),
            letterSpacing: -0.5,
            height: 1.1,
          ),
        ),
      ),
      bodyWidget: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        child: Text(
          body,
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyLarge!.copyWith(
            color: theme.colorScheme.onSurface.withOpacity(0.6),
            height: 1.47,
          ),
        ),
      ),
      image: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 64),
            Container(
              width: 180,
              height: 180,
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHigh.withOpacity(0.5),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primaryContainer,
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primary,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        icon,
                        size: 32,
                        color: theme.colorScheme.onPrimary,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
      decoration: PageDecoration(
        imagePadding: EdgeInsets.zero,
        bodyPadding: const EdgeInsets.symmetric(horizontal: 8),
        titlePadding: const EdgeInsets.only(bottom: 0),
        bodyAlignment: Alignment.center,
        imageAlignment: Alignment.center,
      ),
    );
  }
}
