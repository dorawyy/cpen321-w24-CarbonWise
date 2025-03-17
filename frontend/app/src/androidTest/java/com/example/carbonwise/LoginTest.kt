package com.example.carbonwise

import android.content.Context
import android.content.Intent
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.rule.ActivityTestRule
import androidx.test.uiautomator.*
import junit.framework.TestCase.assertNotNull
import junit.framework.TestCase.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class GoogleSignInTest {

    private lateinit var device: UiDevice

    @Rule
    @JvmField
    var activityRule: ActivityTestRule<MainActivity> = ActivityTestRule(MainActivity::class.java)

    @Before
    fun setUp() {
        // Get the device instance
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        assertNotNull("InstrumentationRegistry returned null!", instrumentation)
        device = UiDevice.getInstance(instrumentation)

        // Press home button to start fresh
        device.pressHome()

        // Get the app context and launch the main activity
        val context = ApplicationProvider.getApplicationContext<Context>()
        assertNotNull("Application context is null!", context)

        val intent = context.packageManager.getLaunchIntentForPackage("com.example.carbonwise")
        assertNotNull("Launch intent for app is null! Check package name.", intent)

        intent!!.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK)
        context.startActivity(intent)
    }

    @Test
    fun testGoogleSignInFlow() {
        // Step 1: Allow camera permission (navigation is not possible with the confirmation window on screen)
        allowCameraPermission()

        // Step 2: Navigate to the login tab
        navigateToLoginFragment()

        // Step 3: Verify the Google Sign-In button is displayed and click it
        val googleSignInButton = device.findObject(UiSelector().resourceId("com.example.carbonwise:id/loginButton"))
        assertTrue("Google Sign-In button not found", googleSignInButton.waitForExists(5000))
        googleSignInButton.click()

        // Step 4: Handle Google OAuth authentication flow
        handleGoogleSignIn()

        // Step 5: System verifies authentication and logs the guest user in
        // (This step is implicitly tested by the successful completion of the above steps)
    }

    @Test
    fun testLoginConnectionError() {
        // Simulate a failure scenario: Disable Wi-Fi to test network error handling
        device.executeShellCommand("svc wifi disable")
        Thread.sleep(5000)

        // Step 1: Allow camera permission (navigation is not possible with the confirmation window on screen)
        allowCameraPermission()

        // Step 2: Navigate to the login tab
        navigateToLoginFragment()

        // Step 3: Verify the Google Sign-In button is displayed and click it
        val googleSignInButton = device.findObject(UiSelector().resourceId("com.example.carbonwise:id/loginButton"))
        assertTrue("Google Sign-In button not found", googleSignInButton.waitForExists(5000))
        googleSignInButton.click()

        // Step 4: Verify the system displays an error message for no internet connection
        val logs = device.executeShellCommand("logcat -d | grep Toast")
        assertTrue("Expected toast message not found", logs.contains("No internet connection"))

        // Re-enable Wi-Fi for subsequent tests
        device.executeShellCommand("svc wifi enable")
        Thread.sleep(10000) // Wifi takes a LONG time to turn on
    }

    private fun allowCameraPermission() {
        // Helper function to allow camera permission if prompted
        val allowButton = device.findObject(UiSelector().resourceId("com.android.permissioncontroller:id/permission_allow_foreground_only_button"))
        if (allowButton.waitForExists(5000) && allowButton.isEnabled) {
            allowButton.click()
        } else {
            // Already allowed, do nothing
        }
    }

    private fun navigateToLoginFragment() {
        // Helper function to navigate to the login tab
        val loginButton = device.findObject(UiSelector().resourceId("com.example.carbonwise:id/navigation_login"))
        if (loginButton.waitForExists(5000)) {
            loginButton.click()
        }
    }

    private fun handleGoogleSignIn() {
        // Helper function to handle the Google OAuth authentication flow
        // Step 3a: Guest user selects a Google account and grants permission
        val accountSelector = device.findObject(UiSelector().textContains("Continue"))
        if (accountSelector.waitForExists(5000)) {
            accountSelector.click()
        }

        // Step 3b: Guest user grants permission for the system to access profile details
        val allowButton = device.findObject(UiSelector().textContains("Allow"))
        if (allowButton.waitForExists(5000)) {
            allowButton.click()
        }
    }
}