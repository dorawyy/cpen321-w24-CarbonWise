package com.example.carbonwise

import android.content.Context
import android.content.Intent
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.UiSelector
import com.example.carbonwise.ui.scan.DebugConfig
import junit.framework.TestCase.assertNotNull
import junit.framework.TestCase.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class NonFunctionalRequirementTests {

    private lateinit var device: UiDevice

    @Before
    fun setUp() {
        DebugConfig.showDebugButton = true
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        assertNotNull("InstrumentationRegistry returned null!", instrumentation)

        device = UiDevice.getInstance(instrumentation)
        device.pressHome()

        val context = ApplicationProvider.getApplicationContext<Context>()
        val intent = context.packageManager.getLaunchIntentForPackage("com.example.carbonwise")
        assertNotNull("Launch intent for app is null! Check package name.", intent)
        intent!!.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK)
        context.startActivity(intent)
    }

    @Test
    fun testScanPerformanceWithDebugButton() {
        allowCameraPermission()
        navigateToScanTab()

        // 1. Locate the debug button that injects a test barcode
        val debugButton = device.findObject(
            UiSelector().resourceId("com.example.carbonwise:id/debugInjectBarcodeButton")
        )

        assertTrue("Debug inject button not found", debugButton.waitForExists(5000))

        val startTime = System.currentTimeMillis()

        // 2. Click the debug button
        debugButton.click()

        // 3. Wait for the "Confirm Scan" dialog and press "Accept"
        val acceptButton = device.findObject(UiSelector().textContains("Accept"))
        if (acceptButton.waitForExists(5000)) {
            acceptButton.click()
        } else {
            throw AssertionError("Confirm Scan dialog or 'Accept' button not found.")
        }

        // 4. Now wait for product info
        val productNameText = device.findObject(
            UiSelector().resourceId("com.example.carbonwise:id/productNameText")
        )
        val appeared = productNameText.waitForExists(8000)  // Wait up to 8 seconds

        val endTime = System.currentTimeMillis()
        val elapsedTime = endTime - startTime

        // 5. Verify it took under 8 seconds to display product info
        assertTrue(
            "Product info took $elapsedTime ms, exceeding 8000 ms",
            appeared && elapsedTime < 8000
        )
    }

    private fun navigateToScanTab() {
        // Example: If you have a BottomNavigationView with id/navigation_scan
        val scanTab = device.findObject(
            UiSelector().resourceId("com.example.carbonwise:id/navigation_scan")
        )
        if (scanTab.waitForExists(5000)) {
            scanTab.click()
        } else {
            throw AssertionError("Could not find the scan tab button.")
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