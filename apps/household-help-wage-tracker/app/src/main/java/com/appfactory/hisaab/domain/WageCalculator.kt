package com.appfactory.hisaab.domain

/**
 * Pure Kotlin business logic — no Android imports, so it is fully unit-testable on the JVM
 * without Robolectric. This is the one piece of the app that must never be wrong (see
 * apps/household-help-wage-tracker/TEST_PLAN.md).
 */
enum class WageType { MONTHLY, DAILY }

enum class AttendanceStatus { PRESENT, ABSENT, HALF_DAY, LEAVE }

data class AttendanceCounts(
    val presentDays: Int,
    val halfDays: Int,
    val absentDays: Int,
    val leaveDays: Int,
) {
    /** Half-days count as 0.5 toward "days worked" for wage purposes. */
    val effectiveWorkedDays: Double get() = presentDays + (halfDays * 0.5)
}

object WageCalculator {

    /**
     * Monthly wage is pro-rated by effective worked days over total working days in the period.
     * Daily wage needs no pro-ration: it is simply effective worked days times the daily rate.
     *
     * @param totalWorkingDaysInPeriod must be > 0 when [wageType] is MONTHLY (a period with zero
     *   working days — e.g. settling on the first day of a new period — has no meaningful
     *   pro-ration denominator; callers should treat that as "nothing to settle yet", not call
     *   this function with 0).
     */
    fun grossWage(
        wageType: WageType,
        wageAmount: Double,
        counts: AttendanceCounts,
        totalWorkingDaysInPeriod: Int,
    ): Double {
        require(wageAmount >= 0) { "wageAmount must not be negative" }
        return when (wageType) {
            WageType.DAILY -> counts.effectiveWorkedDays * wageAmount
            WageType.MONTHLY -> {
                if (totalWorkingDaysInPeriod <= 0) return 0.0
                wageAmount * (counts.effectiveWorkedDays / totalWorkingDaysInPeriod)
            }
        }
    }

    /**
     * Net payable can legitimately be negative if advances exceed the gross wage earned so far —
     * this is surfaced to the user as-is (e.g. "staff member owes ₹200 back"), never silently
     * clamped to zero, because hiding that would misrepresent the real amount owed.
     */
    fun netPayable(grossWage: Double, totalAdvances: Double): Double = grossWage - totalAdvances
}
