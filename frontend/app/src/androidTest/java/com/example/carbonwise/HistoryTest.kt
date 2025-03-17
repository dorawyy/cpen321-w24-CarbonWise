package com.example.carbonwise

import android.app.Instrumentation
import android.content.Context
import android.content.Intent
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.*
import com.example.carbonwise.MainActivity
import junit.framework.TestCase.assertNotNull
import junit.framework.TestCase.assertTrue
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class HistoryTest {

    private lateinit var device: UiDevice

    /*
    /   NOTE: This test requires a user to be signed into the device who has at least one item-
    /   in their history, and at least one friend. These conditions cannot be reliably spoofed
    /   due to constraints with Espresso and UIAutomator.
    */

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
    fun testDeleteItemFromHistory() {
        allowCameraPermission()

        navigateToLoginFragment()

        val googleSignInButton = device.findObject(UiSelector().resourceId("com.example.carbonwise:id/loginButton"))
        assertTrue("Google Sign-In button not found", googleSignInButton.waitForExists(5000))
        googleSignInButton.click()

        handleGoogleSignIn()

        navigateToHistoryFragment()

        Thread.sleep(5000)

        pressDeleteButton()
    }

    // TODO: This test currently fails because history component lacks proper error display
    @Test
    fun testHistoryConnectionError() {

        allowCameraPermission()

        navigateToLoginFragment()

        val googleSignInButton = device.findObject(UiSelector().resourceId("com.example.carbonwise:id/loginButton"))
        assertTrue("Google Sign-In button not found", googleSignInButton.waitForExists(5000))
        googleSignInButton.click()

        handleGoogleSignIn()

        device.executeShellCommand("svc wifi disable")
        Thread.sleep(5000)

        navigateToHistoryFragment()

        Thread.sleep(5000)

        val logs = device.executeShellCommand("logcat -d | grep Toast")
        assertTrue("Expected toast message not found", logs.contains("No internet connection"))

        device.executeShellCommand("svc wifi enable")
        Thread.sleep(10000) // Wifi takes a LONG time to turn on
    }

    @Test
    fun testViewFriendHistory() {
        allowCameraPermission()

        navigateToLoginFragment()

        val googleSignInButton = device.findObject(UiSelector().resourceId("com.example.carbonwise:id/loginButton"))
        assertTrue("Google Sign-In button not found", googleSignInButton.waitForExists(5000))
        googleSignInButton.click()

        handleGoogleSignIn()

        navigateToFriendsFragment()

        pressFirstFriendItem()

        Thread.sleep(5000)

        val historyRecyclerView = UiScrollable(UiSelector().resourceId("com.example.carbonwise:id/recyclerViewHistory"))
        assertTrue("No history items found for the friend!", historyRecyclerView.waitForExists(5000))

        checkFriendHistoryAppears()
    }

    // TODO: This test currently fails because friends component lacks proper error display
    @Test
    fun testViewFriendHistoryConnectionError() {
        allowCameraPermission()

        navigateToLoginFragment()

        val googleSignInButton = device.findObject(UiSelector().resourceId("com.example.carbonwise:id/loginButton"))
        assertTrue("Google Sign-In button not found", googleSignInButton.waitForExists(5000))
        googleSignInButton.click()

        handleGoogleSignIn()

        device.executeShellCommand("svc wifi disable")
        Thread.sleep(10000) // Wifi takes a LONG time to turn on

        navigateToFriendsFragment()

        pressFirstFriendItem()

        Thread.sleep(5000)

        val historyRecyclerView = UiScrollable(UiSelector().resourceId("com.example.carbonwise:id/recyclerViewHistory"))
        assertTrue("No history items found for the friend!", historyRecyclerView.waitForExists(5000))

        device.executeShellCommand("svc wifi enable")
        Thread.sleep(10000) // Wifi takes a LONG time to turn on
    }

    private fun allowCameraPermission() {
        val allowButton = device.findObject(UiSelector().resourceId("com.android.permissioncontroller:id/permission_allow_foreground_only_button"))
        if (allowButton.waitForExists(5000) && allowButton.isEnabled) {
            allowButton.click()
        } else {
            // Already allowed, do nothing
        }
    }

    private fun navigateToLoginFragment() {
        val loginButton = device.findObject(UiSelector().resourceId("com.example.carbonwise:id/navigation_login"))
        if (loginButton.waitForExists(5000)) {
            loginButton.click()
        }
    }

    private fun navigateToHistoryFragment() {
        val loginButton = device.findObject(UiSelector().resourceId("com.example.carbonwise:id/navigation_history"))
        if (loginButton.waitForExists(5000)) {
            loginButton.click()
        }
    }

    private fun navigateToFriendsFragment() {
        val loginButton = device.findObject(UiSelector().resourceId("com.example.carbonwise:id/navigation_friends"))
        if (loginButton.waitForExists(5000)) {
            loginButton.click()
        }
    }

    private fun handleGoogleSignIn() {
        val accountSelector = device.findObject(UiSelector().textContains("Continue"))
        if (accountSelector.waitForExists(5000)) {
            accountSelector.click()
        }

        val allowButton = device.findObject(UiSelector().textContains("Allow"))
        if (allowButton.waitForExists(5000)) {
            allowButton.click()
        }
    }

    private fun pressFirstFriendItem() {
        val recyclerView = UiScrollable(UiSelector().resourceId("com.example.carbonwise:id/recycler_friends"))
        recyclerView.scrollToBeginning(1) // Ensure we are at the top of the list

        val firstFriendItem = device.findObject(
            UiSelector().resourceId("com.example.carbonwise:id/friend_item").instance(0)
        )

        assertTrue("First friend item not found", firstFriendItem.waitForExists(5000))
        firstFriendItem.click()
    }

    private fun pressDeleteButton() {
        val recyclerView = UiScrollable(UiSelector().resourceId("com.example.carbonwise:id/recyclerViewHistory"))
        recyclerView.scrollToBeginning(1)

        val firstDeleteButton = device.findObject(
            UiSelector().resourceId("com.example.carbonwise:id/btnDelete").instance(0)
        )

        assertTrue("Delete button not found", firstDeleteButton.waitForExists(5000))
        firstDeleteButton.click()

        val confirmButton = device.findObject(UiSelector().textContains("Confirm"))
        if (confirmButton.waitForExists(5000)) {
            confirmButton.click()
        }
    }

    private fun checkFriendHistoryAppears() {
        val historyRecyclerView = UiScrollable(UiSelector().resourceId("com.example.carbonwise:id/recyclerViewHistory"))
        assertTrue("History RecyclerView not found!", historyRecyclerView.waitForExists(5000))

        // Check if at least one history item exists in the RecyclerView
        val firstHistoryItem = device.findObject(
            UiSelector().resourceId("com.example.carbonwise:id/textProductName").instance(0)
        )

        assertTrue("No history items found for the friend!", firstHistoryItem.waitForExists(5000))
    }


}
