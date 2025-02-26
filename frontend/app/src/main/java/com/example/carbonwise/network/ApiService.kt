package com.example.carbonwise.network

import retrofit2.Call
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Headers
import retrofit2.http.POST
import retrofit2.http.Query

interface ApiService {
    @GET("users/history")
    fun getHistory(
        @Header("token") token: String,
        @Query("fetch_product_details") fetchProductDetails: Boolean = true
    ): Call<List<HistoryItem>>

    @POST("users/history")
    @Headers("Content-Type: application/json")
    fun addToHistory(
        @Header("token") token: String,
        @Body requestBody: AddToHistoryRequest
    ): Call<Void>
}
