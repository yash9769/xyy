package com.appfactory.hisaab.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.appfactory.hisaab.data.BackupManager
import com.appfactory.hisaab.data.HisaabDao
import com.appfactory.hisaab.data.SettingsRepository
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.launch
import com.appfactory.hisaab.data.AppLanguage

class SettingsViewModel(
    private val dao: HisaabDao,
    private val settingsRepository: SettingsRepository,
) : ViewModel() {

    val language: StateFlow<AppLanguage> = settingsRepository.language
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), AppLanguage.ENGLISH)

    fun setLanguage(language: AppLanguage) {
        viewModelScope.launch { settingsRepository.setLanguage(language) }
    }

    suspend fun buildBackupJson(): String {
        val staff = dao.getAllStaffOnce()
        val attendance = dao.getAllAttendanceOnce()
        val advances = dao.getAllAdvancesOnce()
        val settledPeriods = dao.getAllSettledPeriodsOnce()
        return BackupManager.export(staff, attendance, advances, settledPeriods)
    }

    sealed class RestoreResult {
        data object Success : RestoreResult()
        data class Failure(val message: String) : RestoreResult()
    }

    /**
     * Restoring replaces all existing data (ON DELETE CASCADE from staff_members clears
     * attendance/advances/settled periods too) — the caller must confirm this with the user
     * before calling, since it is destructive and irreversible (see USER_FLOWS.md Flow 7).
     */
    fun restoreFromJson(json: String, onResult: (RestoreResult) -> Unit) {
        viewModelScope.launch {
            try {
                val parsed = BackupManager.parse(json)
                dao.clearAllStaff()
                dao.insertAllStaff(parsed.staff)
                dao.insertAllAttendance(parsed.attendance)
                dao.insertAllAdvances(parsed.advances)
                dao.insertAllSettledPeriods(parsed.settledPeriods)
                onResult(RestoreResult.Success)
            } catch (e: BackupManager.InvalidBackupException) {
                onResult(RestoreResult.Failure(e.message ?: "Invalid backup file"))
            }
        }
    }
}
