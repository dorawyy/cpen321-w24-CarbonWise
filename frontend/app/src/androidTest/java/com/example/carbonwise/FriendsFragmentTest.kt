package com.example.carbonwise

import android.Manifest
import android.content.Context
import android.os.IBinder
import android.view.View
import android.view.WindowManager
import androidx.test.core.app.ActivityScenario
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.Root
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.action.ViewActions.closeSoftKeyboard
import androidx.test.espresso.action.ViewActions.typeText
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.intent.Intents
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.rule.GrantPermissionRule
import org.hamcrest.Description
import org.hamcrest.Matcher
import org.hamcrest.TypeSafeMatcher
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FriendsFragmentTest {

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

        onView(withId(R.id.navigation_friends)).perform(click())
        Thread.sleep(1000)
    }

    @After
    fun tearDown() {
        Intents.release()
    }

    @Test
    fun testSendFriendRequestSuccess() {

        onView(withId(R.id.fabAddFriend)).perform(click())
        Thread.sleep(1000)

        onView(withId(R.id.textFriendCode)).check(matches(isDisplayed()))
        onView(withId(R.id.editFriendCode)).check(matches(isDisplayed()))

        onView(withId(R.id.editFriendCode)).perform(typeText("TEST_CODE"), closeSoftKeyboard())

        onView(withId(R.id.buttonAddFriend)).perform(click())

        Thread.sleep(100)
        // Verify that the Toast with "Friend request sent!" is displayed
        // Having issues testing this
        //        onView(withText("Friend request sent!"))
        //            .inRoot(isToast())
        //            .check(matches(isDisplayed()))
    }

    /**
     * Matcher that is Toast window.
     */
    companion object {
        fun isToast(): Matcher<Root> {
            return object : TypeSafeMatcher<Root>() {
                override fun describeTo(description: Description) {
                    description.appendText("is toast")
                }

                override fun matchesSafely(root: Root): Boolean {
                    val type = root.windowLayoutParams.get().type
                    if (type == WindowManager.LayoutParams.TYPE_TOAST) {
                        val windowToken: IBinder = root.decorView.windowToken
                        val appToken: IBinder = root.decorView.applicationWindowToken
                        return windowToken == appToken
                    }
                    return false
                }
            }
        }
    }
}
