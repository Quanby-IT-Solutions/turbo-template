import 'package:flutter/material.dart';
import 'package:introduction_screen/introduction_screen.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/core/services/onboarding_service.dart';

class OnboardingScreen extends StatelessWidget {
  const OnboardingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final backgroundColor = Theme.of(context).scaffoldBackgroundColor;

    return IntroductionScreen(
      // List of pages for the onboarding
      pages: [
        PageViewModel(
          titleWidget: _buildAnimatedTitle(context, 'Welcome to Q-Health'),
          bodyWidget: _buildAnimatedBody(
            context,
            'Your comprehensive healthcare management platform. Manage appointments, access medical records, and connect with healthcare providers seamlessly.',
          ),
          image: _buildImage(context, 'assets/images/logo.png'),
          decoration: _getPageDecoration(context),
        ),
        PageViewModel(
          titleWidget: _buildAnimatedTitle(context, 'Smart Scheduling'),
          bodyWidget: _buildAnimatedBody(
            context,
            'Book appointments with your preferred healthcare providers at your convenience. Get real-time availability and instant confirmations.',
          ),
          image: _buildImage(context, 'assets/images/logo.png'),
          decoration: _getPageDecoration(context),
        ),
        PageViewModel(
          titleWidget: _buildAnimatedTitle(context, 'Secure Medical Records'),
          bodyWidget: _buildAnimatedBody(
            context,
            'Access your complete medical history, lab results, prescriptions, and treatment plans securely from anywhere, anytime.',
          ),
          image: _buildImage(context, 'assets/images/logo.png'),
          decoration: _getPageDecoration(context),
        ),
        PageViewModel(
          titleWidget: _buildAnimatedTitle(context, 'Telemedicine Ready'),
          bodyWidget: _buildAnimatedBody(
            context,
            'Connect with healthcare professionals through secure video calls. Get consultations without leaving your home.',
          ),
          image: _buildImage(context, 'assets/images/logo.png'),
          decoration: _getPageDecoration(context),
        ),
        PageViewModel(
          titleWidget: _buildAnimatedTitle(context, 'Clinical Tools'),
          bodyWidget: _buildAnimatedBody(
            context,
            'Access advanced clinical tools and calculators to support your healthcare decisions and treatment plans.',
          ),
          image: _buildImage(context, 'assets/images/logo.png'),
          decoration: _getPageDecoration(context),
        ),
      ],

      // Customization options
      onDone: () => _onIntroEnd(context),
      onSkip: () => _onIntroEnd(context),
      showSkipButton: true,
      skip: Text(
        'Skip',
        style: TextStyle(
          fontWeight: FontWeight.w600,
          color: colorScheme.onSurface.withValues(alpha: 0.7),
          fontSize: 16,
        ),
      ),
      next: Container(
        width: 56,
        height: 56,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              colorScheme.primary,
              colorScheme.primary.withValues(alpha: 0.85),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(28),
          boxShadow: [
            BoxShadow(
              color: colorScheme.primary.withValues(alpha: 0.3),
              spreadRadius: 1,
              blurRadius: 12,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Icon(
          Icons.arrow_forward_ios,
          color: colorScheme.onPrimary,
          size: 20,
        ),
      ),
      done: Container(
        width: 144,
        height: 56,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              colorScheme.primary,
              colorScheme.secondary,
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(28),
          boxShadow: [
            BoxShadow(
              color: colorScheme.primary.withValues(alpha: 0.4),
              spreadRadius: 2,
              blurRadius: 12,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Center(
          child: Text(
            'Get Started',
            style: TextStyle(
              color: colorScheme.onPrimary,
              fontWeight: FontWeight.w700,
              fontSize: 16,
              letterSpacing: 0.5,
            ),
          ),
        ),
      ),

      // Dots indicator customization
      dotsDecorator: DotsDecorator(
        size: const Size(12, 12),
        color: colorScheme.outlineVariant.withValues(alpha: 0.4),
        activeSize: const Size(24, 12),
        activeColor: colorScheme.primary,
        activeShape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(6),
        ),
        spacing: const EdgeInsets.symmetric(horizontal: 4),
      ),

      // Additional customization
      globalBackgroundColor: backgroundColor,
      skipOrBackFlex: 0,
      nextFlex: 0,
      showBackButton: false,
      curve: Curves.fastLinearToSlowEaseIn,
    );
  }

  Widget _buildAnimatedTitle(BuildContext context, String title) {
    final colorScheme = Theme.of(context).colorScheme;

    return Text(
      title,
      style: TextStyle(
        fontSize: 30,
        fontWeight: FontWeight.w800,
        color: colorScheme.onSurface,
        letterSpacing: -0.5,
      ),
      textAlign: TextAlign.center,
    );
  }

  Widget _buildAnimatedBody(BuildContext context, String body) {
    final colorScheme = Theme.of(context).colorScheme;

    return Text(
      body,
      style: TextStyle(
        fontSize: 16,
        color: colorScheme.onSurface.withValues(alpha: 0.75),
        height: 1.6,
        letterSpacing: 0.2,
      ),
      textAlign: TextAlign.center,
    );
  }

  Widget _buildImage(BuildContext context, String assetName) {
    final colorScheme = Theme.of(context).colorScheme;

    return Center(
      child: Container(
        width: 216,
        height: 216,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(108),
          gradient: LinearGradient(
            colors: [
              colorScheme.primary.withValues(alpha: 0.12),
              colorScheme.secondary.withValues(alpha: 0.08),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          boxShadow: [
            BoxShadow(
              color: colorScheme.primary.withValues(alpha: 0.15),
              spreadRadius: 4,
              blurRadius: 24,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Image.asset(assetName, fit: BoxFit.contain),
        ),
      ),
    );
  }

  PageDecoration _getPageDecoration(BuildContext context) {
    return PageDecoration(
      pageColor: Theme.of(context).scaffoldBackgroundColor,
      imagePadding: const EdgeInsets.only(top: 64, bottom: 24),
      contentMargin: const EdgeInsets.symmetric(horizontal: 24),
      titlePadding: const EdgeInsets.only(top: 48, bottom: 24),
      bodyPadding: const EdgeInsets.symmetric(horizontal: 24),
    );
  }

  void _onIntroEnd(BuildContext context) async {
    // Mark onboarding as completed
    await OnboardingService.setOnboardingCompleted();

    // Navigate to the login screen
    if (context.mounted) {
      context.go('/login');
    }
  }
}
