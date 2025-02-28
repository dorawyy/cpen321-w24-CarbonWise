package com.example.carbonwise.network

import retrofit2.Call
import retrofit2.http.*

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

    // Get own uuid
    @GET("users/uuid")
    fun getUUID(
        @Header("token") token: String
    ): Call<UUIDResponse>

    // Get friend list
    @GET("friends")
    fun getFriends(
        @Header("token") token: String
    ): Call<List<Friend>>

    // Get friend requests
    @GET("friends/requests")
    fun getFriendRequests(
        @Header("token") token: String
    ): Call<List<FriendRequest>>

    // Send a friend request
    @POST("friends/requests")
    @Headers("Content-Type: application/json")
    fun sendFriendRequest(
        @Header("token") token: String,
        @Body request: FriendRequestBody
    ): Call<Void>

    // Accept a friend request
    @POST("friends/requests/accept")
    @Headers("Content-Type: application/json")
    fun acceptFriendRequest(
        @Header("token") token: String,
        @Body request: FriendRequestBody
    ): Call<Void>

    // Remove a friend
    @DELETE("friends")
    fun removeFriend(
        @Header("token") token: String,
        @Query("user_uuid") userUuid: String
    ): Call<Void>

    // Reject a friend request
    @DELETE("friends/requests")
    fun rejectFriendRequest(
        @Header("token") token: String,
        @Query("user_uuid") userUuid: String
    ): Call<Void>

    // Send product notification to a friend
    @POST("friends/notifications")
    @Headers("Content-Type: application/json")
    fun sendProductNotification(
        @Header("token") token: String,
        @Body request: ProductNotificationRequest
    ): Call<Void>

    @GET("friends/history/{user_uuid}")
    fun getFriendHistoryByUUID(
        @Header("token") token: String,
        @Path("user_uuid") friendUuid: String,
        @Query("timestamp") timestamp: String? = null,
        @Query("fetch_product_details") fetchProductDetails: Boolean = true
    ): Call<List<HistoryItem>>

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

    @GET("friends/ecoscore_score/{user_uuid}")
    fun getFriendEcoscore(
        @Header("token") token: String,
        @Path("user_uuid") friendUuid: String,
        ): Call<EcoscoreResponse>


}
