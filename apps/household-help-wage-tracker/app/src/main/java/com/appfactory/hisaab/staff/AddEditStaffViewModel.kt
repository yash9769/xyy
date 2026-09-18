package com.appfactory.hisaab.staff

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.appfactory.hisaab.data.HisaabDao
import com.appfactory.hisaab.data.StaffMember
import com.appfactory.hisaab.domain.WageType
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class AddEditStaffState(
    val name: String = "",
    val wageType: WageType = WageType.MONTHLY,
    val wageAmount: String = "",
    val roleLabel: String = "",
    val nameError: String? = null,
    val wageAmountError: String? = null,
    val isEditing: Boolean = false,
    val saved: Boolean = false,
    val originalCreatedAt: Long = System.currentTimeMillis(),
) {
    val isValid: Boolean get() = nameError == null && wageAmountError == null && name.isNotBlank() && wageAmount.toDoubleOrNull()?.let { it > 0 } == true
}

class AddEditStaffViewModel(
    private val dao: HisaabDao,
    private val staffId: Long?,
) : ViewModel() {

    private val _state = MutableStateFlow(AddEditStaffState(isEditing = staffId != null))
    val state: StateFlow<AddEditStaffState> = _state

    init {
        if (staffId != null) {
            viewModelScope.launch {
                dao.observeStaff(staffId).collect { member ->
                    if (member != null) {
                        _state.value = _state.value.copy(
                            name = member.name,
                            wageType = member.wageType,
                            wageAmount = member.wageAmount.toString(),
                            roleLabel = member.roleLabel.orEmpty(),
                            originalCreatedAt = member.createdAt,
                        )
                    }
                }
            }
        }
    }

    fun onNameChange(value: String) {
        _state.value = _state.value.copy(
            name = value,
            nameError = if (value.isBlank()) "Name is required" else null,
        )
    }

    fun onWageTypeChange(value: WageType) {
        _state.value = _state.value.copy(wageType = value)
    }

    fun onWageAmountChange(value: String) {
        val amount = value.toDoubleOrNull()
        _state.value = _state.value.copy(
            wageAmount = value,
            wageAmountError = when {
                value.isBlank() -> "Wage amount is required"
                amount == null -> "Enter a valid number"
                amount <= 0 -> "Wage amount must be greater than zero"
                else -> null
            },
        )
    }

    fun onRoleLabelChange(value: String) {
        _state.value = _state.value.copy(roleLabel = value)
    }

    fun save() {
        val current = _state.value
        if (!current.isValid) return
        viewModelScope.launch {
            val amount = current.wageAmount.toDouble()
            val role = current.roleLabel.trim().ifBlank { null }
            if (staffId != null) {
                dao.updateStaff(
                    StaffMember(
                        id = staffId,
                        name = current.name.trim(),
                        wageType = current.wageType,
                        wageAmount = amount,
                        roleLabel = role,
                        createdAt = current.originalCreatedAt,
                    ),
                )
            } else {
                dao.insertStaff(
                    StaffMember(
                        name = current.name.trim(),
                        wageType = current.wageType,
                        wageAmount = amount,
                        roleLabel = role,
                        createdAt = System.currentTimeMillis(),
                    ),
                )
            }
            _state.value = _state.value.copy(saved = true)
        }
    }
}
