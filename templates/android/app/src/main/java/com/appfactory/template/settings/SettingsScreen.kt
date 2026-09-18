package com.appfactory.template.settings

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/**
 * Settings screen foundation. Every generated app should extend this (language toggle, backup/
 * restore, about) rather than building a separate ad-hoc settings surface — keeps the "where do
 * I find X" pattern consistent across every app in the portfolio.
 *
 * This template version only demonstrates the pattern with a placeholder dark-mode-follows-system
 * row; a real app replaces/extends the items list with its own settings (see
 * apps/household-help-wage-tracker's Settings screen for the language-toggle + backup/restore
 * extension of this foundation).
 */
@Composable
fun SettingsScreen() {
    Scaffold(
        topBar = { TopAppBar(title = { Text("Settings") }) },
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            var followSystemDarkMode by remember { mutableStateOf(true) }
            ListItem(
                headlineContent = { Text("Follow system dark mode") },
                supportingContent = { Text("Template placeholder — wire to DataStore in a real app") },
                trailingContent = {
                    Switch(checked = followSystemDarkMode, onCheckedChange = { followSystemDarkMode = it })
                },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
            )
        }
    }
}
