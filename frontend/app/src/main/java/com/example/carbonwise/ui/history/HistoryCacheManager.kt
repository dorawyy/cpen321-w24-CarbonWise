package com.example.carbonwise.ui.history

import android.content.Context
import android.graphics.BitmapFactory
import android.util.Log
import com.example.carbonwise.MainActivity
import com.example.carbonwise.network.ApiService
import com.example.carbonwise.network.HistoryItem
import com.example.carbonwise.network.ProductItem
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import retrofit2.*
import retrofit2.converter.gson.GsonConverterFactory

import android.graphics.Bitmap
import android.util.Base64
import java.io.ByteArrayOutputStream

object HistoryCacheManager {
    private const val CACHE_PREFS = "history_cache"
    private const val CACHE_KEY = "history_data"
    private const val TIMESTAMP_KEY = "last_fetched"
    private const val CACHE_EXPIRY = 3600000L

    fun invalidateCache(context: Context) {
        val sharedPreferences = context.getSharedPreferences(CACHE_PREFS, Context.MODE_PRIVATE)
        sharedPreferences.edit().remove(CACHE_KEY).remove(TIMESTAMP_KEY).apply()
        fetchHistoryInBackground(context)
    }

    fun fetchHistoryInBackground(context: Context, onFetched: (() -> Unit)? = null) {
        val token = MainActivity.getJWTToken(context)
        if (token.isNullOrEmpty()) return

        val retrofit = Retrofit.Builder()
            .baseUrl("https://api.cpen321-jelx.com/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        val apiService = retrofit.create(ApiService::class.java)
        val call = apiService.getHistory(token, fetchProductDetails = true)

        call.enqueue(object : Callback<List<HistoryItem>> {
            override fun onResponse(call: Call<List<HistoryItem>>, response: Response<List<HistoryItem>>) {
                if (response.isSuccessful) {
                    response.body()?.let {
                        val flattenedHistory = flattenHistoryItems(it)
                        saveHistoryToCache(context, flattenedHistory)
                        onFetched?.invoke()
                    }
                }
            }

            override fun onFailure(call: Call<List<HistoryItem>>, t: Throwable) {
                Log.e("HistoryCacheManager", "Background fetch failed: ${t.message}")
            }
        })
    }

    private fun saveHistoryToCache(context: Context, productItems: List<ProductItem>) {
        val sharedPreferences = context.getSharedPreferences(CACHE_PREFS, Context.MODE_PRIVATE)
        sharedPreferences.edit()
            .putString(CACHE_KEY, Gson().toJson(productItems))
            .putLong(TIMESTAMP_KEY, System.currentTimeMillis())
            .apply()
    }

    fun isCacheValid(context: Context): Boolean {
        val sharedPreferences = context.getSharedPreferences(CACHE_PREFS, Context.MODE_PRIVATE)
        return (System.currentTimeMillis() - sharedPreferences.getLong(TIMESTAMP_KEY, 0)) <= CACHE_EXPIRY
    }

    fun loadHistoryFromCache(context: Context): List<ProductItem>? {
        val sharedPreferences = context.getSharedPreferences(CACHE_PREFS, Context.MODE_PRIVATE)
        val jsonHistory = sharedPreferences.getString(CACHE_KEY, null) ?: return null
        return Gson().fromJson(jsonHistory, object : TypeToken<List<ProductItem>>() {}.type)
    }

    private fun flattenHistoryItems(historyItems: List<HistoryItem>): List<ProductItem> {
        return historyItems.flatMap { historyItem ->
            historyItem.products.map { productItem ->
                productItem.copy(
                    product = productItem.product.copy(
                        productImage = downscaleBase64Image(productItem.product.productImage)
                    )
                )
            }
        }
    }

    private fun downscaleBase64Image(base64String: String?, targetSize: Int = 100): String? {
        if (base64String.isNullOrEmpty()) return null

        return try {
            val decodedBytes = Base64.decode(base64String, Base64.DEFAULT)
            val originalBitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
            val scaledBitmap = Bitmap.createScaledBitmap(originalBitmap, targetSize, targetSize, true)
            val outputStream = ByteArrayOutputStream()
            scaledBitmap.compress(Bitmap.CompressFormat.JPEG, 30, outputStream)
            val byteArray = outputStream.toByteArray()
            Base64.encodeToString(byteArray, Base64.DEFAULT)
        } catch (e: Exception) {
            Log.e("HistoryCacheManager", "Image processing failed: ${e.message}")
            null
        }
    }

    fun removeFromCache(context: Context, scanUuid: String) {
        val sharedPreferences = context.getSharedPreferences(CACHE_PREFS, Context.MODE_PRIVATE)
        val jsonHistory = sharedPreferences.getString(CACHE_KEY, null) ?: return

        val productList: List<ProductItem> = Gson().fromJson(jsonHistory, object : TypeToken<List<ProductItem>>() {}.type)

        val updatedList = productList.filterNot { it.scan_uuid == scanUuid }

        sharedPreferences.edit()
            .putString(CACHE_KEY, Gson().toJson(updatedList))
            .putLong(TIMESTAMP_KEY, System.currentTimeMillis())
            .apply()
    }
}
