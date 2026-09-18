package com.appfactory.hisaab.staff

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.appfactory.hisaab.data.HisaabDao
import com.appfactory.hisaab.domain.AttendanceStatus
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@Composable
fun StaffDetailScreen(
    dao: HisaabDao,
    staffId: Long,
    onEdit: () -> Unit,
    onBack: () -> Unit,
) {
    val viewModel: StaffDetailViewModel = viewModel(
        factory = viewModelFactory { initializer { StaffDetailViewModel(dao, staffId) } },
    )
    val state by viewModel.state.collectAsState()

    var pickerDate by remember { mutableStateOf<LocalDate?>(null) }
    var showAdvanceDialog by remember { mutableStateOf(false) }
    var showSettleDialog by remember { mutableStateOf(false) }

    LaunchedEffect(state.settlementJustCompleted) {
        if (state.settlementJustCompleted) {
            showSettleDialog = false
            viewModel.consumeSettlementFlag()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(state.staff?.name ?: "") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, contentDescription = "Back") }
                },
                actions = {
                    IconButton(onClick = onEdit) { Icon(Icons.Filled.Edit, contentDescription = "Edit staff member") }
                },
            )
        },
    ) { padding ->
        if (state.isLoading) {
            return@Scaffold
        }
        Column(modifier = Modifier.padding(padding).fillMaxWidth()) {
            Card(modifier = Modifier.padding(16.dp).fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Owed so far this period", style = MaterialTheme.typography.labelLarge)
                    Text(
                        "₹${"%.2f".format(state.netPayableSoFar)}",
                        style = MaterialTheme.typography.titleLarge,
                    )
                    Text("Gross wage: ₹${"%.2f".format(state.grossWageSoFar)} · Advances: ₹${"%.2f".format(state.advances.sumOf { it.amount })}")
                    Text("Period: ${state.periodStart} to ${state.periodEndSoFar}")
                }
            }

            Row(modifier = Modifier.padding(horizontal = 16.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = { showAdvanceDialog = true }) { Text("Record advance") }
                Button(onClick = { showSettleDialog = true }, enabled = state.attendanceByDate.isNotEmpty()) {
                    Text("Settle this period")
                }
            }

            Text("Attendance", style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(16.dp, 16.dp, 16.dp, 0.dp))
            LazyColumn(modifier = Modifier.fillMaxWidth()) {
                val dates = generateSequence(state.periodStart) { it.plusDays(1) }
                    .takeWhile { !it.isAfter(state.periodEndSoFar) }
                    .toList()
                items(dates) { date ->
                    ListItem(
                        headlineContent = { Text(date.format(DateTimeFormatter.ofPattern("EEE, d MMM"))) },
                        supportingContent = { Text(state.attendanceByDate[date]?.name ?: "Not marked") },
                        modifier = Modifier.clickable { pickerDate = date },
                    )
                    HorizontalDivider()
                }

                if (state.advances.isNotEmpty()) {
                    item {
                        Text(
                            "Advances",
                            style = MaterialTheme.typography.labelLarge,
                            modifier = Modifier.padding(16.dp, 16.dp, 16.dp, 0.dp),
                        )
                    }
                    items(state.advances) { advance ->
                        ListItem(
                            headlineContent = { Text("₹${"%.2f".format(advance.amount)}") },
                            supportingContent = { Text(listOfNotNull(advance.date, advance.note).joinToString(" · ")) },
                        )
                    }
                }
            }
        }
    }

    pickerDate?.let { date ->
        AttendancePickerDialog(
            currentStatus = state.attendanceByDate[date],
            onDismiss = { pickerDate = null },
            onSelect = { status ->
                viewModel.markAttendance(date, status)
                pickerDate = null
            },
        )
    }

    if (showAdvanceDialog) {
        AdvanceDialog(
            onDismiss = { showAdvanceDialog = false },
            onSave = { amount, note ->
                viewModel.recordAdvance(amount, LocalDate.now(), note)
                showAdvanceDialog = false
            },
        )
    }

    if (showSettleDialog) {
        AlertDialog(
            onDismissRequest = { showSettleDialog = false },
            title = { Text("Settle this period?") },
            text = {
                Text(
                    "Net payable: ₹${"%.2f".format(state.netPayableSoFar)} for ${state.periodStart} to ${state.periodEndSoFar}. " +
                        "This archives the period and starts a fresh one from tomorrow.",
                )
            },
            confirmButton = { Button(onClick = { viewModel.settleCurrentPeriod() }) { Text("Confirm settlement") } },
            dismissButton = { TextButton(onClick = { showSettleDialog = false }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun AttendancePickerDialog(
    currentStatus: AttendanceStatus?,
    onDismiss: () -> Unit,
    onSelect: (AttendanceStatus?) -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Mark attendance") },
        text = {
            Column {
                AttendanceStatus.entries.forEach { status ->
                    ListItem(
                        headlineContent = { Text(status.name) },
                        modifier = Modifier.clickable { onSelect(status) },
                    )
                }
                if (currentStatus != null) {
                    ListItem(
                        headlineContent = { Text("Clear") },
                        modifier = Modifier.clickable { onSelect(null) },
                    )
                }
            }
        },
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun AdvanceDialog(
    onDismiss: () -> Unit,
    onSave: (amount: Double, note: String?) -> Unit,
) {
    var amount by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Record advance") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = amount,
                    onValueChange = { amount = it; error = null },
                    label = { Text("Amount (₹)") },
                    isError = error != null,
                    supportingText = { error?.let { Text(it) } },
                )
                OutlinedTextField(value = note, onValueChange = { note = it }, label = { Text("Note (optional)") })
            }
        },
        confirmButton = {
            Button(onClick = {
                val value = amount.toDoubleOrNull()
                if (value == null || value <= 0) {
                    error = "Enter a valid amount greater than zero"
                } else {
                    onSave(value, note.trim().ifBlank { null })
                }
            }) { Text("Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}
