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
import android.widget.EditText
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.OptIn
import androidx.appcompat.app.AlertDialog
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.bumptech.glide.Glide
import com.example.carbonwise.databinding.FragmentScanBinding
import com.google.common.util.concurrent.ListenableFuture
import com.google.mlkit.vision.barcode.BarcodeScanner
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

data class Product(
    val product_name: String?,
    val nutriscore_grade: String?, // A to E
    val nova_group: Int?, // 1 to 4
    val ecoscore_grade: String?, // A to E (Green Score)
    val environment_impact_level: String?, // keeping it for now
    val image_url: String?
)

data class ProductResponse(
    val status: Int, // Open Food Facts uses status
    val product: Product?
)

interface ProductApi {
    @GET("{id}.json")
    suspend fun getProduct(@Path("id") id: String): ProductResponse
}

// manual search via Open Food Facts
data class SearchProduct(
    val code: String?,
    val product_name: String?,
    val image_front_small_url: String?
)

data class SearchResponse(
    val count: Int,
    val products: List<SearchProduct>
)

interface SearchApi {
    @GET("cgi/search.pl")
    suspend fun searchProducts(
        @Query("search_terms") searchTerms: String,
        @Query("search_simple") searchSimple: Int = 1,
        @Query("action") action: String = "process",
        @Query("json") json: Int = 1
    ): SearchResponse
}

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

    private val productApi by lazy {
        Retrofit.Builder()
            .baseUrl("https://world.openfoodfacts.org/api/v0/product/")  // temporarily using the Open Food Facts API
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ProductApi::class.java)
    }

    private val searchApi by lazy {
        Retrofit.Builder()
            .baseUrl("https://world.openfoodfacts.org/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(SearchApi::class.java)
    }

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

        binding.buttonManualSearch.setOnClickListener {
            showManualSearchDialog()
        }

        binding.buttonCloseProductInfo.setOnClickListener {
            binding.productInfoLayout.visibility = View.GONE
        }

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
                val localBinding = _binding ?: return@addOnSuccessListener
                val rects = mutableListOf<Rect>()
                for (barcode in barcodes) {
                    val rawValue = barcode.rawValue
                    if (rawValue != null && rawValue != lastScannedResult) {
                        lastScannedResult = rawValue
                        localBinding.textScan.text = "Scanned: $rawValue"
                        Toast.makeText(requireContext(), "Scanned: $rawValue", Toast.LENGTH_SHORT).show()
                        fetchAndDisplayProductInfo(rawValue)
                    }
                    barcode.boundingBox?.let { boundingBox ->
                        val transformedBox = transformRectToView(boundingBox, imageProxy)
                        rects.add(transformedBox)
                    }
                }
                localBinding.barcodeOverlay.setBarcodeRects(rects)
                clearOverlayRunnable?.let { handler.removeCallbacks(it) }
                clearOverlayRunnable = Runnable { localBinding.barcodeOverlay.setBarcodeRects(emptyList()) }
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

    // fetch product info from either Backend or OpenFoodFacts (can be changed later)
    private fun fetchAndDisplayProductInfo(productId: String) {
        if (_binding == null) return
        binding.productInfoLayout.visibility = View.VISIBLE
        binding.textProductName.text = "Loading..."
        binding.textEnvironmentalScore.text = ""

        viewLifecycleOwner.lifecycleScope.launch(Dispatchers.IO) {
            try {
                val response = productApi.getProduct(productId)

                withContext(Dispatchers.Main) {
                    // Capture a local binding instance
                    val localBinding = _binding ?: return@withContext

                    if (response.status == 1 && response.product != null) {
                        val product = response.product
                        localBinding.textProductName.text = product.product_name ?: "Unknown Product"
                        localBinding.textNutriScore.text = "Nutri-Score: ${product.nutriscore_grade?.uppercase() ?: "N/A"}"
                        localBinding.textNovaGroup.text = "NOVA Group: ${product.nova_group ?: "N/A"}"
                        localBinding.textEcoScore.text = "Green Score: ${product.ecoscore_grade?.uppercase() ?: "N/A"}"
                        localBinding.textEnvironmentalImpact.text = "Impact: ${product.environment_impact_level ?: "N/A"}"

                        if (!product.image_url.isNullOrEmpty()) {
                            localBinding.imageProduct.visibility = View.VISIBLE
                            Glide.with(this@ScanFragment).load(product.image_url).into(localBinding.imageProduct)
                        } else {
                            localBinding.imageProduct.visibility = View.GONE
                        }
                    } else {
                        localBinding.textProductName.text = "Product not found"
                        localBinding.textEnvironmentalScore.text = ""
                        localBinding.imageProduct.visibility = View.GONE
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                withContext(Dispatchers.Main) {
                    binding.textProductName.text = "Error fetching product"
                    binding.textEnvironmentalScore.text = ""
                    binding.imageProduct.visibility = View.GONE
                }
            }
        }
    }

    // manual search button dialog
    private fun showManualSearchDialog() {
        val builder = AlertDialog.Builder(requireContext())
        builder.setTitle("Search Products")
        val input = EditText(requireContext())
        input.hint = "Enter product name, e.g., chocolate"
        builder.setView(input)
        builder.setPositiveButton("Search") { dialog, which ->
            val query = input.text.toString().trim()
            if (query.isNotEmpty()) {
                performManualSearch(query)
            }
        }
        builder.setNegativeButton("Cancel") { dialog, which ->
            dialog.cancel()
        }
        builder.show()
    }

    // manual search using Open Food Facts
    private fun performManualSearch(query: String) {
        Toast.makeText(requireContext(), "Searching for \"$query\"...", Toast.LENGTH_SHORT).show()
        viewLifecycleOwner.lifecycleScope.launch(Dispatchers.IO) {
            try {
                val searchResponse = searchApi.searchProducts(query)
                withContext(Dispatchers.Main) {
                    if (searchResponse.count > 0 && searchResponse.products.isNotEmpty()) {
                        showSearchResultsDialog(searchResponse.products)
                    } else {
                        Toast.makeText(requireContext(), "No products found", Toast.LENGTH_SHORT).show()
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                withContext(Dispatchers.Main) {
                    Toast.makeText(requireContext(), "Error searching products", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    // show search results in a dialog
    private fun showSearchResultsDialog(products: List<SearchProduct>) {
        val productNames = products.map { it.product_name ?: it.code ?: "Unknown Product" }.toTypedArray()
        val builder = AlertDialog.Builder(requireContext())
        builder.setTitle("Search Results")
        builder.setItems(productNames) { dialog, which ->
            // when a product is clicked, use its barcode (code) to fetch product info
            val selectedProduct = products[which]
            val productCode = selectedProduct.code
            if (productCode != null) {
                fetchAndDisplayProductInfo(productCode)
            } else {
                Toast.makeText(requireContext(), "Selected product has no code", Toast.LENGTH_SHORT).show()
            }
        }
        builder.setNegativeButton("Cancel") { dialog, which -> dialog.dismiss() }
        builder.show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
        cameraExecutor.shutdown()
    }
}
