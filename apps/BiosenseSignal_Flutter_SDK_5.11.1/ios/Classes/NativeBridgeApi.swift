//
//  NativeBridgeApi.swift
//  biosensesignal_flutter_sdk
//
//  Created on 26/03/2023.
//

import Foundation


class NativeBridgeApi {
    
    static let createSession = "createSession";
    static let createPPGDeviceSession = "createPPGDeviceSession"
    static let startSession = "startSession";
    static let stopSession = "stopSession";
    static let terminateSession = "terminateSession";
    static let getSessionState = "getSessionState";
    static let getNativeSdkVersion = "getNativeSdkVersion";
    static let getPolarMinVersion = "getPolarMinVersion";
    static let startPPGDevicesScan = "startPPGDevicesScan";
    static let stopPPGDeviceScan = "stopPPGDevicesScan";
}
