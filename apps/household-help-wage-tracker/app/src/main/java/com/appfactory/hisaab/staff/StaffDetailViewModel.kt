package com.appfactory.hisaab.staff

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.appfactory.hisaab.data.Advance
import com.appfactory.hisaab.data.AttendanceEntry
import com.appfactory.hisaab.data.HisaabDao
import com.appfactory.hisaab.data.SettledPeriod
import com.appfactory.hisaab.data.StaffMember
import com.appfactory.hisaab.domain.AttendanceCounts
import com.appfactory.hisaab.domain.AttendanceStatus
import com.appfactory.hisaab.domain.WageCalculator
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter

data class StaffDetailUiState(
    val staff: StaffMember? = null,
    val periodStart: LocalDate = LocalDate.now().withDayOfMonth(1),
    val periodEndSoFar: LocalDate = LocalDate.now(),
    val attendanceByDate: Map<LocalDate, AttendanceStatus> = emptyMap(),
    val advances: List<Advance> = emptyList(),
    val grossWageSoFar: Double = 0.0,
    val netPayableSoFar: Double = 0.0,
    val isLoading: Boolean = true,
    val settlementJustCompleted: Boolean = false,
)

class StaffDetailViewModel(
    private val dao: HisaabDao,
    private val staffId: Long,
) : ViewModel() {

    private val formatter = DateTimeFormatter.ISO_LOCAL_DATE

    private val _state = MutableStateFlow(StaffDetailUiState())
    val state: StateFlow<StaffDetailUiState> = _state

    init {
        refresh()
    }

    private fun refresh() {
        viewModelScope.launch {
            val staff = dao.getStaffOnce(staffId) ?: return@launch
            val latestSettlement = dao.getLatestSettledPeriod(staffId)
            val periodStart = latestSettlement?.let { LocalDate.parse(it.periodEnd, formatter).plusDays(1) }
                ?: LocalDate.now().withDayOfMonth(1)
            val today = LocalDate.now()
            val periodEnd = if (periodStart.isAfter(today)) periodStart else today

            val attendanceEntries = dao.getAttendanceForPeriodOnce(staffId, periodStart.format(formatter), periodEnd.format(formatter))
            val advances = dao.getAdvancesForPeriodOnce(staffId, periodStart.format(formatter), periodEnd.format(formatter))

            val attendanceByDate = attendanceEntries.associate { LocalDate.parse(it.date, formatter) to it.status }
            val counts = toCounts(attendanceByDate.values)
            val totalDaysSoFar = java.time.temporal.ChronoUnit.DAYS.between(periodStart, periodEnd).toInt() + 1
            val gross = WageCalculator.grossWage(staff.wageType, staff.wageAmount, counts, totalDaysSoFar)
            val totalAdvances = advances.sumOf { it.amount }

            _state.value = StaffDetailUiState(
                staff = staff,
                periodStart = periodStart,
                periodEndSoFar = periodEnd,
                attendanceByDate = attendanceByDate,
                advances = advances,
                grossWageSoFar = gross,
                netPayableSoFar = WageCalculator.netPayable(gross, totalAdvances),
                isLoading = false,
            )
        }
    }

    private fun toCounts(statuses: Collection<AttendanceStatus>): AttendanceCounts = AttendanceCounts(
        presentDays = statuses.count { it == AttendanceStatus.PRESENT },
        halfDays = statuses.count { it == AttendanceStatus.HALF_DAY },
        absentDays = statuses.count { it == AttendanceStatus.ABSENT },
        leaveDays = statuses.count { it == AttendanceStatus.LEAVE },
    )

    fun markAttendance(date: LocalDate, status: AttendanceStatus?) {
        viewModelScope.launch {
            if (status == null) {
                dao.clearAttendance(staffId, date.format(formatter))
            } else {
                dao.upsertAttendance(AttendanceEntry(staffId = staffId, date = date.format(formatter), status = status))
            }
            refresh()
        }
    }

    fun recordAdvance(amount: Double, date: LocalDate, note: String?) {
        viewModelScope.launch {
            dao.insertAdvance(Advance(staffId = staffId, amount = amount, date = date.format(formatter), note = note))
            refresh()
        }
    }

    fun settleCurrentPeriod() {
        viewModelScope.launch {
            val current = _state.value
            val totalAdvances = current.advances.sumOf { it.amount }
            dao.insertSettledPeriod(
                SettledPeriod(
                    staffId = staffId,
                    periodStart = current.periodStart.format(formatter),
                    periodEnd = current.periodEndSoFar.format(formatter),
                    grossWage = current.grossWageSoFar,
                    totalAdvances = totalAdvances,
                    netPayable = current.netPayableSoFar,
                    settledAt = System.currentTimeMillis(),
                ),
            )
            refresh()
            _state.value = _state.value.copy(settlementJustCompleted = true)
        }
    }

    fun consumeSettlementFlag() {
        _state.value = _state.value.copy(settlementJustCompleted = false)
    }
}
