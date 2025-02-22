package com.example.carbonwise.ui.scan

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Rect
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.OptIn
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import com.example.carbonwise.databinding.FragmentScanBinding
import com.google.common.util.concurrent.ListenableFuture
import com.google.mlkit.vision.barcode.BarcodeScanner
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class ScanFragment : Fragment() {

    private var _binding: FragmentScanBinding? = null
    private val binding get() = _binding!!

    private lateinit var cameraExecutor: ExecutorService
    private lateinit var barcodeScanner: BarcodeScanner
    private var lastScannedResult: String = ""

    private var camera: Camera? = null
    private var isFlashOn = false

    private val overlayClearDelay: Long = 2000L // 2 seconds delay
    private val handler = Handler(Looper.getMainLooper())
    private var clearOverlayRunnable: Runnable? = null

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentScanBinding.inflate(inflater, container, false)

        // Configure Barcode Scanner with all formats
        val options = BarcodeScannerOptions.Builder()
            .setBarcodeFormats(Barcode.FORMAT_ALL_FORMATS)
            .build()

        barcodeScanner = BarcodeScanning.getClient(options)
        cameraExecutor = Executors.newSingleThreadExecutor()

        requestCameraPermission()

        // Set up flash button
        binding.buttonFlash.setOnClickListener { toggleFlash() }

        return binding.root
    }

    private fun requestCameraPermission() {
        val permissionLauncher = registerForActivityResult(
            ActivityResultContracts.RequestPermission()
        ) { isGranted ->
            if (isGranted) {
                startCamera()
            } else {
                Toast.makeText(requireContext(), "Camera permission denied", Toast.LENGTH_SHORT).show()
            }
        }

        if (ContextCompat.checkSelfPermission(
                requireContext(), Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            startCamera()
        } else {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    private fun startCamera() {
        val cameraProviderFuture: ListenableFuture<ProcessCameraProvider> =
            ProcessCameraProvider.getInstance(requireContext())

        cameraProviderFuture.addListener({
            val cameraProvider: ProcessCameraProvider = cameraProviderFuture.get()

            val preview = Preview.Builder()
                .build()
                .also {
                    it.setSurfaceProvider(binding.previewView.surfaceProvider)
                }

            val imageAnalysis = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()

            imageAnalysis.setAnalyzer(cameraExecutor) { imageProxy ->
                processImageProxy(imageProxy)
            }

            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

            try {
                cameraProvider.unbindAll()
                camera = cameraProvider.bindToLifecycle(
                    viewLifecycleOwner, cameraSelector, preview, imageAnalysis
                )

                // Only show flash button if phone supports flash
                binding.buttonFlash.isEnabled = camera?.cameraInfo?.hasFlashUnit() == true

            } catch (exc: Exception) {
                Log.e("CameraX", "Use case binding failed", exc)
            }

        }, ContextCompat.getMainExecutor(requireContext()))
    }

    private fun toggleFlash() {
        camera?.let {
            val flashEnabled = it.cameraInfo.hasFlashUnit()
            if (flashEnabled) {
                isFlashOn = !isFlashOn
                it.cameraControl.enableTorch(isFlashOn) // Turn flash on/off
                updateFlashButtonUI()
            } else {
                Toast.makeText(requireContext(), "Flash not available", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun updateFlashButtonUI() {
        binding.buttonFlash.text = if (isFlashOn) "Turn Flash Off" else "Turn Flash On"
    }

    @OptIn(ExperimentalGetImage::class)
    private fun processImageProxy(imageProxy: ImageProxy) {
        val mediaImage = imageProxy.image ?: return
        val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)

        barcodeScanner.process(image)
            .addOnSuccessListener { barcodes ->
                val rects = mutableListOf<Rect>()
                for (barcode in barcodes) {
                    val rawValue = barcode.rawValue
                    if (rawValue != null && rawValue != lastScannedResult) {
                        lastScannedResult = rawValue
                        binding.textScan.text = "Scanned: $rawValue"
                        Toast.makeText(requireContext(), "Scanned: $rawValue", Toast.LENGTH_SHORT).show()
                    }
                    barcode.boundingBox?.let { boundingBox ->
                        val transformedBox = transformRectToView(boundingBox, imageProxy)
                        rects.add(transformedBox)
                    }
                }

                binding.barcodeOverlay.setBarcodeRects(rects)

                clearOverlayRunnable?.let { handler.removeCallbacks(it) }
                clearOverlayRunnable = Runnable { binding.barcodeOverlay.setBarcodeRects(emptyList()) }
                handler.postDelayed(clearOverlayRunnable!!, overlayClearDelay)
            }
            .addOnFailureListener {
                Log.e("Barcode", "Scanning failed", it)
            }
            .addOnCompleteListener {
                imageProxy.close()
            }
    }

    private fun transformRectToView(rect: Rect, imageProxy: ImageProxy): Rect {
        val imageWidth = imageProxy.width.toFloat()
        val imageHeight = imageProxy.height.toFloat()

        val viewWidth = binding.previewView.width.toFloat()
        val viewHeight = binding.previewView.height.toFloat()

        val scale = maxOf(viewWidth / imageWidth, viewHeight / imageHeight)

        val scaledWidth = imageWidth * scale
        val scaledHeight = imageHeight * scale

        val dx = ((viewWidth - scaledWidth) / 2) + (scaledWidth/8)
        val dy = ((viewHeight - scaledHeight) / 2) - (scaledHeight/8)

        return Rect(
            (dx + rect.left * scale).toInt(),
            (dy + rect.top * scale).toInt(),
            (dx + rect.right * scale).toInt(),
            (dy + rect.bottom * scale).toInt()
        )
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
        cameraExecutor.shutdown()
    }
}
