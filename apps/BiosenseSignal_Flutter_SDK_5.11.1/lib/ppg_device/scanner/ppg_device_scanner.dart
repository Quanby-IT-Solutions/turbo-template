import 'package:biosensesignal_flutter_sdk/bridge/bridge_channels.dart';
import 'package:biosensesignal_flutter_sdk/bridge/bridge_events.dart';
import 'package:biosensesignal_flutter_sdk/bridge/bridge_models_factory.dart';
import 'package:biosensesignal_flutter_sdk/bridge/method_calls.dart';
import 'package:biosensesignal_flutter_sdk/health_monitor_exception.dart';
import 'package:biosensesignal_flutter_sdk/ppg_device/ppg_device_type.dart';
import 'package:biosensesignal_flutter_sdk/ppg_device/scanner/ppg_device_scanner_listener.dart';
import 'package:flutter/services.dart';
import 'package:uuid/uuid.dart';

class PPGDeviceScanner {
  final String _scannerId = const Uuid().v4();
  final PPGDeviceType _deviceType;
  final PPGDeviceScannerListener _listener;

  PPGDeviceScanner(this._deviceType, this._listener) {
    _registerToScannerEvents();
  }

  Future<void> start(int? timeout) async {
    await stop();
    try {
      await methodChannel.invokeMethod(MethodCalls.startPPGDevicesScan, {
        'scannerId': _scannerId,
        'deviceType': _deviceType.index,
        'timeout': timeout
      });
    } on PlatformException catch (e) {
      throw HealthMonitorException(e.message!, int.parse(e.code));
    }
  }

  Future<void> stop() async {
    await methodChannel
        .invokeMethod(MethodCalls.stopPPGDeviceScan, {"scannerId": _scannerId});
  }

  void _registerToScannerEvents() {
    eventChannel.receiveBroadcastStream().listen((onData) {
      var payload = onData['payload'];
      switch (onData['event'] as String) {
        case BridgeEvents.ppgDeviceDiscovered:
          var result = Map<String, dynamic>.from(payload);
          if (_scannerId == result['scannerId']) {
            var ppgDevice =
                createPPGDevice(Map<String, dynamic>.from(result['device']));
            _listener.onPPGDeviceDiscovered(ppgDevice);
          }
          break;
        case BridgeEvents.ppgDeviceScanFinished:
          var scannerId = payload as String;
          if (_scannerId == scannerId) {
            _listener.onPPGDeviceScanFinished();
          }
          break;
        default:
          break;
      }
    });
  }
}
