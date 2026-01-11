import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/core/constants/app_constants.dart';
import 'package:mobile/core/services/toast_service.dart';

class CredentialUploadScreen extends StatefulWidget {
  const CredentialUploadScreen({super.key});

  @override
  State<CredentialUploadScreen> createState() => _CredentialUploadScreenState();
}

class _CredentialUploadScreenState extends State<CredentialUploadScreen> {
  final List<String> _uploadedFiles = [];
  bool _isLoading = false;

  Future<void> _uploadFile(String fileType) async {
    setState(() => _isLoading = true);

    // Simulate file upload
    await Future.delayed(const Duration(seconds: 2));

    setState(() {
      _uploadedFiles.add(fileType);
      _isLoading = false;
    });

    if (mounted) {
      ToastService.showSuccess(
        context: context,
        title: 'Document Uploaded',
        description: '$fileType uploaded successfully',
      );
    }
  }

  Future<void> _continueToKYC() async {
    if (_uploadedFiles.isNotEmpty) {
      ToastService.showMedicalSuccess(
        context: context,
        title: 'Credentials Verified',
        description: 'All documents uploaded. Proceeding to identity verification.',
      );
      context.go('/kyc-verification');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Upload Credentials')),
      body: Padding(
        padding: const EdgeInsets.all(AppConstants.defaultPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Upload Your Professional Documents',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Please upload the required documents to verify your credentials.',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            const SizedBox(height: 24),
            
            Expanded(
              child: ListView(
                children: [
                  _buildUploadCard(
                    'Medical License',
                    'Upload your current medical license',
                    Icons.badge,
                    () => _uploadFile('Medical License'),
                    _uploadedFiles.contains('Medical License'),
                  ),
                  const SizedBox(height: 16),
                  _buildUploadCard(
                    'Medical Degree',
                    'Upload your medical degree certificate',
                    Icons.school,
                    () => _uploadFile('Medical Degree'),
                    _uploadedFiles.contains('Medical Degree'),
                  ),
                  const SizedBox(height: 16),
                  _buildUploadCard(
                    'Professional Certificate',
                    'Upload additional certifications',
                    Icons.workspace_premium,
                    () => _uploadFile('Professional Certificate'),
                    _uploadedFiles.contains('Professional Certificate'),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 24),
            
            if (_isLoading)
              const Center(child: CircularProgressIndicator())
            else
              ElevatedButton(
                onPressed: _uploadedFiles.isNotEmpty ? _continueToKYC : null,
                child: const Text('Continue to Identity Verification'),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildUploadCard(
    String title,
    String subtitle,
    IconData icon,
    VoidCallback onTap,
    bool isUploaded,
  ) {
    return Card(
      child: ListTile(
        leading: Icon(
          icon,
          color: isUploaded ? Colors.green : Theme.of(context).colorScheme.primary,
          size: 32,
        ),
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Text(subtitle),
        trailing: isUploaded
            ? const Icon(Icons.check_circle, color: Colors.green)
            : const Icon(Icons.upload_file),
        onTap: isUploaded ? null : onTap,
      ),
    );
  }
}