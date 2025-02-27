package com.example.carbonwise.ui.history

import android.content.Context
import android.util.Log
import com.example.carbonwise.MainActivity
import com.example.carbonwise.network.ApiService
import com.example.carbonwise.network.HistoryItem
import com.example.carbonwise.network.ProductItem
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import retrofit2.*
import retrofit2.converter.gson.GsonConverterFactory

object HistoryCacheManager {
    private const val CACHE_PREFS = "history_cache"
    private const val CACHE_KEY = "history_data"
    private const val TIMESTAMP_KEY = "last_fetched"
    private const val CACHE_EXPIRY = 3600000L // 1 hour cache expiry

    /** Invalidates cache and triggers an immediate fetch */
    fun invalidateCache(context: Context) {
        val sharedPreferences = context.getSharedPreferences(CACHE_PREFS, Context.MODE_PRIVATE)
        sharedPreferences.edit().remove(CACHE_KEY).remove(TIMESTAMP_KEY).apply()
        fetchHistoryInBackground(context) // Fetch new data immediately
    }

    /** Fetch history from API and store in cache */
    fun fetchHistoryInBackground(context: Context) {
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
                    }
                }
            }

            override fun onFailure(call: Call<List<HistoryItem>>, t: Throwable) {
                Log.e("HistoryCacheManager", "Background fetch failed: ${t.message}")
            }
        })
    }

    /** Saves history list to shared preferences */
    private fun saveHistoryToCache(context: Context, productItems: List<ProductItem>) {
        val sharedPreferences = context.getSharedPreferences(CACHE_PREFS, Context.MODE_PRIVATE)
        sharedPreferences.edit()
            .putString(CACHE_KEY, Gson().toJson(productItems))
            .putLong(TIMESTAMP_KEY, System.currentTimeMillis())
            .apply()
    }

    /** Checks if the cache is still valid */
    fun isCacheValid(context: Context): Boolean {
        val sharedPreferences = context.getSharedPreferences(CACHE_PREFS, Context.MODE_PRIVATE)
        return (System.currentTimeMillis() - sharedPreferences.getLong(TIMESTAMP_KEY, 0)) <= CACHE_EXPIRY
    }

    /** Loads history from cache and returns a flattened product list */
    fun loadHistoryFromCache(context: Context): List<ProductItem>? {
        val sharedPreferences = context.getSharedPreferences(CACHE_PREFS, Context.MODE_PRIVATE)
        val jsonHistory = sharedPreferences.getString(CACHE_KEY, null) ?: return null
        return Gson().fromJson(jsonHistory, object : TypeToken<List<ProductItem>>() {}.type)
    }

    /** Helper function to flatten HistoryItems into ProductItems */
    private fun flattenHistoryItems(historyItems: List<HistoryItem>): List<ProductItem> {
        return historyItems.flatMap { it.products }
    }
}
