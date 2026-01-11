package com.biosensesignal.flutter_sdk

import io.flutter.plugin.common.EventChannel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class BiosenseSignalEventChannel(
    eventChannel: EventChannel
): EventChannel.StreamHandler {

    private var eventSink: EventChannel.EventSink? = null
    private val mainScope = CoroutineScope(Dispatchers.Main)

    init {
        eventChannel.setStreamHandler(this)
    }

    fun sendEvent(name: String, payload: Any) {
        eventSink?.let { sink ->
            mainScope.launch {
                sink.success(mapOf(
                    Pair("event", name),
                    Pair("payload", payload)
                ))
            }
        }
    }

    override fun onListen(arguments: Any?, events: EventChannel.EventSink?) {
        eventSink = events
    }

    override fun onCancel(arguments: Any?) {
        eventSink = null
    }

}