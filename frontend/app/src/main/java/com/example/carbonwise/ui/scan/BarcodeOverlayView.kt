package com.example.carbonwise.ui.scan

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.util.AttributeSet
import android.view.View

class BarcodeOverlayView @JvmOverloads constructor(
    context: Context, attrs: AttributeSet? = null
) : View(context, attrs) {

    // barcode bounding boxes to draw
    private var barcodeRects: List<Rect> = emptyList()

    private val paint = Paint().apply {
        style = Paint.Style.STROKE
        strokeWidth = 4f
        color = Color.GREEN
    }

    fun setBarcodeRects(rects: List<Rect>) {
        barcodeRects = rects
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        for (rect in barcodeRects) {
            canvas.drawRect(rect, paint)
        }
    }

}