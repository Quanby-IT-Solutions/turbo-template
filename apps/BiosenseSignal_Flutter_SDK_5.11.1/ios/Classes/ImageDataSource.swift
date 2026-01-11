//
//  ImageDataSource.swift
//  biosensesignal_flutter_sdk
//
//  Created on 26/03/2023.
//

import Foundation
import Combine

protocol ImageDataSource {
    
    var images: PassthroughSubject<ImageData, Never> { get }
}
