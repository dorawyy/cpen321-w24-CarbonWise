package com.example.carbonwise.network

data class Friend(
    val user_uuid: String,
    val name: String
)

data class FriendRequest(
    val name: String,
    val user_uuid: String,
    val sent_at: String,
    var isOutgoing: Boolean = false
)

data class FriendRequestBody(
    val user_uuid: String
)

data class ProductNotificationRequest(
    val user_uuid: String,
    val scan_uuid: String,
    val message_type: String
)

data class UUIDResponse(val user_uuid: String)

data class ApiResponse(val message: String)