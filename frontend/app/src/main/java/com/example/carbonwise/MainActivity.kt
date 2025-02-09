package com.example.carbonwise

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.navigation.findNavController
import androidx.navigation.ui.setupWithNavController
import com.example.carbonwise.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    // Simulated login state. In production, persist this state appropriately.
    private var isUserLoggedIn = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupNavigation()
    }

    private fun setupNavigation() {
        val navController = findNavController(R.id.nav_host_fragment_activity_main)
        // Select the appropriate nav graph based on login state.
        val navGraphResId = if (isUserLoggedIn) {
            R.navigation.mobile_navigation_user
        } else {
            R.navigation.mobile_navigation_guest
        }
        val navInflater = navController.navInflater
        val navGraph = navInflater.inflate(navGraphResId)
        navController.graph = navGraph

        // Setup the bottom navigation view with the appropriate menu.
        binding.navView.menu.clear()
        val bottomMenuResId = if (isUserLoggedIn) {
            R.menu.bottom_nav_menu_user
        } else {
            R.menu.bottom_nav_menu_guest
        }
        binding.navView.inflateMenu(bottomMenuResId)
        binding.navView.setupWithNavController(navController)
    }

    // Call this function when the user logs in.
    fun switchToLoggedInMode() {
        isUserLoggedIn = true

        val navController = findNavController(R.id.nav_host_fragment_activity_main)
        val navInflater = navController.navInflater
        // Inflate the logged-in navigation graph.
        val navGraph = navInflater.inflate(R.navigation.mobile_navigation_user)
        navController.graph = navGraph

        // Update the bottom navigation view with the logged-in menu.
        binding.navView.menu.clear()
        binding.navView.inflateMenu(R.menu.bottom_nav_menu_user)
        binding.navView.setupWithNavController(navController)
    }
}
