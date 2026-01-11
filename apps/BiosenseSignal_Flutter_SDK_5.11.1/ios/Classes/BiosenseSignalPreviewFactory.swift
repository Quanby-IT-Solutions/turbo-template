//
//  BiosenseSignalPreviewFactory.swift
//  biosensesignal_flutter_sdk
//
//  Created on 26/03/2023.
//

import Foundation


class BiosenseSignalPreviewFactory: NSObject, FlutterPlatformViewFactory {
    
    static let shared: BiosenseSignalPreviewFactory = BiosenseSignalPreviewFactory()
    static let cameraPreviewId = "plugins.biosensesignal.com/camera_preview_view"
    
    private var cameraPreview: BiosenseSignalCameraPreview?
    private var imageDataSource: ImageDataSource?
    
    private override init() { }
    
    func create(withFrame frame: CGRect, viewIdentifier viewId: Int64, arguments args: Any?) -> FlutterPlatformView {
        let preview = BiosenseSignalCameraPreview()
        preview.setDataSource(imageDataSource: imageDataSource)
        return preview
    }
    
    func setDataSource(imageDataSource: ImageDataSource) {
        self.imageDataSource = imageDataSource
        cameraPreview?.setDataSource(imageDataSource: imageDataSource)
    }
    
    
    
}
