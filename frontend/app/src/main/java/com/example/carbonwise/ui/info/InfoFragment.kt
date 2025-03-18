package com.example.carbonwise.ui.info

import android.graphics.BitmapFactory
import android.os.Bundle
import android.util.Base64
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.carbonwise.MainActivity
import com.example.carbonwise.R
import com.example.carbonwise.databinding.FragmentInfoBinding
import com.example.carbonwise.network.AddToHistoryRequest
import com.example.carbonwise.network.UsersApiService
import com.example.carbonwise.ui.history.HistoryViewModel
import okhttp3.Call
import okhttp3.Callback
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import org.json.JSONObject
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.io.IOException
import java.util.concurrent.TimeUnit

class InfoFragment : Fragment() {

    private var _binding: FragmentInfoBinding? = null
    private val binding get() = _binding!!

    private val historyViewModel: HistoryViewModel by activityViewModels()

    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    companion object {
        private const val ARG_UPC_CODE = "upcCode"
        private const val SHOW_ADD_BUTTON = "showButton"

        fun newInstance(upcCode: String): InfoFragment {
            val fragment = InfoFragment()
            val args = Bundle()
            args.putString(ARG_UPC_CODE, upcCode)
            args.putBoolean(SHOW_ADD_BUTTON, false)
            fragment.arguments = args
            return fragment
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Log.d("InfoFragment", "onCreateView: InfoFragment is being created")
        _binding = FragmentInfoBinding.inflate(inflater, container, false)

        binding.progressBar.visibility = View.VISIBLE
        binding.bottomSection.visibility = View.GONE
        binding.topSection.visibility = View.GONE
        binding.centerImage.visibility = View.GONE

        val upcCode = arguments?.getString(ARG_UPC_CODE) ?: ""
        if (upcCode.isNotEmpty()) {
            Log.d("InfoFragment", "Fetching data for UPC: $upcCode")
            fetchProductInfo(upcCode)
        }

        val showButton = arguments?.getBoolean(SHOW_ADD_BUTTON, false) ?: false
        if (showButton) {
            binding.addToHistoryButton.visibility = View.VISIBLE
            binding.addToHistoryButton.setOnClickListener {
                addToHistory(upcCode)
                binding.addToHistoryButton.apply {
                    text = "Added to history!"
                    isEnabled = false
                    setBackgroundColor(ContextCompat.getColor(requireContext(), R.color.dark_green)) // Change to darker shade
                }
            }
        } else {
            binding.addToHistoryButton.visibility = View.GONE
        }

        return binding.root
    }

    private fun fetchProductInfo(upcCode: String, retryCount: Int = 1) {
        val jwtToken = MainActivity.getJWTToken(requireContext())

        val url = "https://api.cpen321-jelx.com/products/$upcCode?num_recommendations=3"

        val requestBuilder = Request.Builder().url(url)
        if (!jwtToken.isNullOrBlank()) {
            requestBuilder.addHeader("Authorization", "Bearer $jwtToken")
        }

        val request = requestBuilder.build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                if (retryCount > 0) {
                    Log.e("InfoFragment", "API request failed, retrying... ($retryCount left)")
                    fetchProductInfo(upcCode, retryCount - 1)
                } else {
                    Log.e("InfoFragment", "API request failed after retries", e)
                    activity?.runOnUiThread {
                        if (isAdded && _binding != null) {
                            binding.progressBar.visibility = View.GONE
                            Toast.makeText(context, "Network error, please try again later", Toast.LENGTH_LONG).show()
                        }
                    }
                }
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (!response.isSuccessful) {
                        Log.e("InfoFragment", "Unexpected response: ${response.code()}")

                        activity?.runOnUiThread {
                            if (isAdded && _binding != null) {
                                binding.progressBar.visibility = View.GONE
                                binding.errorText.visibility = View.VISIBLE

                                binding.errorText.text = when (response.code()) {
                                    404 -> "Product not found in our database.\nPlease try another product."
                                    else -> "Failed to load product info.\nPlease try again later."
                                }
                            }
                        }
                        return
                    }


                    val responseBody = response.body()?.string()
                    Log.d("InfoFragment", "Raw API Response: $responseBody")

                    if (responseBody != null) {
                        try {
                            val json = JSONObject(responseBody)
                            activity?.runOnUiThread {
                                if (isAdded && _binding != null) {
                                    updateUI(json)
                                }
                            }
                        } catch (e: IOException) {
                            Log.e("InfoFragment", "Error parsing JSON", e)
                            activity?.runOnUiThread {
                                if (isAdded && _binding != null) {
                                    binding.progressBar.visibility = View.GONE
                                    binding.errorText.visibility = View.VISIBLE
                                    binding.errorText.text = "Error processing product data."
                                }
                            }
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
        val categories = product.optJSONArray("categories_tags")

        updateProductName(productName)
        updateEcoScore(ecoScore, ecoGrade)
        updateCo2Info(agribalyse)
        updateIngredientList(categories)
        updateProductImage(imageBase64)

        val recommendations = json.optJSONArray("recommendations")
        if (recommendations != null) {
            val recommendationList = mutableListOf<Recommendation>()
            for (i in 0 until recommendations.length()) {
                val recommendationObj = recommendations.getJSONObject(i)
                val name = recommendationObj.optString("product_name", "Unknown Product")
                val score = recommendationObj.optInt("ecoscore_score", -1)
                val image = recommendationObj.optString("image", "")
                recommendationList.add(Recommendation(name, score, image))
            }

            val recommendationsAdapter = RecommendationsAdapter(recommendationList)
            binding.recommendationsRecyclerView.layoutManager =
                LinearLayoutManager(requireContext(), LinearLayoutManager.HORIZONTAL, false)
            binding.recommendationsRecyclerView.adapter = recommendationsAdapter
            binding.recommendationsWrapper.visibility = View.VISIBLE
        } else {
            binding.recommendationsWrapper.visibility = View.GONE
        }
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

    private fun updateProductImage(imageBase64: String) {
        if (imageBase64.isBlank()) {
            Log.e("InfoFragment", "Base64 string is empty or blank.")
            return
        }
        try {
            val decodedBytes = Base64.decode(imageBase64, Base64.DEFAULT)
            if (decodedBytes.isEmpty()) {
                Log.e("InfoFragment", "Decoded bytes are empty.")
            } else {
                val bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
                if (bitmap != null) {
                    binding.centerImage.setImageBitmap(bitmap)
                } else {
                    binding.centerImage.setImageResource(R.drawable.ic_placeholder)
                }
            }
        } catch (e: IllegalArgumentException) {
            Log.e("InfoFragment", "Failed to decode base64 image", e)
        }
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
                text = "No category data available"
                textSize = 16f
                setTextColor(ContextCompat.getColor(requireContext(), android.R.color.black))
            }
            container.addView(noIngredientsTextView)
        } else {
            for (i in 0 until categories.length()) {
                val ingredient = categories.getString(i)
                val ingredientTextView = TextView(requireContext()).apply {
                    text = ingredient.replace("en:", "").replace("-", " ").capitalize()
                    textSize = 16f
                    setTextColor(ContextCompat.getColor(requireContext(), android.R.color.holo_blue_dark))
                }
                container.addView(ingredientTextView)
            }
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

        val apiService = retrofit.create(UsersApiService::class.java)

        // Call the addToHistory API
        val call = apiService.addToHistory(token, requestBody)
        call.enqueue(object : retrofit2.Callback<Void> {
            override fun onResponse(call: retrofit2.Call<Void>, response: retrofit2.Response<Void>) {
                if (response.isSuccessful) {
                    historyViewModel.fetchHistory(token, forceRefresh = true)
                    historyViewModel.fetchEcoScore(token, forceRefresh = true)
                }
            }

            override fun onFailure(call: retrofit2.Call<Void>, t: Throwable) {
                Toast.makeText(requireContext(), "Error: ${t.message}", Toast.LENGTH_SHORT).show()
            }
        })
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
