package com.appfactory.template.navigation

/**
 * Central route registry. Apps generated from this template add their own screens here rather
 * than scattering route string literals across the codebase.
 */
sealed class Destination(val route: String) {
    data object Home : Destination("home")
    data object Settings : Destination("settings")
}
