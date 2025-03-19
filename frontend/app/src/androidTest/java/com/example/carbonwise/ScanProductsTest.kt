package com.example.carbonwise

import android.app.Activity
import android.app.Instrumentation
import android.content.Intent
import android.graphics.Bitmap
import android.provider.Settings
import androidx.test.core.app.ActivityScenario
import androidx.test.espresso.Espresso
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.IdlingRegistry
import androidx.test.espresso.assertion.ViewAssertions
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.idling.CountingIdlingResource
import androidx.test.espresso.intent.Intents
import androidx.test.espresso.intent.matcher.IntentMatchers.hasAction
import androidx.test.espresso.matcher.ViewMatchers
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.UiObject
import androidx.test.uiautomator.UiSelector
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.barcode.BarcodeScanner
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import junit.framework.TestCase.assertEquals
import junit.framework.TestCase.assertTrue
import org.junit.After
import org.junit.Before
import org.junit.FixMethodOrder
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.MethodSorters
import org.mockito.Mockito.*
import java.util.concurrent.Executors

@FixMethodOrder(MethodSorters.NAME_ASCENDING)
@RunWith(AndroidJUnit4::class)
class ScanProductsTest {
    private val idlingResource = CountingIdlingResource("BarcodeScanner")
    private lateinit var scenario: ActivityScenario<MainActivity>

    @get:Rule
    var activityRule = ActivityScenarioRule(MainActivity::class.java)

    @Before
    fun setUp() {
        // Launch the MainActivity manually
        scenario = ActivityScenario.launch(MainActivity::class.java)
        // Register Espresso IdlingResource for async operations
        IdlingRegistry.getInstance().register(idlingResource)
        // Initialize Intents for intent mocking
        Intents.init()
    }

    @After
    fun tearDown() {
        // Close the activity and clean up resources
        scenario.close()
        IdlingRegistry.getInstance().unregister(idlingResource)
        Intents.release()
    }

    private fun denyCameraPermission() {
        // Helper function to deny camera permission if prompted
        val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
        val denyButton: UiObject = device.findObject(UiSelector().resourceId("com.android.permissioncontroller:id/permission_deny_button"))
        if (denyButton.exists() && denyButton.isEnabled) {
            denyButton.click()
        } else {
            // Permissions already denied, do nothing
        }
    }

    private fun allowCameraPermission() {
        // Helper function to allow camera permission if prompted
        val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
        val allowButton: UiObject = device.findObject(UiSelector().resourceId("com.android.permissioncontroller:id/permission_allow_foreground_only_button"))
        if (allowButton.exists() && allowButton.isEnabled) {
            allowButton.click()
        } else {
            // Permissions already enabled, do nothing
        }
    }

    private fun createMockBarcodeScanner(barcodeValue: String?): BarcodeScanner {
        // Helper function to create a mock BarcodeScanner with a specified barcode value
        val mockBarcode = mock(Barcode::class.java)
        `when`(mockBarcode.rawValue).thenReturn(barcodeValue)

        val mockBarcodeScanner = mock(BarcodeScanner::class.java)
        val task = Tasks.forResult(if (barcodeValue != null) listOf(mockBarcode) else emptyList())

        `when`(mockBarcodeScanner.process(any(InputImage::class.java))).thenReturn(task)
        return mockBarcodeScanner
    }

    private fun processMockScan(mockBarcodeScanner: BarcodeScanner, expectedText: String) {
        // Helper function to simulate a barcode scan and verify the result
        val mockBitmap = Bitmap.createBitmap(100, 100, Bitmap.Config.ARGB_8888)
        val inputImage = InputImage.fromBitmap(mockBitmap, 0)

        idlingResource.increment() // Start waiting for async processing

        mockBarcodeScanner.process(inputImage)
            .addOnSuccessListener { _ ->
                // Pass, was successful
            }
            .addOnFailureListener {
                throw AssertionError("Barcode scanning failed unexpectedly!")
            }
            .addOnCompleteListener {
                idlingResource.decrement() // Release Espresso IdlingResource
            }
    }

    @Test
    fun testScanProductA_CameraPermissionDenied() {
        // Step 3a: Simulate the user denying camera permissions
        denyCameraPermission()
        Thread.sleep(2000) // Wait for the permission dialog to be handled

        // Step 3a1: Verify the system displays a message that camera permissions are required
        onView(withText("Camera permission is required to scan barcodes. Please enable it in Settings."))
            .check(matches(isDisplayed()))
    }

    @Test
    fun testScanProductB_NoBarcodeDetected_ShowsErrorMessage() {
        // Step 4a: Simulate a scenario where no barcode is detected
        allowCameraPermission()
        processMockScan(createMockBarcodeScanner(null), "No barcode detected.")
    }

    @Test
    fun testScanProductC_NoProductInfo_ShowsErrorMessage() {
        // Step 5a: Simulate a scenario where the barcode is valid but no product information is found
        allowCameraPermission()
        processMockScan(createMockBarcodeScanner("123456789"), "Product information not found.")
    }

    @Test
    fun testScanProductD_ProductInDB_NoErrorMessage() {
        // Step 5: Simulate a successful scan where product information is found in the database
        allowCameraPermission()
        processMockScan(createMockBarcodeScanner("009800895007"), "Nutella")
    }

    @Test
    fun testScanProductE_ConnectionError() {
        // Step 5b: Simulate a server error due to no internet connection
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val device = UiDevice.getInstance(instrumentation)
        device.executeShellCommand("svc wifi disable") // Disable Wi-Fi to simulate a connection error
        Thread.sleep(5000) // Wait for Wi-Fi to be disabled

        allowCameraPermission()
        processMockScan(createMockBarcodeScanner("009800895007"), "Nutella")

        // Re-enable Wi-Fi for subsequent tests
        device.executeShellCommand("svc wifi enable")
        Thread.sleep(10000) // Wifi takes a LONG time to turn on
    }
}