package com.appfactory.hisaab.settings

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.selectable
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import androidx.core.os.LocaleListCompat
import com.appfactory.hisaab.data.AppLanguage
import com.appfactory.hisaab.data.HisaabDao
import com.appfactory.hisaab.data.SettingsRepository
import kotlinx.coroutines.launch
import java.io.File

@Composable
fun SettingsScreen(
    dao: HisaabDao,
    settingsRepository: SettingsRepository,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val viewModel = remember { SettingsViewModel(dao, settingsRepository) }
    val language by viewModel.language.collectAsState()

    var restoreError by remember { mutableStateOf<String?>(null) }
    var restoreSuccess by remember { mutableStateOf(false) }
    var showRestoreConfirm by remember { mutableStateOf<Uri?>(null) }

    val exportLauncher = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) {}

    val importLauncher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) showRestoreConfirm = uri
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, contentDescription = "Back") } },
            )
        },
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            Text("Language", style = androidx.compose.material3.MaterialTheme.typography.labelLarge, modifier = Modifier.padding(16.dp, 16.dp, 16.dp, 0.dp))
            AppLanguage.entries.forEach { lang ->
                ListItem(
                    headlineContent = { Text(if (lang == AppLanguage.ENGLISH) "English" else "हिंदी (Hindi)") },
                    leadingContent = {
                        RadioButton(selected = language == lang, onClick = {
                            viewModel.setLanguage(lang)
                            AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(lang.tag))
                        })
                    },
                    modifier = Modifier.selectable(selected = language == lang, onClick = {
                        viewModel.setLanguage(lang)
                        AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(lang.tag))
                    }),
                )
            }

            Text("Backup", style = androidx.compose.material3.MaterialTheme.typography.labelLarge, modifier = Modifier.padding(16.dp, 24.dp, 16.dp, 0.dp))
            OutlinedButton(
                onClick = {
                    scope.launch {
                        val json = viewModel.buildBackupJson()
                        val backupsDir = File(context.cacheDir, "backups").apply { mkdirs() }
                        val file = File(backupsDir, "hisaab-backup-${System.currentTimeMillis()}.json")
                        file.writeText(json)
                        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
                        val intent = Intent(Intent.ACTION_SEND).apply {
                            type = "application/json"
                            putExtra(Intent.EXTRA_STREAM, uri)
                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        }
                        exportLauncher.launch(Intent.createChooser(intent, "Export Hisaab backup"))
                    }
                },
                modifier = Modifier.padding(16.dp, 8.dp),
            ) { Text("Export backup") }

            OutlinedButton(
                onClick = { importLauncher.launch(arrayOf("application/json")) },
                modifier = Modifier.padding(16.dp, 0.dp),
            ) { Text("Restore from backup") }
        }
    }

    showRestoreConfirm?.let { uri ->
        AlertDialog(
            onDismissRequest = { showRestoreConfirm = null },
            title = { Text("Restore backup?") },
            text = { Text("This replaces all current data and cannot be undone.") },
            confirmButton = {
                Button(onClick = {
                    scope.launch {
                        val json = context.contentResolver.openInputStream(uri)?.bufferedReader()?.use { it.readText() }
                        if (json == null) {
                            restoreError = "Could not read the selected file"
                        } else {
                            viewModel.restoreFromJson(json) { result ->
                                when (result) {
                                    is SettingsViewModel.RestoreResult.Success -> restoreSuccess = true
                                    is SettingsViewModel.RestoreResult.Failure -> restoreError = result.message
                                }
                            }
                        }
                        showRestoreConfirm = null
                    }
                }) { Text("Restore") }
            },
            dismissButton = { TextButton(onClick = { showRestoreConfirm = null }) { Text("Cancel") } },
        )
    }

    restoreError?.let { message ->
        AlertDialog(
            onDismissRequest = { restoreError = null },
            title = { Text("Restore failed") },
            text = { Text(message) },
            confirmButton = { TextButton(onClick = { restoreError = null }) { Text("OK") } },
        )
    }

    if (restoreSuccess) {
        AlertDialog(
            onDismissRequest = { restoreSuccess = false },
            title = { Text("Restore complete") },
            text = { Text("Your data has been restored from the backup file.") },
            confirmButton = { TextButton(onClick = { restoreSuccess = false }) { Text("OK") } },
        )
    }
}
