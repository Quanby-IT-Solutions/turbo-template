package com.biosensesignal.flutter_sdk

import android.content.Context
import io.flutter.plugin.common.StandardMessageCodec
import io.flutter.plugin.platform.PlatformView
import io.flutter.plugin.platform.PlatformViewFactory

object BiosenseSignalPreviewFactory: PlatformViewFactory(StandardMessageCodec.INSTANCE) {

    const val cameraPreviewId = "plugins.biosensesignal.com/camera_preview_view"
    private var cameraPreview: BiosenseSignalCameraPreview? = null
    private var imageDataSource: ImageDataSource? = null

    override fun create(context: Context, viewId: Int, args: Any?): PlatformView {
        return BiosenseSignalCameraPreview(context).also {
            cameraPreview = it
            cameraPreview?.setDataSource(imageDataSource ?: return@also)
        }
    }

    fun setDataSource(imageDataSource: ImageDataSource) {
        this.imageDataSource = imageDataSource
        cameraPreview?.setDataSource(imageDataSource)
    }
}