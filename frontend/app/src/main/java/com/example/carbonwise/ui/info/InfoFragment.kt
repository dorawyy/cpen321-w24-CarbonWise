package com.example.carbonwise.ui.info

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Bundle
import android.util.Base64
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import com.example.carbonwise.databinding.FragmentInfoBinding
import okhttp3.*
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

class InfoFragment : Fragment() {

    private var _binding: FragmentInfoBinding? = null
    private val binding get() = _binding!!

    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Log.d("InfoFragment", "onCreateView: InfoFragment is being created")
        _binding = FragmentInfoBinding.inflate(inflater, container, false)

        // Initially show loading
        binding.progressBar.visibility = View.VISIBLE
        binding.bottomSection.visibility = View.GONE
        binding.topSection.visibility = View.GONE
        binding.centerImage.visibility = View.GONE

        val upcCode = arguments?.getString("upcCode") ?: ""
        if (upcCode.isNotEmpty()) {
            Log.d("InfoFragment", "Fetching data for UPC: $upcCode")
            fetchProductInfo(upcCode)
        }

        return binding.root
    }

    private fun fetchProductInfo(upcCode: String, retryCount: Int = 3) {
        val url = "https://api.cpen321-jelx.com/products/$upcCode"
        val request = Request.Builder().url(url).build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                if (retryCount > 0) {
                    Log.e("InfoFragment", "API request failed, retrying... ($retryCount left)")
                    fetchProductInfo(upcCode, retryCount - 1)
                } else {
                    Log.e("InfoFragment", "API request failed after retries", e)
                    binding.progressBar.visibility = View.GONE
                }
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (!response.isSuccessful) {
                        Log.e("InfoFragment", "Unexpected response: ${response.code()}")
                        return
                    }

                    val responseBody = response.body()?.string()
                    if (responseBody != null) {
                        try {
                            val json = JSONObject(responseBody)
                            requireActivity().runOnUiThread {
                                updateUI(json)
                            }
                        } catch (e: Exception) {
                            Log.e("InfoFragment", "Error parsing JSON", e)
                        }
                    }
                }
            }
        })
    }

    private fun updateUI(json: JSONObject) {
        binding.progressBar.visibility = View.GONE
        binding.bottomSection.visibility = View.VISIBLE
        binding.topSection.visibility = View.VISIBLE
        binding.centerImage.visibility = View.VISIBLE

        val product = json.optJSONObject("product") ?: return
        val productName = product.optString("product_name", "Unknown Product")
        val ecoScore = product.optInt("ecoscore_score", -1)
        val ecoGrade = product.optString("ecoscore_grade", "N/A").uppercase()
        val agribalyse = product.optJSONObject("ecoscore_data")?.optJSONObject("agribalyse")
        val imageBase64 = product.optString("image", "")

        updateProductName(productName)
        updateEcoScore(ecoScore, ecoGrade)
        updateCo2Info(agribalyse)
        updateIngredientList(product.optJSONArray("categories_tags"))
        updateProductImage(imageBase64)
    }

    private fun updateProductName(name: String?) {
        binding.productNameText.text = name ?: "Unknown Product"
    }

    private fun updateEcoScore(score: Int, grade: String) {
        binding.ecoScoreText.text = "Eco Score: $grade ($score)"

        val colorResId = when {
            score >= 75 -> android.R.color.holo_green_light
            score >= 50 -> android.R.color.holo_orange_light
            else -> android.R.color.holo_red_light
        }
        val color = ContextCompat.getColor(requireContext(), colorResId)
        binding.ecoScoreProgress.setIndicatorColor(color)
        binding.ecoScoreProgress.setProgress(score, true)
    }

    private fun updateCo2Info(agribalyse: JSONObject?) {
        fun formatCo2(value: Double?): String {
            return if (value != null) String.format("%.2f kg CO₂e", value) else "N/A"
        }

        binding.co2Total.text = "Total CO₂: " + formatCo2(agribalyse?.optDouble("co2_total"))
        binding.co2Agriculture.text = "Agriculture: " + formatCo2(agribalyse?.optDouble("co2_agriculture"))
        binding.co2Packaging.text = "Packaging: " + formatCo2(agribalyse?.optDouble("co2_packaging"))
        binding.co2Transport.text = "Transport: " + formatCo2(agribalyse?.optDouble("co2_transportation"))
        binding.co2Processing.text = "Processing: " + formatCo2(agribalyse?.optDouble("co2_processing"))
    }

    private fun updateIngredientList(categories: org.json.JSONArray?) {
        val container = binding.ingredientListContainer
        container.removeAllViews()

        if (categories == null || categories.length() == 0) {
            val noIngredientsTextView = TextView(requireContext()).apply {
                text = "No ingredient data available"
                textSize = 16f
                setTextColor(ContextCompat.getColor(requireContext(), android.R.color.black))
            }
            container.addView(noIngredientsTextView)
        } else {
            for (i in 0 until categories.length()) {
                val ingredient = categories.getString(i)
                val itemLayout = LinearLayout(requireContext()).apply {
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        setMargins(0, 8, 0, 8)
                    }
                    orientation = LinearLayout.HORIZONTAL
                    gravity = android.view.Gravity.CENTER_VERTICAL
                }

                val ingredientTextView = TextView(requireContext()).apply {
                    text = ingredient.replace("en:", "").replace("-", " ").capitalize()
                    textSize = 16f
                    setTextColor(ContextCompat.getColor(requireContext(), android.R.color.holo_blue_dark))
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        marginStart = 8
                    }
                }

                itemLayout.addView(ingredientTextView)
                container.addView(itemLayout)
            }
        }
    }

    private fun updateProductImage(imageBase64: String) {
        if (imageBase64.isNotEmpty()) {
            try {
                val decodedBytes = Base64.decode(imageBase64, Base64.DEFAULT)
                val bitmap: Bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
                binding.centerImage.setImageBitmap(bitmap)
            } catch (e: IllegalArgumentException) {
                Log.e("InfoFragment", "Failed to decode base64 image", e)
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
