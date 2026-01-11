package com.biosensesignal.flutter_sdk

import com.biosensesignal.sdk.api.images.ImageData
import kotlinx.coroutines.flow.Flow

interface ImageDataSource {

    val images: Flow<ImageData>
}