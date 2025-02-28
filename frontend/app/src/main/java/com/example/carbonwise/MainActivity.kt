package com.example.carbonwise

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.content.Context
import android.os.Bundle
import android.util.Log
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import androidx.core.content.ContextCompat
import androidx.navigation.findNavController
import androidx.navigation.ui.setupWithNavController
import com.example.carbonwise.databinding.ActivityMainBinding
import com.example.carbonwise.network.ApiService
import com.example.carbonwise.network.FCMTokenManager
import com.example.carbonwise.ui.friends.FriendsViewModel
import com.example.carbonwise.ui.history.HistoryCacheManager
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import com.google.firebase.messaging.FirebaseMessaging

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private var isUserLoggedIn = false

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

        val apiService = retrofit.create(ApiService::class.java)
        val token = getJWTToken(this) ?: ""

        val factory = FriendsViewModel.Factory(apiService, token)
        friendsViewModel = ViewModelProvider(this, factory)[FriendsViewModel::class.java]

        setupNavigation()
        askNotificationPermission()
        retrieveFCMToken()

        if (isUserLoggedIn) {
            HistoryCacheManager.fetchHistoryInBackground(this)
        }
    }

    override fun onResume() {
        super.onResume()
        if (isUserLoggedIn) {
            HistoryCacheManager.fetchHistoryInBackground(this)
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

        // Setup bottom navigation based on login state
        binding.navView.menu.clear()
        val bottomMenuResId = if (isUserLoggedIn) {
            R.menu.bottom_nav_menu_user
        } else {
            R.menu.bottom_nav_menu_guest
        }
        binding.navView.inflateMenu(bottomMenuResId)
        binding.navView.setupWithNavController(navController)

        binding.navView.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.navigation_scan -> {
                    val navController = findNavController(R.id.nav_host_fragment_activity_main)
                    navController.popBackStack(R.id.navigation_scan, true)
                    navController.navigate(R.id.navigation_scan)
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
        saveToken(this, "dummy_token")

        val navController = findNavController(R.id.nav_host_fragment_activity_main)
        val navInflater = navController.navInflater
        val navGraph = navInflater.inflate(R.navigation.mobile_navigation_user)
        navController.graph = navGraph

        // Update the bottom navigation menu
        binding.navView.menu.clear()
        binding.navView.inflateMenu(R.menu.bottom_nav_menu_user)
        binding.navView.setupWithNavController(navController)
    }

    companion object {
        private const val PREFS_NAME = "AppPrefs"
        private const val TOKEN_KEY = "google_id_token"
        private const val JWT_TOKEN_KEY = "jwt_token"


        fun saveToken(context: Context, token: String) {
            val sharedPref = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            with(sharedPref.edit()) {
                putString(TOKEN_KEY, token)
                apply()
            }
        }

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

    // Get FCM token
    private fun retrieveFCMToken() {
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (!task.isSuccessful) {
                Log.w("FCM", "Fetching FCM token failed", task.exception)
                return@addOnCompleteListener
            }

            val newToken = task.result
            Log.d("FCM", "FCM Token: $newToken")

            val sharedPref = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val savedToken = sharedPref.getString("fcm_token", null)

            if (savedToken != newToken) {  // Only send if token is different
                FCMTokenManager.sendFCMTokenToBackend(this, newToken)

                with(sharedPref.edit()) {
                    putString("fcm_token", newToken)
                    apply()
                }
            }
        }
    }



}
