package com.example.carbonwise.network

import android.content.Context
import android.util.Log
import retrofit2.*
import retrofit2.converter.gson.GsonConverterFactory

data class FCMTokenRequest(
    val fcm_registration_token: String
)

object FCMTokenManager {

    fun sendFCMTokenToBackend(context: Context, fcmToken: String) {
        val token = getJWTToken(context)
        if (token.isNullOrEmpty()) {
            Log.e("FCM", "JWT Token is missing. Cannot send FCM token.")
            return
        }

        val apiService = Retrofit.Builder()
            .baseUrl("https://api.cpen321-jelx.com/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(UsersApiService::class.java)

        val request = FCMTokenRequest(fcmToken)
        apiService.sendFCMToken(token, request).enqueue(object : Callback<Void> {
            override fun onResponse(call: Call<Void>, response: Response<Void>) {
                if (response.isSuccessful) {
                    Log.d("FCM", "FCM token successfully sent to backend")
                } else {
                    Log.e("FCM", "Failed to send FCM token: ${response.code()} ${response.message()}")
                }
            }

            override fun onFailure(call: Call<Void>, t: Throwable) {
                Log.e("FCM", "Error sending FCM token", t)
            }
        })
    }

    private fun getJWTToken(context: Context): String? {
        val sharedPref = context.getSharedPreferences("AppPrefs", Context.MODE_PRIVATE)
        return sharedPref.getString("jwt_token", null)
    }
}
