import 'package:flutter_dotenv/flutter_dotenv.dart';

class BiosenseConfig {
  static String get licenseKey =>
      dotenv.env['BIOSENSESIGNAL_LICENSE_KEY'] ?? '';

  static bool get isLicenseKeyValid {
    return licenseKey.isNotEmpty &&
        licenseKey.length > 20 &&
        !licenseKey.contains('...');
  }
}

class FeatureFlags {
  static const bool enableBiosense = true;
}
