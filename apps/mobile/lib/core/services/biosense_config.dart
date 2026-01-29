class BiosenseConfig {
  /// Full BioSense license key.
  ///
  /// IMPORTANT:
  /// - Keep this exactly as provided by BioSense (no line breaks or spaces).
  /// - Do NOT commit real production keys if this repo is public.
  static const String licenseKey = 'D3DEB7-29D98B-46D29B-DA5CB8-036F29-368674';

  /// Basic sanity check so we never call the native SDK with an obviously
  /// invalid / truncated key (which can trigger native crashes).
  static bool isLicenseKeyValid() {
    final key = licenseKey.trim();
    return key.isNotEmpty &&
        key.length > 20 &&
        !key.contains('...'); // guard against truncated keys
  }
}

/// Central feature flags for BioSense-related functionality.
class FeatureFlags {
  /// Flip this to `false` to disable all BioSense usage in the app
  /// (useful while waiting for SDK updates or during incident mitigation).
  static const bool enableBiosense = true;
}
