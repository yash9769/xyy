package com.appfactory.template

import androidx.compose.material3.Text
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import org.junit.Rule
import org.junit.Test

/**
 * Placeholder demonstrating the Compose UI test setup. Runs on a device/emulator or a Gradle
 * Managed Device in CI (see README.md "Testing without a local emulator"). Delete once a real
 * app built on this template has its own UI tests.
 */
class ExampleComposeTest {
    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun textIsDisplayed() {
        composeTestRule.setContent { Text("Hello, App Factory") }
        composeTestRule.onNodeWithText("Hello, App Factory").assertExists()
    }
}
