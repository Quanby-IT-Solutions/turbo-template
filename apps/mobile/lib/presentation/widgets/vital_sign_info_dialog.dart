import 'package:flutter/material.dart';
import 'package:mobile/core/services/vital_sign_info_service.dart';

class VitalSignInfoDialog extends StatelessWidget {
  final VitalSignInfo vitalSignInfo;

  const VitalSignInfoDialog({super.key, required this.vitalSignInfo});

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.85,
          maxWidth: MediaQuery.of(context).size.width * 0.9,
        ),
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [vitalSignInfo.color.withOpacity(0.1), Colors.white],
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header with icon and title
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: vitalSignInfo.color.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                vitalSignInfo.icon,
                size: 48,
                color: vitalSignInfo.color,
              ),
            ),
            const SizedBox(height: 16),

            Text(
              vitalSignInfo.name,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: vitalSignInfo.color,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),

            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: vitalSignInfo.color.withOpacity(0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                vitalSignInfo.category,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: vitalSignInfo.color,
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Scrollable content
            Flexible(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Description
                    _buildInfoSection(
                      'Description',
                      vitalSignInfo.description,
                      Icons.info_outline,
                      vitalSignInfo.color,
                    ),
                    const SizedBox(height: 20),

                    // Normal Range
                    _buildInfoSection(
                      'Normal Range',
                      vitalSignInfo.normalRange,
                      Icons.straighten,
                      vitalSignInfo.color,
                    ),
                    const SizedBox(height: 20),

                    // Clinical Significance
                    _buildInfoSection(
                      'Clinical Significance',
                      vitalSignInfo.clinicalSignificance,
                      Icons.medical_services,
                      vitalSignInfo.color,
                    ),
                    const SizedBox(height: 20),

                    // Interpretation
                    _buildInfoSection(
                      'Interpretation',
                      vitalSignInfo.interpretation,
                      Icons.lightbulb_outline,
                      vitalSignInfo.color,
                    ),
                    const SizedBox(height: 20),

                    // Factors
                    _buildFactorsSection(
                      'Affecting Factors',
                      vitalSignInfo.factors,
                      vitalSignInfo.color,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Close button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close),
                label: const Text('Close'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: vitalSignInfo.color,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 4,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoSection(
    String title,
    String content,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.2), width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 12),
              Text(
                title,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            content,
            style: const TextStyle(
              fontSize: 14,
              height: 1.5,
              color: Colors.black87,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFactorsSection(String title, List<String> factors, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.2), width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(Icons.fact_check, color: color, size: 20),
              ),
              const SizedBox(width: 12),
              Text(
                title,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: factors.map((factor) {
              return Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: color.withOpacity(0.3), width: 1),
                ),
                child: Text(
                  factor,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: color,
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
