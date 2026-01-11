import 'package:biosensesignal_flutter_sdk/license/license_info.dart';
import 'package:biosensesignal_flutter_sdk/session/session_enabled_vital_signs.dart';
import 'package:biosensesignal_flutter_sdk/session/session_state.dart';
import 'package:biosensesignal_flutter_sdk/alerts/warning_data.dart';
import 'package:biosensesignal_flutter_sdk/alerts/error_data.dart';

abstract class SessionInfoListener {
  void onSessionStateChange(SessionState sessionState);
  void onWarning(WarningData warningData);
  void onError(ErrorData errorData);
  void onEnabledVitalSigns(SessionEnabledVitalSigns enabledVitalSigns);
  void onLicenseInfo(LicenseInfo licenseInfo);
}
