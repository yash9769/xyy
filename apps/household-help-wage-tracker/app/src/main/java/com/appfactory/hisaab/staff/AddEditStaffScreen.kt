package com.appfactory.hisaab.staff

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.selectable
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.appfactory.hisaab.data.HisaabDao
import com.appfactory.hisaab.domain.WageType

@Composable
fun AddEditStaffScreen(
    dao: HisaabDao,
    staffId: Long?,
    onDone: () -> Unit,
) {
    val viewModel: AddEditStaffViewModel = viewModel(
        factory = viewModelFactory { initializer { AddEditStaffViewModel(dao, staffId) } },
    )
    val state by viewModel.state.collectAsState()

    LaunchedEffect(state.saved) {
        if (state.saved) onDone()
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text(if (state.isEditing) "Edit staff member" else "Add staff member") }) },
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .padding(16.dp)
                .fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            OutlinedTextField(
                value = state.name,
                onValueChange = viewModel::onNameChange,
                label = { Text("Name") },
                isError = state.nameError != null,
                supportingText = { state.nameError?.let { Text(it) } },
                modifier = Modifier.fillMaxWidth(),
            )

            Text("Wage type", style = MaterialTheme.typography.labelLarge)
            Row(modifier = Modifier.fillMaxWidth()) {
                WageType.entries.forEach { type ->
                    Row(
                        modifier = Modifier.selectable(
                            selected = state.wageType == type,
                            onClick = { viewModel.onWageTypeChange(type) },
                        ),
                    ) {
                        RadioButton(selected = state.wageType == type, onClick = { viewModel.onWageTypeChange(type) })
                        Text(if (type == WageType.MONTHLY) "Monthly" else "Daily")
                    }
                }
            }

            OutlinedTextField(
                value = state.wageAmount,
                onValueChange = viewModel::onWageAmountChange,
                label = { Text(if (state.wageType == WageType.MONTHLY) "Monthly wage (₹)" else "Daily wage (₹)") },
                isError = state.wageAmountError != null,
                supportingText = { state.wageAmountError?.let { Text(it) } },
                modifier = Modifier.fillMaxWidth(),
            )

            OutlinedTextField(
                value = state.roleLabel,
                onValueChange = viewModel::onRoleLabelChange,
                label = { Text("Role (optional, e.g. Cook)") },
                modifier = Modifier.fillMaxWidth(),
            )

            Button(
                onClick = viewModel::save,
                enabled = state.isValid,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Save")
            }
        }
    }
}
