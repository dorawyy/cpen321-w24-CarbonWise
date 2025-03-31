package com.example.carbonwise

import android.Manifest
import android.content.Context
import android.content.Intent
import android.util.Log
import android.view.View
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.action.ViewActions.closeSoftKeyboard
import androidx.test.espresso.action.ViewActions.typeText
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.intent.Intents
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.rule.GrantPermissionRule
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.UiSelector
import junit.framework.TestCase.assertNotNull
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FriendsFragmentTest {

    private lateinit var device: UiDevice

    @get:Rule
    val permissionRule: GrantPermissionRule = GrantPermissionRule.grant(Manifest.permission.CAMERA)

    @Before
    fun setUp() {

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

        val targetContext: Context = InstrumentationRegistry.getInstrumentation().targetContext
        val sharedPref = targetContext.getSharedPreferences("AppPrefs", Context.MODE_PRIVATE)

        if (sharedPref.getString("jwt_token)", null).isNullOrEmpty()) {
            allowCameraPermission()
            Thread.sleep(1000)
            navigateToLoginFragment()
            Thread.sleep(1000)
            handleGoogleSignIn()
            Thread.sleep(4000)
        }
        onView(withId(R.id.navigation_friends)).perform(click())
        Thread.sleep(1000)
    }

    @After
    fun tearDown() {
        Intents.release()
    }

    //    NOTE: This test requires a user to be signed into the device. These conditions cannot be reliably spoofed
    //    due to constraints with Espresso and UIAutomator. Additionally, Toasts cannot be detected so in the following
    //    tests, we do not explicitly check with the toast messages displayed.
    @Test
    fun testSendFriendRequestSuccess() {

        // 1. Press the bottom right add friend button
        onView(withId(R.id.fabAddFriend)).perform(click())
        Thread.sleep(1000)

        onView(withId(R.id.textFriendCode)).check(matches(isDisplayed()))
        onView(withId(R.id.editFriendCode)).check(matches(isDisplayed()))

        // 2. Send a friend request to an existing user in database
        onView(withId(R.id.editFriendCode)).perform(typeText("SvUd7gyL"), closeSoftKeyboard())

        onView(withId(R.id.buttonAddFriend)).perform(click())

        Thread.sleep(2000)
    }

    @Test
    fun sendFriendRequestFailureNoMatchingUser() {

        // 1. Press the bottom right add friend button
        onView(withId(R.id.fabAddFriend)).perform(click())
        Thread.sleep(1000)

        onView(withId(R.id.textFriendCode)).check(matches(isDisplayed()))
        onView(withId(R.id.editFriendCode)).check(matches(isDisplayed()))

        // 2. Send a friend request to a none-existing user in database
        onView(withId(R.id.editFriendCode)).perform(typeText("NONEXISTENT_CODE"), closeSoftKeyboard())

        onView(withId(R.id.buttonAddFriend)).perform(click())

        Thread.sleep(2000)
    }

    /**
     * Test case: When a user enters their own friend code and taps Send,
     * the UI should inform them that they cannot send a friend request to themselves.
     */
    @Test
    fun testSendFriendRequestToSelf() {

        // 1. Press the bottom right add friend button
        onView(withId(R.id.fabAddFriend)).perform(click())
        Thread.sleep(1000)

        var ownFriendCode = "F8HMDhJD"

        // 2. Send a friend request to user themselves
        onView(withId(R.id.editFriendCode)).perform(typeText(ownFriendCode), closeSoftKeyboard())

        onView(withId(R.id.buttonAddFriend)).perform(click())
        Thread.sleep(100)

        onView(withText("You cannot send a friend request to yourself!")).check(matches(isDisplayed()))

        Thread.sleep(2000)
    }

    private fun handleGoogleSignIn() {
        val TAG = "GoogleSignInTest"

        Thread.sleep(4000)

        // Get screen dimensions
        val displayWidth = device.displayWidth
        val displayHeight = device.displayHeight

        // Calculate center coordinates
        val centerX = displayWidth / 2
        val centerY = displayHeight / 2

        // Log and perform the click
        Log.d(TAG, "Clicking in the middle of the screen at ($centerX, $centerY)")
        device.click(centerX, centerY)
    }

    private fun navigateToLoginFragment() {
        // Helper function to navigate to the login tab
        val loginButton = device.findObject(UiSelector().resourceId("com.example.carbonwise:id/navigation_login"))
        if (loginButton.waitForExists(5000)) {
            loginButton.click()
        }
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
}
