package com.example.carbonwise

import android.Manifest
import android.content.Context
import android.view.View
import androidx.test.core.app.ActivityScenario
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
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

    private lateinit var decorView: View
    private lateinit var activity: MainActivity

    @Before
    fun setUp() {

        val targetContext: Context = InstrumentationRegistry.getInstrumentation().targetContext
        val sharedPref = targetContext.getSharedPreferences("AppPrefs", Context.MODE_PRIVATE)
        with(sharedPref.edit()) {
            putString("jwt_token", "DUMMY_JWT_TOKEN")
            putString("google_id_token", "DUMMY_GOOGLE_TOKEN")
            apply()
        }

        ActivityScenario.launch(MainActivity::class.java).onActivity { act ->
            activity = act
            decorView = act.window.decorView
        }

        // Navigate to friends tab
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
        onView(withId(R.id.editFriendCode)).perform(typeText("IrClHbn2"))

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
        onView(withId(R.id.editFriendCode)).perform(typeText("NONEXISTENT_CODE"))

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

        onView(withId(R.id.textFriendCode)).check(matches(isDisplayed()))

        var ownFriendCode = "Error fetching code"

        // 2. Send a friend request to user themselves
        onView(withId(R.id.editFriendCode)).perform(typeText(ownFriendCode))

        onView(withId(R.id.buttonAddFriend)).perform(click())
        Thread.sleep(100)

        onView(withText("You cannot send a friend request to yourself!"))
            .check(matches(isDisplayed()))

        Thread.sleep(2000)
    }
}
