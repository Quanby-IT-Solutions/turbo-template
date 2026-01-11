package com.biosensesignal.flutter_sdk

import android.content.Context
import android.util.AttributeSet
import android.view.TextureView
import android.view.View
import io.flutter.plugin.platform.PlatformView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach

class BiosenseSignalCameraPreview: TextureView, PlatformView {

    private var imageDataSource: ImageDataSource? = null
    private var disposed: Boolean = false

    constructor(context: Context): super(context)
    constructor(context: Context, attributeSet: AttributeSet): super(context, attributeSet)
    constructor(context: Context, attributeSet: AttributeSet, defStyleAttr: Int): super(context, attributeSet, defStyleAttr)
    constructor(context: Context, attributeSet: AttributeSet, defStyleAttr: Int, defStyleRes: Int): super(context, attributeSet, defStyleAttr, defStyleRes)

    override fun getView(): View {
        return this;
    }

    override fun dispose() {
        disposed = true
    }

    fun setDataSource(imageDataSource: ImageDataSource) {
        this.imageDataSource = imageDataSource
        this.imageDataSource?.images
            ?.takeUnless { disposed }
            ?.onEach { imageData ->
                drawBitmap(imageData.image)
            }
            ?.launchIn(CoroutineScope(Dispatchers.Main))
    }
}