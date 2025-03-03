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
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import com.example.carbonwise.network.ApiService
import com.example.carbonwise.network.AddToHistoryRequest
import com.example.carbonwise.MainActivity
import com.example.carbonwise.ui.history.HistoryCacheManager
import com.example.carbonwise.R

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
    }

    private fun requestCameraPermission() {
        val permissionLauncher = registerForActivityResult(
            ActivityResultContracts.RequestPermission()
        ) { isGranted ->
            if (isGranted) {
                startCamera()
            } else {
                showPermissionDeniedMessage()
            }
        }

        if (ContextCompat.checkSelfPermission(
                requireContext(), Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            startCamera()
        } else {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    private fun showPermissionDeniedMessage() {
        if (_binding == null) return
        binding.previewView.visibility = View.GONE
        binding.barcodeOverlay.visibility = View.GONE
        binding.barcodeBox.visibility = View.GONE
        binding.buttonFlash.visibility = View.GONE
        binding.textScan.visibility = View.VISIBLE
        binding.textScan.text = "Camera permission is required to scan barcodes. Please enable it in Settings."
    }



    private fun startCamera() {
        if (!isAdded || _binding == null) return

        val cameraProviderFuture: ListenableFuture<ProcessCameraProvider> =
            ProcessCameraProvider.getInstance(requireContext())

        cameraProviderFuture.addListener({
            if (!isAdded || _binding == null) return@addListener

            val cameraProvider: ProcessCameraProvider = cameraProviderFuture.get()
            cameraProvider.unbindAll()

            val preview = Preview.Builder()
                .build()
                .also {
                    _binding?.previewView?.surfaceProvider?.let { provider ->
                        it.setSurfaceProvider(provider)
                    }
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

                _binding?.buttonFlash?.isEnabled = camera?.cameraInfo?.hasFlashUnit() == true

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
        if (!isAdded || _binding == null) {
            imageProxy.close()
            return
        }

        val mediaImage = imageProxy.image ?: return
        val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)

        barcodeScanner.process(image)
            .addOnSuccessListener { barcodes ->
                if (!isAdded || _binding == null) return@addOnSuccessListener

                for (barcode in barcodes) {
                    var rawValue = barcode.rawValue
                    if (rawValue != null) {
                        if (rawValue.length == 12) {
                            rawValue = "0$rawValue"
                        }

                        if (rawValue != lastScannedResult && !isScanningLocked) {
                            isScanningLocked = true
                            lastScannedResult = rawValue

                            _binding?.textScan?.text = "Scanned: $rawValue"
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
        if (!isAdded || isDialogDisplayed || _binding == null) return

        isDialogDisplayed = true

        activity?.let {
            val builder = android.app.AlertDialog.Builder(it)
            builder.setTitle("Confirm Scan")
            builder.setMessage("Scan result: $barcode\nDo you want to proceed?")

            builder.setPositiveButton("Accept") { _, _ ->
                addToHistory(barcode)

                binding?.let {
                    if (findNavController().currentDestination?.id == R.id.navigation_scan) {
                        val action = ScanFragmentDirections.actionScanFragmentToInfoFragment(barcode)
                        findNavController().navigate(action)
                    }
                } ?: Log.w("ScanFragment", "Binding is null, skipping navigation")

                isDialogDisplayed = false
                isScanningLocked = false
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

    private fun addToHistory(barcode: String) {
        val token = MainActivity.getJWTToken(requireContext())
        if (token.isNullOrEmpty()) {
            return
        }

        val requestBody = AddToHistoryRequest(barcode)

        // Initialize Retrofit instance
        val retrofit = Retrofit.Builder()
            .baseUrl("https://api.cpen321-jelx.com/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        val apiService = retrofit.create(ApiService::class.java)

        // Call the addToHistory API
        val call = apiService.addToHistory(token, requestBody)
        call.enqueue(object : Callback<Void> {
            override fun onResponse(call: Call<Void>, response: Response<Void>) {
                if (response.isSuccessful) {
                    HistoryCacheManager.invalidateCache(requireContext())
                }
            }

            override fun onFailure(call: Call<Void>, t: Throwable) {
                Toast.makeText(requireContext(), "Error: ${t.message}", Toast.LENGTH_SHORT).show()
            }
        })
    }


    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
        cameraExecutor.shutdown()
    }
}
