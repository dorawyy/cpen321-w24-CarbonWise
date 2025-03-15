package com.example.carbonwise.network

import retrofit2.Call
import retrofit2.http.*

interface FriendsApiService {

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

    @GET("friends/ecoscore_score/{user_uuid}")
    fun getFriendEcoscore(
        @Header("token") token: String,
        @Path("user_uuid") friendUuid: String,
        ): Call<EcoscoreResponse>

    // This endpoint is only used in friends components, so it is included here
    @GET("users/uuid")
    fun getUUID(
        @Header("token") token: String
    ): Call<UUIDResponse>
}
