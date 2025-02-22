package com.example.carbonwise.ui.scan

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.OptIn
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
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
    private var lastScannedResult: String? = null
    private var isDialogDisplayed = false
    private var isScanningLocked = false
    private var camera: Camera? = null
    private var isFlashOn = false

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        Log.d("ScanFragment", "onCreateView: ScanFragment is being created")
        _binding = FragmentScanBinding.inflate(inflater, container, false)

        val options = BarcodeScannerOptions.Builder()
            .setBarcodeFormats(Barcode.FORMAT_ALL_FORMATS)
            .build()

        barcodeScanner = BarcodeScanning.getClient(options)
        cameraExecutor = Executors.newSingleThreadExecutor()

        requestCameraPermission()
        binding.buttonFlash.setOnClickListener { toggleFlash() }

        return binding.root
    }

    override fun onResume() {
        super.onResume()
        resetScanner()
        startCamera()
    }

    private fun resetScanner() {
        lastScannedResult = null
        isDialogDisplayed = false
        isScanningLocked = false
        binding.textScan.text = "Waiting for scan..."
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
            cameraProvider.unbindAll()

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
                camera = cameraProvider.bindToLifecycle(
                    viewLifecycleOwner, cameraSelector, preview, imageAnalysis
                )

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
                it.cameraControl.enableTorch(isFlashOn)
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
                for (barcode in barcodes) {
                    var rawValue = barcode.rawValue
                    if (rawValue != null) {
                        if (rawValue.length == 12) {
                            rawValue = "0$rawValue"
                        }

                        if (rawValue != lastScannedResult) {
                            lastScannedResult = rawValue
                            binding.textScan.text = "Scanned: $rawValue"
                            showConfirmationDialog(rawValue)
                        }
                    }
                }
            }
            .addOnFailureListener {
                Log.e("Barcode", "Scanning failed", it)
            }
            .addOnCompleteListener {
                imageProxy.close()
            }
    }

    private fun showConfirmationDialog(barcode: String) {
        if (isDialogDisplayed) return

        isDialogDisplayed = true

        activity?.let {
            val builder = android.app.AlertDialog.Builder(it)
            builder.setTitle("Confirm Scan")
            builder.setMessage("Scan result: $barcode\nDo you want to proceed?")

            builder.setPositiveButton("Accept") { _, _ ->
                isDialogDisplayed = false
                isScanningLocked = false
                val action = ScanFragmentDirections.actionScanFragmentToInfoFragment(barcode)
                Log.d("ScanFragment", "Navigating to InfoFragment with barcode: $barcode")
                findNavController().navigate(action)
            }

            builder.setNegativeButton("Cancel") { dialog, _ ->
                isDialogDisplayed = false
                isScanningLocked = false
                lastScannedResult = null
                dialog.dismiss()
            }

            builder.setOnDismissListener {
                isDialogDisplayed = false
                isScanningLocked = false
                lastScannedResult = null
            }

            val dialog = builder.create()
            dialog.show()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
        cameraExecutor.shutdown()
    }
}
