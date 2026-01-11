import 'package:biosensesignal_flutter_sdk/fall_detection/fall_detection_data.dart';

abstract class FallDetectionListener {
  void onFallDetection(FallDetectionData data);
}
