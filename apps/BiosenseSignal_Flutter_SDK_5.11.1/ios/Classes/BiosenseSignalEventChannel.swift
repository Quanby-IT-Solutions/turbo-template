import Foundation


class BiosenseSignalEventChannel: NSObject, FlutterStreamHandler {
    
    static let eventChannelId = "plugins.biosensesignal.com/sdk_events"
    private var eventSink: FlutterEventSink?
    
    init(messenger: FlutterBinaryMessenger) {
        super.init()
        let channel = FlutterEventChannel(name: BiosenseSignalEventChannel.eventChannelId, binaryMessenger: messenger)
        channel.setStreamHandler(self)
    }
    
    func sendEvent(name: String, payload: Any) {
        DispatchQueue.main.async {
            self.eventSink?([
                "event": name,
                "payload": payload
            ])
        }
    }
    
    func onListen(withArguments arguments: Any?, eventSink events: @escaping FlutterEventSink) -> FlutterError? {
        self.eventSink = events
        return nil
    }
    
    func onCancel(withArguments arguments: Any?) -> FlutterError? {
        eventSink = nil
        return nil
    }
}
