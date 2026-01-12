import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
// TODO: Uncomment when hyperkyc_flutter package is available
// import 'package:hyperkyc_flutter/hyperkyc_flutter.dart';
// import 'package:hyperkyc_flutter/hyperkyc_config.dart';
// import 'package:hyperkyc_flutter/hyperkyc_result.dart';
import 'package:mobile/core/constants/app_constants.dart';
import 'package:mobile/core/services/toast_service.dart';
import 'package:mobile/core/services/hyperverge_service.dart';
import 'package:mobile/presentation/auth/providers/auth_providers.dart';

final hypervergeServiceProvider = Provider<HyperVergeService>((ref) {
  return HyperVergeService();
});

/// KYC Verification Screen with HyperVerge SDK integration
/// For healthcare providers - verifies identity using government ID + selfie
/// TODO: Uncomment HyperKYC code when package is available
class KycVerificationScreen extends ConsumerStatefulWidget {
  const KycVerificationScreen({super.key});

  @override
  ConsumerState<KycVerificationScreen> createState() =>
      _KycVerificationScreenState();
}

class _KycVerificationScreenState extends ConsumerState<KycVerificationScreen> {
  bool _isLoading = false;
  String? _verificationStatus;

  @override
  void initState() {
    super.initState();
    _checkVerificationStatus();
  }

  Future<void> _checkVerificationStatus() async {
    final user = ref.read(currentUserProvider);
    if (user == null) return;

    setState(() => _isLoading = true);

    try {
      final service = ref.read(hypervergeServiceProvider);
      final status = await service.getVerificationStatus(user.id);
      setState(() {
        _verificationStatus = status['status'] as String?;
      });
    } catch (e) {
      // Ignore errors for now
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _startVerification() async {
    // TODO: Uncomment when hyperkyc_flutter package is available
    ToastService.showInfo(
      context: context,
      title: 'Feature Unavailable',
      description: 'KYC verification is temporarily unavailable. Please check back later.',
    );
    
    /* COMMENTED OUT - HyperKYC integration pending package availability
    final user = ref.read(currentUserProvider);
    if (user == null) {
      ToastService.showError(
        context: context,
        title: 'Error',
        description: 'User not authenticated',
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      // Step 1: Get access token from backend
      final service = ref.read(hypervergeServiceProvider);
      final tokenData = await service.generateAccessToken(userId: user.id);

      // Step 2: Configure HyperKYC SDK
      var hyperKycConfig = HyperKycConfig.fromAccessToken(
        accessToken: tokenData['accessToken'] as String,
        workflowId: tokenData['workflowId'] as String,
        transactionId: tokenData['transactionId'] as String,
      );

      // Step 3: Launch HyperKYC SDK
      HyperKycResult result = await HyperKyc.launch(
        hyperKycConfig: hyperKycConfig,
      );

      // Step 4: Handle result
      if (!mounted) return;

      final status = result.status;
      switch (status) {
        case HyperKycStatus.autoApproved:
          ToastService.showMedicalSuccess(
            context: context,
            title: 'Verification Successful',
            description: 'Your identity has been verified successfully.',
          );
          // Refresh verification status
          await _checkVerificationStatus();
          // Navigate to home
          context.go('/home');
          break;

        case HyperKycStatus.autoDeclined:
          ToastService.showError(
            context: context,
            title: 'Verification Failed',
            description:
                'Unable to verify your identity. Please ensure your documents are clear and try again.',
          );
          break;

        case HyperKycStatus.needsReview:
          ToastService.showInfo(
            context: context,
            title: 'Under Review',
            description:
                'Your verification is under manual review. We will notify you once it is complete.',
          );
          context.go('/home');
          break;

        case HyperKycStatus.userCancelled:
          ToastService.showInfo(
            context: context,
            title: 'Verification Cancelled',
            description:
                'You can complete verification later from your profile settings.',
          );
          break;

        case HyperKycStatus.error:
          ToastService.showError(
            context: context,
            title: 'Verification Error',
            description:
                'An error occurred during verification. Please try again.',
          );
          break;

        default:
          ToastService.showError(
            context: context,
            title: 'Unknown Status',
            description: 'Received unknown verification status.',
          );
      }
    } catch (e) {
      if (mounted) {
        ToastService.showError(
          context: context,
          title: 'Verification Failed',
          description: e.toString().replaceFirst('Exception: ', ''),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
    */
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Identity Verification'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppConstants.defaultPadding),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 20),
              Icon(
                Icons.verified_user_outlined,
                size: 80,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(height: 24),
              Text(
                'Verify Your Identity',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                'Complete identity verification to access all healthcare provider features.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),

              // Verification Steps
              _buildVerificationStep(
                icon: Icons.badge_outlined,
                title: 'Government ID',
                description: 'Take a photo of your valid government-issued ID',
              ),
              _buildVerificationStep(
                icon: Icons.face_outlined,
                title: 'Selfie Verification',
                description: 'Take a selfie to verify your identity',
              ),
              _buildVerificationStep(
                icon: Icons.check_circle_outline,
                title: 'Instant Results',
                description: 'Get verified in minutes',
              ),

              const Spacer(),

              if (_verificationStatus == 'VERIFIED')
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.green.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.green),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle, color: Colors.green),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Your identity has been verified',
                          style: TextStyle(
                            color: Colors.green[700],
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                )
              else
                ElevatedButton(
                  onPressed: _isLoading ? null : _startVerification,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Start Verification'),
                ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () => context.pop(),
                child: const Text('Skip for now'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildVerificationStep({
    required IconData icon,
    required String title,
    required String description,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primaryContainer,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              icon,
              color: Theme.of(context).colorScheme.onPrimaryContainer,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                Text(
                  description,
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
