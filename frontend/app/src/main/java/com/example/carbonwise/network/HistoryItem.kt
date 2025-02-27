package com.example.carbonwise.network

import com.google.gson.annotations.SerializedName

data class HistoryItem(
    val _id: String?,
    val uuid: String?,
    val ecoscore_score: Int?,
    val products: List<ProductItem>
)

data class ProductItem(
    val product_id: String?,
    val timestamp: String?,
    @SerializedName("product")
    val product: ProductDetails
)

data class ProductDetails(
    @SerializedName("_id")
    val productId: String?,
    @SerializedName("product_name")
    val productName: String?,
    @SerializedName("image")
    val productImage: String?
)

data class AddToHistoryRequest(
    val product_id: String
)
