import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/services/analytics/feature_flags.dart';
import 'package:mobile/shared/widgets/section_header.dart';
import 'package:mobile/shared/widgets/settings_group.dart';

/// The PostHog flag that switches this section on.
const kPreviewFeaturesFlag = 'mobile-preview';

/// A Settings section that exists only while the `mobile-preview` flag is on.
///
/// It is the template's worked example of a feature flag: flip the flag in
/// PostHog, relaunch, and the section appears or disappears. While the flag is
/// loading, off, or unreadable, nothing is rendered, so the screen is the one
/// it was before flags existed.
class PreviewFeaturesTile extends ConsumerWidget {
  const PreviewFeaturesTile({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final enabled = ref.watch(featureFlagProvider(kPreviewFeaturesFlag)).value ?? false;
    if (!enabled) return const SizedBox.shrink();

    return const Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(title: 'Preview'),
        SettingsGroup(
          children: [
            ListTile(
              leading: Icon(Icons.science_outlined),
              title: Text('Preview features'),
              subtitle: Text('Enabled for this account'),
            ),
          ],
        ),
        SizedBox(height: 16),
      ],
    );
  }
}
