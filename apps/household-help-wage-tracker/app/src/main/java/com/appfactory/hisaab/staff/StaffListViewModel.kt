package com.appfactory.hisaab.staff

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.appfactory.hisaab.data.HisaabDao
import com.appfactory.hisaab.data.StaffMember
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn

class StaffListViewModel(private val dao: HisaabDao) : ViewModel() {
    val staff: StateFlow<List<StaffMember>> = dao.observeAllStaff()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
}
