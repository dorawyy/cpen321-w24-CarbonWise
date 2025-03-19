package com.example.carbonwise.network

import retrofit2.Call
import retrofit2.http.*

interface UsersApiService {
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

    @POST("users/fcm_registration_token")
    @Headers("Content-Type: application/json")
    fun sendFCMToken(
        @Header("token") token: String,
        @Body request: FCMTokenRequest
    ): Call<Void>

    // Delete an item from user history
    @DELETE("users/history")
    fun deleteFromHistory(
        @Header("token") token: String,
        @Query("scan_uuid") scanUuid: String
    ): Call<Void>

    @GET("users/ecoscore_score")
    fun getScore(
        @Header("token") token: String
    ): Call<EcoscoreResponse>
}
