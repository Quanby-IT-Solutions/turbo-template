package com.biosensesignal.flutter_sdk

abstract class NativeBridgeApi {

    companion object {
        const val createSession = "createSession";
        const val createPPGDeviceSession = "createPPGDeviceSession";
        const val startSession = "startSession";
        const val stopSession = "stopSession";
        const val terminateSession = "terminateSession";
        const val getSessionState = "getSessionState";
        const val getNativeSdkVersion = "getNativeSdkVersion";
        const val getMinPolarVersion = "getMinPolarVersion";
        const val startPPGDevicesScan = "startPPGDevicesScan";
        const val stopPPGDeviceScan = "stopPPGDevicesScan";
    }
}