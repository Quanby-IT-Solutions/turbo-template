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
// TODO: Uncomment when implementing HyperKYC
// import 'package:mobile/presentation/auth/providers/auth_providers.dart';

final hypervergeServiceProvider = Provider<HyperVergeService>((ref) {
  return HyperVergeService();
});

/// Patient-specific PhilHealth ID upload screen with HyperVerge SDK integration
/// TODO: Uncomment HyperKYC code when package is available
class PhilHealthIdUploadScreen extends ConsumerStatefulWidget {
  const PhilHealthIdUploadScreen({super.key});

  @override
  ConsumerState<PhilHealthIdUploadScreen> createState() =>
      _PhilHealthIdUploadScreenState();
}

class _PhilHealthIdUploadScreenState
    extends ConsumerState<PhilHealthIdUploadScreen> {
  final bool _isLoading = false;

  Future<void> _startVerification() async {
    // TODO: Uncomment when hyperkyc_flutter package is available
    ToastService.showInfo(
      context: context,
      title: 'Feature Unavailable',
      description: 'PhilHealth ID verification is temporarily unavailable. Please check back later.',
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
      final hyperKycConfig = HyperKycConfig.fromAccessToken(
        accessToken: tokenData['accessToken'] as String,
        workflowId: tokenData['workflowId'] as String,
        transactionId: tokenData['transactionId'] as String,
      );

      // Step 3: Launch HyperKYC SDK
      if (!mounted) return;

      final HyperKycResult result = await HyperKyc.launch(
        hyperKycConfig: hyperKycConfig,
      );

      // Step 4: Handle result
      if (!mounted) return;

      final status = result.status;

      // Handle different verification outcomes
      if (status == HyperKycStatus.autoApproved) {
        ToastService.showSuccess(
          context: context,
          title: 'Verification Successful',
          description: 'Your PhilHealth ID has been verified successfully.',
        );
        context.go('/home');
      } else if (status == HyperKycStatus.autoDeclined) {
        ToastService.showError(
          context: context,
          title: 'Verification Failed',
          description:
              'Unable to verify your PhilHealth ID. Please ensure the ID is clear and valid.',
        );
      } else if (status == HyperKycStatus.needsReview) {
        ToastService.showInfo(
          context: context,
          title: 'Under Review',
          description:
              'Your PhilHealth ID is under review. We will notify you once verification is complete.',
        );
        context.go('/home');
      } else if (status == HyperKycStatus.userCancelled) {
        ToastService.showInfo(
          context: context,
          title: 'Verification Cancelled',
          description:
              'You can complete PhilHealth ID verification later from your profile.',
        );
      } else if (status == HyperKycStatus.error) {
        ToastService.showError(
          context: context,
          title: 'Verification Error',
          description:
              result.details?.toString() ??
              'An error occurred during verification. Please try again.',
        );
      } else {
        ToastService.showError(
          context: context,
          title: 'Unknown Status',
          description:
              'Received unknown verification status: ${status?.name ?? "null"}',
        );
      }
    } catch (e) {
      if (mounted) {
        // Check if it's a configuration error
        final errorMsg = e.toString();
        if (errorMsg.contains('not configured') ||
            errorMsg.contains('credentials')) {
          ToastService.showInfo(
            context: context,
            title: 'Service Unavailable',
            description:
                'PhilHealth ID verification is not available at the moment. Please try again later or contact support.',
          );
        } else {
          ToastService.showError(
            context: context,
            title: 'Verification Failed',
            description: e.toString().replaceFirst('Exception: ', ''),
          );
        }
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
    return Scaffold(
      appBar: AppBar(
        title: const Text('PhilHealth ID Verification'),
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
                Icons.health_and_safety_outlined,
                size: 80,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(height: 24),
              Text(
                'Verify Your PhilHealth ID',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                'Upload your PhilHealth ID to access insurance benefits and streamline your healthcare experience.',
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium?.copyWith(color: Colors.grey[600]),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),

              // Verification Steps
              _buildVerificationStep(
                icon: Icons.badge_outlined,
                title: 'Capture PhilHealth ID',
                description: 'Take a photo of your PhilHealth ID card',
              ),
              _buildVerificationStep(
                icon: Icons.face_outlined,
                title: 'Take Selfie',
                description: 'Verify your identity with a selfie',
              ),
              _buildVerificationStep(
                icon: Icons.verified_outlined,
                title: 'Auto Verification',
                description: 'AI verifies ID and matches with selfie',
              ),

              const Spacer(),

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
