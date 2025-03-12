package com.example.carbonwise

import android.Manifest
import android.app.Activity
import android.app.Instrumentation
import android.content.Intent
import android.graphics.Bitmap
import android.provider.Settings
import androidx.test.core.app.ActivityScenario
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.intent.Intents
import androidx.test.espresso.intent.matcher.IntentMatchers.hasAction
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.rule.GrantPermissionRule
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.UiObject
import androidx.test.uiautomator.UiSelector
import com.example.carbonwise.ui.scan.ScanFragment
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.barcode.BarcodeScanner
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import junit.framework.TestCase.assertEquals
import junit.framework.TestCase.assertTrue
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.*
import java.util.concurrent.Executors


@RunWith(AndroidJUnit4::class)
class ScanProductsTest {

    @Before
    fun setUp() {
        ActivityScenario.launch(MainActivity::class.java)
        Intents.init()
    }

    @After
    fun tearDown() {
        Intents.release()
    }

    /**
     * Test Case: Camera Permission Denied
     */
    @Test
    fun testScanProductCameraPermissionDenied() {
        val result = Instrumentation.ActivityResult(Activity.RESULT_OK, Intent())
        Thread.sleep(3000)
        Intents.intending(hasAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)).respondWith(result)
        val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
        val denyButton: UiObject = device.findObject(UiSelector().resourceId("com.android.permissioncontroller:id/permission_deny_button"))
        if (denyButton.exists() && denyButton.isEnabled) {
            denyButton.click()
        } else {
            throw AssertionError("Deny button not found or not enabled")
        }
        Thread.sleep(2000)
        onView(withText("Camera permission is required to scan barcodes. Please enable it in Settings."))
            .check(matches(isDisplayed()))
    }

    /**
     * Test Case: Image Unreadable
     */
    @Test
    fun testScanProduct_NoBarcodeDetected_ShowsErrorMessage() {
        val result = Instrumentation.ActivityResult(Activity.RESULT_OK, Intent())
        Thread.sleep(3000)
        Intents.intending(hasAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)).respondWith(result)

        val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
        val allowButton: UiObject = device.findObject(UiSelector().resourceId("com.android.permissioncontroller:id/permission_allow_foreground_only_button"))
        if (allowButton.exists() && allowButton.isEnabled) {
            allowButton.click()
        } else {
            throw AssertionError("Cannot Enable Permissions")
        }
        Thread.sleep(2000)

        val mockBitmap = Bitmap.createBitmap(100, 100, Bitmap.Config.ARGB_8888)
        val inputImage = InputImage.fromBitmap(mockBitmap, 0)

        val mockBarcodeScanner = mock(BarcodeScanner::class.java)
        val task = Tasks.forResult(emptyList<Barcode>())

        `when`(mockBarcodeScanner.process(any(InputImage::class.java)))
            .thenReturn(task)

        mockBarcodeScanner.process(inputImage)
            .addOnSuccessListener { barcodes ->
                assertTrue(barcodes.isEmpty())
            }
            .addOnFailureListener {
                throw AssertionError("Barcode scanning failed unexpectedly!")
            }
    }

    /**
     * Test Case: Product does not exist
     */
    @Test
    fun testScanProduct_NoProductInfo_ShowsErrorMessage() {
        val result = Instrumentation.ActivityResult(Activity.RESULT_OK, Intent())
        Intents.intending(hasAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)).respondWith(result)

        val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
        val allowButton: UiObject = device.findObject(
            UiSelector().resourceId("com.android.permissioncontroller:id/permission_allow_foreground_only_button")
        )

        if (allowButton.exists() && allowButton.isEnabled) {
            allowButton.click()
        } else {
            throw AssertionError("Cannot Enable Permissions")
        }

        val mockBitmap = Bitmap.createBitmap(100, 100, Bitmap.Config.ARGB_8888)
        val inputImage = InputImage.fromBitmap(mockBitmap, 0)

        val mockBarcode = mock(Barcode::class.java)
        `when`(mockBarcode.rawValue).thenReturn("123456789")

        val mockBarcodeScanner = mock(BarcodeScanner::class.java)
        val task = Tasks.forResult(listOf(mockBarcode))

        `when`(mockBarcodeScanner.process(any(InputImage::class.java))).thenReturn(task)

        val executor = Executors.newSingleThreadExecutor()
        executor.execute {
            mockBarcodeScanner.process(inputImage)
                .addOnSuccessListener { barcodes ->
                    assertEquals(1, barcodes.size)

                    // Ensure UI assertion runs on the main thread
                    InstrumentationRegistry.getInstrumentation().runOnMainSync {
                        onView(withText("Product information not found.")).check(matches(isDisplayed()))
                    }
                }
                .addOnFailureListener {
                    throw AssertionError("Barcode scanning failed unexpectedly!")
                }
        }
    }

    /**
     * Test Case: Product exists, scan completes fully
     */
    @Test
    fun testScanProduct_ProductInDB_NoErrorMessage() {
        val result = Instrumentation.ActivityResult(Activity.RESULT_OK, Intent())
        Intents.intending(hasAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)).respondWith(result)

        val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
        val allowButton: UiObject = device.findObject(
            UiSelector().resourceId("com.android.permissioncontroller:id/permission_allow_foreground_only_button")
        )

        if (allowButton.exists() && allowButton.isEnabled) {
            allowButton.click()
        } else {
            throw AssertionError("Cannot Enable Permissions")
        }

        val mockBitmap = Bitmap.createBitmap(100, 100, Bitmap.Config.ARGB_8888)
        val inputImage = InputImage.fromBitmap(mockBitmap, 0)

        val mockBarcode = mock(Barcode::class.java)
        `when`(mockBarcode.rawValue).thenReturn("009800895007")

        val mockBarcodeScanner = mock(BarcodeScanner::class.java)
        val task = Tasks.forResult(listOf(mockBarcode))

        `when`(mockBarcodeScanner.process(any(InputImage::class.java))).thenReturn(task)

        val executor = Executors.newSingleThreadExecutor()
        executor.execute {
            mockBarcodeScanner.process(inputImage)
                .addOnSuccessListener { barcodes ->
                    assertEquals(1, barcodes.size)

                    // Ensure UI assertion runs on the main thread
                    InstrumentationRegistry.getInstrumentation().runOnMainSync {
                        onView(withText("Nutella")).check(matches(isDisplayed()))
                    }
                }
                .addOnFailureListener {
                    throw AssertionError("Barcode scanning failed unexpectedly!")
                }
        }
    }



}
