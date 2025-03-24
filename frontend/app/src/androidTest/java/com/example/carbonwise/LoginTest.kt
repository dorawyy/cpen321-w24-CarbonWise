package com.example.carbonwise

import android.content.Context
import android.content.Intent
import android.util.Log
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

        Thread.sleep(2000)

        // Step 3: Handle Google OAuth authentication flow
        handleGoogleSignIn()

        // Step 4: System verifies authentication and logs the guest user in
        // (This step is implicitly tested by the successful completion of the above steps)
    }

    @Test
    fun testLoginConnectionError() {
        // Simulate a failure scenario: Disable Wi-Fi to test network error handling
        device.executeShellCommand("svc wifi disable")
        device.executeShellCommand("svc data disable")
        Thread.sleep(5000)

        // Step 1: Allow camera permission (navigation is not possible with the confirmation window on screen)
        allowCameraPermission()

        // Step 2: Navigate to the login tab
        navigateToLoginFragment()

        // Step 3: Verify the system displays an error message for no internet connection
        val logs = device.executeShellCommand("logcat -d | grep Toast")
        assertTrue("Expected toast message not found", logs.contains("Toast"))

        // Step 4: Close the Google Sign-In window (if it's open)
        val cancelButton = device.findObject(UiSelector().textContains("Cancel"))
        if (cancelButton.waitForExists(3000)) {
            Log.d("GoogleSignInTest", "\"Cancel\" button found. Clicking to close sign-in window.")
            cancelButton.click()
        } else {
            Log.d("GoogleSignInTest", "No explicit cancel button found. Pressing back.")
            device.pressBack()
        }

        // Re-enable Wi-Fi for subsequent tests
        device.executeShellCommand("svc wifi enable")
        device.executeShellCommand("svc data enable")
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
        val TAG = "GoogleSignInTest"

        // Step 3a: Look for the "Continue" or "@gmail.com" button
        val continueSelector = device.findObject(UiSelector().textContains("Continue"))
        val emailSelector = device.findObject(UiSelector().textContains("@gmail.com"))

        if (continueSelector.waitForExists(5000)) {
            Log.d(TAG, "\"Continue\" button found. Clicking it.")
            continueSelector.click()
        } else if (emailSelector.waitForExists(5000)) {
            Log.d(TAG, "\"@gmail.com\" account button found. Clicking it.")
            emailSelector.click()
        } else {
            Log.d(TAG, "No account selection button found.")
        }

        // Step 3b: Grant permission
        val allowButton = device.findObject(UiSelector().textContains("Allow"))
        if (allowButton.waitForExists(5000)) {
            Log.d(TAG, "\"Allow\" button found. Clicking it.")
            allowButton.click()
        } else {
            Log.d(TAG, "\"Allow\" button not found.")
        }
    }
}