import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/domain/entities/two_factor_challenge.dart';
import 'package:mobile/presentation/auth/providers/auth_providers.dart';
import 'package:mobile/core/services/toast_service.dart';

class TwoFactorScreen extends ConsumerStatefulWidget {
  const TwoFactorScreen({super.key});

  @override
  ConsumerState<TwoFactorScreen> createState() => _TwoFactorScreenState();
}

class _TwoFactorScreenState extends ConsumerState<TwoFactorScreen> {
  final _otpController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _isOtpSubmitting = false;
  bool _isResendingOtp = false;
  bool _trustDevice = false;

  @override
  void initState() {
    super.initState();
    // Check if there's a challenge, if not redirect to login
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final challenge = ref.read(twoFactorChallengeProvider);
      if (challenge == null) {
        context.go('/login');
      }
    });
  }

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _handleVerifyOtp() async {
    if (!_formKey.currentState!.validate()) return;

    final code = _otpController.text.trim();
    final challenge = ref.read(twoFactorChallengeProvider);

    if (code.length < 6) {
      final emailLabel = challenge != null
          ? _maskEmail(challenge.email)
          : 'your email';
      ToastService.showInfo(
        context: context,
        title: 'Invalid code',
        description: 'Enter the 6-digit code we sent to $emailLabel.',
      );
      return;
    }

    setState(() {
      _isOtpSubmitting = true;
    });

    final notifier = ref.read(authProvider.notifier);

    try {
      await notifier.verifyTwoFactorOtp(code, trustDevice: _trustDevice);

      if (!mounted) return;

      setState(() {
        _trustDevice = false;
      });
      _otpController.clear();

      context.go('/home');
    } catch (error) {
      if (!mounted) return;
      final message = _formatTwoFactorError(error);
      ToastService.showError(
        context: context,
        title: 'Verification failed',
        description: message,
      );
    } finally {
      if (mounted) {
        setState(() {
          _isOtpSubmitting = false;
        });
      }
    }
  }

  Future<void> _handleResendOtp() async {
    setState(() {
      _isResendingOtp = true;
    });

    final notifier = ref.read(authProvider.notifier);

    try {
      await notifier.requestTwoFactorOtp(trustDevice: _trustDevice);

      if (!mounted) return;

      final challenge = ref.read(twoFactorChallengeProvider);
      final emailLabel = challenge != null
          ? _maskEmail(challenge.email)
          : 'your email';

      ToastService.showInfo(
        context: context,
        title: 'Code sent',
        description: 'We sent a new verification code to $emailLabel.',
      );
    } catch (error) {
      if (!mounted) return;
      final message = _formatTwoFactorError(error);
      ToastService.showError(
        context: context,
        title: 'Unable to resend code',
        description: message,
      );
    } finally {
      if (mounted) {
        setState(() {
          _isResendingOtp = false;
        });
      }
    }
  }

  void _cancelTwoFactorChallenge() {
    ref.read(authProvider.notifier).clearTwoFactorChallenge();
    context.go('/login');
  }

  String _maskEmail(String email) {
    final parts = email.split('@');
    if (parts.length != 2) return email;

    final local = parts.first;
    final domain = parts.last;

    if (local.isEmpty) {
      return '***@$domain';
    }

    if (local.length <= 2) {
      return '${local[0]}***@$domain';
    }

    return '${local.substring(0, 2)}***@$domain';
  }

  String _formatTwoFactorError(Object error) {
    final message = error.toString();

    if (message.contains('Too many attempts')) {
      return 'Too many incorrect attempts. Please request a new code.';
    }

    if (message.contains('expired') || message.contains('Expired')) {
      return 'The security code has expired. Request a new code and try again.';
    }

    if (message.contains('Invalid code') || message.contains('invalid code')) {
      return 'The security code you entered is incorrect. Double-check and try again.';
    }

    return message.replaceFirst('Exception: ', '');
  }

  @override
  Widget build(BuildContext context) {
    final challenge = ref.watch(twoFactorChallengeProvider);
    final colorScheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Redirect if no challenge
    if (challenge == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final maskedEmail = _maskEmail(challenge.email);

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: Stack(
        children: [
          // Background gradient
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: isDark
                    ? [
                        const Color(0xFF1A237E).withOpacity(0.05),
                        Theme.of(context).scaffoldBackgroundColor,
                      ]
                    : [
                        const Color(0xFF1976D2).withOpacity(0.02),
                        Theme.of(context).scaffoldBackgroundColor,
                      ],
              ),
            ),
          ),

          // Main content
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  minHeight:
                      MediaQuery.of(context).size.height -
                      MediaQuery.of(context).padding.top -
                      MediaQuery.of(context).padding.bottom,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 40),

                    // Back button
                    Align(
                      alignment: Alignment.centerLeft,
                      child: IconButton(
                        onPressed: _cancelTwoFactorChallenge,
                        icon: Icon(
                          Icons.arrow_back_rounded,
                          color: colorScheme.onSurface,
                        ),
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Header Section
                    _buildHeaderSection(context, colorScheme),

                    const SizedBox(height: 32),

                    // Two-Factor Card
                    _buildTwoFactorCard(
                      context,
                      challenge,
                      maskedEmail,
                      colorScheme,
                    ),

                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeaderSection(BuildContext context, ColorScheme colorScheme) {
    return Column(
      children: [
        // Security Icon
        Container(
          width: 100,
          height: 100,
          decoration: BoxDecoration(
            color: colorScheme.primary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(25),
            border: Border.all(
              color: colorScheme.primary.withOpacity(0.2),
              width: 2,
            ),
          ),
          child: Icon(
            Icons.shield_rounded,
            size: 50,
            color: colorScheme.primary,
          ),
        ),

        const SizedBox(height: 20),

        // Title
        Text(
          'Two-Factor Authentication',
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w800,
            color: colorScheme.onSurface,
            letterSpacing: -0.8,
            height: 1.1,
          ),
          textAlign: TextAlign.center,
        ),

        const SizedBox(height: 8),

        // Subtitle
        Text(
          'Secure your account with an extra layer of protection',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: colorScheme.onSurface.withOpacity(0.7),
            letterSpacing: 0.2,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildTwoFactorCard(
    BuildContext context,
    TwoFactorChallenge challenge,
    String maskedEmail,
    ColorScheme colorScheme,
  ) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: colorScheme.primary.withOpacity(0.15),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: colorScheme.primary.withOpacity(0.08),
            offset: const Offset(0, 8),
            blurRadius: 28,
            spreadRadius: 0,
          ),
        ],
      ),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header
            Text(
              'Verify Security Code',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: colorScheme.onSurface,
                letterSpacing: -0.2,
              ),
              textAlign: TextAlign.left,
            ),
            const SizedBox(height: 8),
            Text(
              'We sent a 6-digit verification code to $maskedEmail. Enter the code below to finish signing in.',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: colorScheme.onSurface.withOpacity(0.7),
              ),
            ),

            const SizedBox(height: 24),

            // OTP Input
            TextFormField(
              controller: _otpController,
              keyboardType: TextInputType.number,
              maxLength: 6,
              autofocus: true,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w700,
                letterSpacing: 8,
                color: colorScheme.onSurface,
              ),
              textAlign: TextAlign.center,
              decoration: InputDecoration(
                labelText: 'Security Code',
                hintText: '000000',
                hintStyle: TextStyle(
                  letterSpacing: 8,
                  color: colorScheme.onSurface.withOpacity(0.2),
                ),
                prefixIcon: Icon(Icons.pin_rounded, color: colorScheme.primary),
                counterText: '',
                filled: true,
                fillColor: colorScheme.surfaceContainerLow,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide.none,
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide(
                    color: colorScheme.outline.withOpacity(0.1),
                    width: 1,
                  ),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide(color: colorScheme.primary, width: 2),
                ),
                errorBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide(color: colorScheme.error, width: 1),
                ),
                focusedErrorBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide(color: colorScheme.error, width: 2),
                ),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter the security code';
                }
                if (value.length < 6) {
                  return 'Security code must be 6 digits';
                }
                return null;
              },
            ),

            // Trust Device Checkbox
            if (challenge.canTrustDevice) ...[
              const SizedBox(height: 16),
              Container(
                decoration: BoxDecoration(
                  color: colorScheme.surfaceContainerLow,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: colorScheme.outline.withOpacity(0.1),
                    width: 1,
                  ),
                ),
                child: CheckboxListTile(
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 4,
                  ),
                  title: Text(
                    'Trust this device',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: colorScheme.onSurface,
                    ),
                  ),
                  subtitle: Text(
                    'Skip verification on this device for 30 days',
                    style: TextStyle(
                      fontSize: 12,
                      color: colorScheme.onSurface.withOpacity(0.6),
                    ),
                  ),
                  value: _trustDevice,
                  onChanged: _isOtpSubmitting
                      ? null
                      : (value) {
                          setState(() {
                            _trustDevice = value ?? false;
                          });
                        },
                ),
              ),
            ],

            const SizedBox(height: 24),

            // Verify Button
            _buildVerifyButton(colorScheme),

            const SizedBox(height: 16),

            // Divider
            Row(
              children: [
                Expanded(
                  child: Divider(color: colorScheme.outline.withOpacity(0.2)),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Text(
                    'OR',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: colorScheme.onSurface.withOpacity(0.5),
                    ),
                  ),
                ),
                Expanded(
                  child: Divider(color: colorScheme.outline.withOpacity(0.2)),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Action Buttons
            Wrap(
              spacing: 8,
              runSpacing: 8,
              alignment: WrapAlignment.center,
              children: [
                OutlinedButton.icon(
                  onPressed: _isResendingOtp ? null : _handleResendOtp,
                  icon: _isResendingOtp
                      ? SizedBox(
                          height: 16,
                          width: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: colorScheme.primary,
                          ),
                        )
                      : Icon(Icons.refresh_rounded, size: 18),
                  label: const Text('Resend Code'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                  ),
                ),
                TextButton.icon(
                  onPressed: _isOtpSubmitting
                      ? null
                      : _cancelTwoFactorChallenge,
                  icon: Icon(Icons.arrow_back_rounded, size: 18),
                  label: const Text('Back to Login'),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVerifyButton(ColorScheme colorScheme) {
    return Container(
      height: 52,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: !_isOtpSubmitting
              ? [colorScheme.primary, colorScheme.secondary]
              : [
                  colorScheme.onSurface.withOpacity(0.12),
                  colorScheme.onSurface.withOpacity(0.12),
                ],
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: !_isOtpSubmitting
            ? [
                BoxShadow(
                  color: colorScheme.primary.withOpacity(0.25),
                  offset: const Offset(0, 8),
                  blurRadius: 24,
                  spreadRadius: 0,
                ),
              ]
            : null,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: _isOtpSubmitting ? null : _handleVerifyOtp,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            alignment: Alignment.center,
            child: _isOtpSubmitting
                ? const SizedBox(
                    height: 22,
                    width: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.verified_user_rounded,
                        color: Colors.white,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Verify Code',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}
