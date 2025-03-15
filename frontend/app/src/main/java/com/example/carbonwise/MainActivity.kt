package com.example.carbonwise

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.ViewModelProvider
import androidx.navigation.findNavController
import androidx.navigation.ui.setupWithNavController
import com.example.carbonwise.databinding.ActivityMainBinding
import com.example.carbonwise.network.FriendsApiService
import com.example.carbonwise.network.FCMTokenManager
import com.example.carbonwise.ui.friends.FriendsViewModel
import com.google.android.gms.tasks.Task
import com.google.firebase.messaging.FirebaseMessaging
import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.Response
import org.json.JSONObject
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.io.IOException

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private var isUserLoggedIn = false
    private var isReceiverRegistered = false

    private lateinit var friendsViewModel: FriendsViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val storedToken = getToken(this)
        isUserLoggedIn = !storedToken.isNullOrEmpty()

        val retrofit = Retrofit.Builder()
            .baseUrl("https://api.cpen321-jelx.com/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        val apiService = retrofit.create(FriendsApiService::class.java)
        val token = getJWTToken(this) ?: ""

        val factory = FriendsViewModel.Factory(apiService, token)
        friendsViewModel = ViewModelProvider(this, factory)[FriendsViewModel::class.java]

        setupNavigation()
        askNotificationPermission()
        FirebaseMessaging.getInstance().token.addOnCompleteListener(::handleFCMTokenResult)

        if (isUserLoggedIn) {
            refreshJWTToken(token)
        }
    }

    override fun onResume() {
        super.onResume()
        if (isUserLoggedIn && !isReceiverRegistered) {
            val token = getToken(this)
            if (token != null) {
                refreshJWTToken(token)
            }
            registerReceiver(broadcastReceiver, IntentFilter("UPDATE_FRIENDS"),
                RECEIVER_NOT_EXPORTED
            )
            isReceiverRegistered = true
        }
    }

    override fun onPause() {
        super.onPause()
        if (isReceiverRegistered) {
            unregisterReceiver(broadcastReceiver)
            isReceiverRegistered = false
        }
    }


    private fun setupNavigation() {
        val navController = findNavController(R.id.nav_host_fragment_activity_main)
        val navGraphResId = if (isUserLoggedIn) {
            R.navigation.mobile_navigation_user
        } else {
            R.navigation.mobile_navigation_guest
        }

        val navInflater = navController.navInflater
        val navGraph = navInflater.inflate(navGraphResId)
        navController.graph = navGraph

        binding.navView.menu.clear()
        val bottomMenuResId = if (isUserLoggedIn) {
            R.menu.bottom_nav_menu_user
        } else {
            R.menu.bottom_nav_menu_guest
        }
        binding.navView.inflateMenu(bottomMenuResId)

        binding.navView.setupWithNavController(navController)

        binding.navView.setOnItemReselectedListener { item ->
            if (item.itemId == R.id.navigation_history) {
                navController.popBackStack(R.id.navigation_history, false)
            }
            if (item.itemId == R.id.navigation_friends) {
                navController.popBackStack(R.id.navigation_friends, false)
            }
            if (item.itemId == R.id.navigation_scan) {
                navController.popBackStack(R.id.navigation_scan, false)
            }
        }

        // Ensure correct navigation behavior for bottom nav bar clicks
        binding.navView.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.navigation_history -> {
                    if (navController.currentDestination?.id != R.id.navigation_history) {
                        navController.navigate(R.id.navigation_history)
                    }
                    true
                }
                R.id.navigation_friends -> {
                    if (navController.currentDestination?.id != R.id.navigation_friends) {
                        navController.navigate(R.id.navigation_friends)
                    }
                    true
                }
                R.id.navigation_scan -> {
                    if (navController.currentDestination?.id != R.id.navigation_scan) {
                        navController.navigate(R.id.navigation_scan)
                    }
                    true
                }
                else -> {
                    navController.navigate(item.itemId)
                    true
                }
            }
        }
    }



    fun switchToLoggedInMode() {
        isUserLoggedIn = true
        FirebaseMessaging.getInstance().token.addOnCompleteListener(::handleFCMTokenResult)
        getJWTToken(this)?.let { friendsViewModel.updateToken(it) }
        setupNavigation()
    }

    fun logout() {
        isUserLoggedIn = false
        clearToken(this)
        setupNavigation()
    }

    private fun showLogoutConfirmationDialog() {
        val builder = android.app.AlertDialog.Builder(this)
        builder.setTitle("Log Out")
        builder.setMessage("Are you sure you want to log out?")
        builder.setPositiveButton("Yes") { _, _ ->
            logout()
        }
        builder.setNegativeButton("Cancel") { dialog, _ ->
            dialog.dismiss()
        }
        builder.show()
    }

    companion object {
        private const val PREFS_NAME = "AppPrefs"
        private const val TOKEN_KEY = "google_id_token"
        private const val JWT_TOKEN_KEY = "jwt_token"

        fun getToken(context: Context): String? {
            val sharedPref = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return sharedPref.getString(TOKEN_KEY, null)
        }

        fun getJWTToken(context: Context): String? {
            val sharedPref = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return sharedPref.getString(JWT_TOKEN_KEY, null)
        }

        fun clearToken(context: Context) {
            val sharedPref = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            with(sharedPref.edit()) {
                remove(TOKEN_KEY)
                remove(JWT_TOKEN_KEY)
                apply()
            }
        }

    }

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            Log.d("FCM", "Notification permission granted")
        } else {
            Log.d("FCM", "Notification permission denied")
        }
    }

    private fun askNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(
                    this, Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED
            ) {
                Log.d("FCM", "Notification permission already granted")
            } else if (shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS)) {
                // TODO: Ui for rationale
            } else {
                requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }

    private fun handleFCMTokenResult(task: Task<String>) {
        if (!task.isSuccessful) {
            Log.w("FCM", "Fetching FCM token failed", task.exception)
            return
        }

        val newToken = task.result
        Log.d("FCM", "FCM Token: $newToken")

        val sharedPref = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        FCMTokenManager.sendFCMTokenToBackend(this, newToken)

        with(sharedPref.edit()) {
            putString("fcm_token", newToken)
            apply()
        }
    }

    private fun refreshJWTToken(googleIdToken: String) {
        val url = "https://api.cpen321-jelx.com/auth/google"
        val jsonBody = """
    {
        "google_id_token": "$googleIdToken"
    }
    """.trimIndent()

        val requestBody = RequestBody.create(MediaType.get("application/json"), jsonBody)
        val request = Request.Builder()
            .url(url)
            .post(requestBody)
            .build()

        val client = OkHttpClient()
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e("MainActivity", "JWT refresh failed: ${e.message}")
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (it.isSuccessful) {
                        val responseBody = it.body()?.string()
                        val jsonObject = JSONObject(responseBody ?: "")
                        val newJwtToken = jsonObject.optString("token")

                        if (newJwtToken.isNotEmpty()) {
                            val sharedPref = getSharedPreferences("AppPrefs", Context.MODE_PRIVATE)
                            with(sharedPref.edit()) {
                                putString("jwt_token", newJwtToken)
                                apply()
                            }
                            friendsViewModel.updateToken(newJwtToken)
                            Log.d("MainActivity", "JWT Token refreshed successfully")
                        } else {
                            Log.e("MainActivity", "Failed to extract JWT token from response")
                        }
                    } else {
                        Log.e("MainActivity", "JWT refresh request failed with code: ${it.code()}")
                    }
                }
            }
        })
    }

    private val broadcastReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == "UPDATE_FRIENDS") {
                friendsViewModel.fetchFriends()
                friendsViewModel.fetchFriendRequests()
            }
        }
    }

}
