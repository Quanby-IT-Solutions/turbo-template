import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class CameraPreviewView extends StatelessWidget {
  static const String _viewType = "plugins.biosensesignal.com/camera_preview_view";

  const CameraPreviewView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    Widget createNativeView() {
      if (defaultTargetPlatform == TargetPlatform.android) {
        return const AndroidView(
            viewType: _viewType,
            creationParams: null,
            creationParamsCodec: StandardMessageCodec());
      } else if (defaultTargetPlatform == TargetPlatform.iOS) {
        return const UiKitView(
            viewType: _viewType,
            creationParams: null,
            creationParamsCodec: StandardMessageCodec());
      } else {
        return const Text("Not supported");
      }
    }

    return createNativeView();
  }
}
