//
//  BiosenseSignalCameraPreview.swift
//  biosensesignal_flutter_sdk
//
//  Created on 26/03/2023.
//

import Foundation
import Combine

class BiosenseSignalCameraPreview: UIImageView, FlutterPlatformView {
    
    private var imageDataSource: ImageDataSource?
    private var cancellable: AnyCancellable? = nil
    private var lastUIImageSize: CGSize?
    
    func setDataSource(imageDataSource: ImageDataSource?) {
        self.imageDataSource = imageDataSource
        cancellable = self.imageDataSource?.images
            .receive(on: DispatchQueue.main)
            .sink { [weak self] imageData in
                let uiImage = imageData.image
                if (self?.lastUIImageSize != uiImage.size) {
                    self?.lastUIImageSize = uiImage.size
                    self?.image = nil
                }

                self?.image = uiImage
            }
            
    }
    
    func view() -> UIView {
        return self
    }
    
}
