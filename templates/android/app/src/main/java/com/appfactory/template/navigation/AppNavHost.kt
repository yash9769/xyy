package com.appfactory.template.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.appfactory.template.settings.SettingsScreen
import com.appfactory.template.ui.components.EmptyState

/**
 * Single NavHost for the whole app — appropriate for an app this size (see ARCHITECTURE.md's
 * "why not more architecture" note). Apps generated from this template replace the Home
 * destination's placeholder content with their real first screen and add further composable()
 * entries below as needed.
 */
@Composable
fun AppNavHost(navController: NavHostController = rememberNavController()) {
    NavHost(navController = navController, startDestination = Destination.Home.route) {
        composable(Destination.Home.route) {
            // Template placeholder — replace with the app's real home screen.
            EmptyState(
                title = "Nothing here yet",
                message = "Replace this destination with your app's home screen.",
            )
        }
        composable(Destination.Settings.route) {
            SettingsScreen()
        }
    }
}
