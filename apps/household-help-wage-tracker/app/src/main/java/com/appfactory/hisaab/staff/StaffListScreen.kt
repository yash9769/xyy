package com.appfactory.hisaab.staff

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.appfactory.hisaab.data.HisaabDao
import com.appfactory.hisaab.domain.WageType
import com.appfactory.hisaab.ui.components.EmptyState

@Composable
fun StaffListScreen(
    dao: HisaabDao,
    onAddStaff: () -> Unit,
    onOpenStaff: (Long) -> Unit,
    onOpenSettings: () -> Unit,
) {
    val viewModel: StaffListViewModel = viewModel(
        factory = viewModelFactory { initializer { StaffListViewModel(dao) } },
    )
    val staff by viewModel.staff.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Hisaab") },
                actions = {
                    IconButton(onClick = onOpenSettings) {
                        Icon(Icons.Filled.Settings, contentDescription = "Settings")
                    }
                },
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = onAddStaff) {
                Icon(Icons.Filled.Add, contentDescription = "Add staff member")
            }
        },
    ) { padding ->
        if (staff.isEmpty()) {
            EmptyState(
                modifier = Modifier.padding(padding),
                title = "No staff added yet",
                message = "Add a staff member to start tracking attendance and wages.",
                actionLabel = "Add staff member",
                onAction = onAddStaff,
            )
        } else {
            LazyColumn(modifier = Modifier.fillMaxSize().padding(padding)) {
                items(staff, key = { it.id }) { member ->
                    ListItem(
                        headlineContent = { Text(member.name) },
                        supportingContent = {
                            val wageDesc = when (member.wageType) {
                                WageType.MONTHLY -> "₹${member.wageAmount.toInt()}/month"
                                WageType.DAILY -> "₹${member.wageAmount.toInt()}/day"
                            }
                            Text(listOfNotNull(member.roleLabel, wageDesc).joinToString(" · "))
                        },
                        modifier = Modifier.clickable { onOpenStaff(member.id) },
                    )
                }
            }
        }
    }
}
