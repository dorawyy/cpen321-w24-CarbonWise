package com.example.carbonwise.ui.history

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.example.carbonwise.network.ApiService
import com.example.carbonwise.network.ProductItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.io.IOException

class HistoryViewModel(application: Application) : AndroidViewModel(application) {

    private val _historyItems = MutableLiveData<List<ProductItem>>()
    val historyItems: LiveData<List<ProductItem>> get() = _historyItems

    private val _ecoScore = MutableLiveData<Double>()
    val ecoScore: LiveData<Double> get() = _ecoScore

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> get() = _isLoading

    private val retrofit = Retrofit.Builder()
        .baseUrl("https://api.cpen321-jelx.com/")
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    private val apiService = retrofit.create(ApiService::class.java)

    fun fetchEcoScore(token: String, forceRefresh: Boolean = false) {
        if (!forceRefresh && _ecoScore.value != null) return
        Log.d("HistoryViewModel", "Fetching ecoScore")
        viewModelScope.launch(Dispatchers.IO) {
            try {
                val response = apiService.getScore(token).execute()
                if (response.isSuccessful) {
                    response.body()?.let { ecoScoreResponse ->
                        _ecoScore.postValue(ecoScoreResponse.ecoscoreScore)
                    }
                } else {
                    _ecoScore.postValue(0.0)
                }
            } catch (e: IOException) {
                Log.e("HistoryViewModel", "Error fetching ecoScore", e)
            }
        }
    }


    fun fetchHistory(token: String, forceRefresh: Boolean = false) {
        if (!forceRefresh && _historyItems.value != null) return
        Log.d("HistoryViewModel", "Fetching history")
        _isLoading.postValue(true)
        viewModelScope.launch(Dispatchers.IO) {
            try {
                val response = apiService.getHistory(token).execute()
                if (response.isSuccessful) {
                    response.body()?.let { historyList ->
                        _historyItems.postValue(historyList.flatMap { it.products })
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                _isLoading.postValue(false)
            }
        }
    }

    fun removeHistoryItem(token: String, scanUuid: String) {
        viewModelScope.launch(Dispatchers.IO) {
            try {
                val response = apiService.deleteFromHistory(token, scanUuid).execute()
                if (response.isSuccessful) {
                    _historyItems.postValue(_historyItems.value?.filterNot { it.scan_uuid == scanUuid })
                    fetchEcoScore(token, true)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
