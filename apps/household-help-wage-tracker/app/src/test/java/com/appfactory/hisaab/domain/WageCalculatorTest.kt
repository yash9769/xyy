import com.appfactory.hisaab.domain.AttendanceCounts
import com.appfactory.hisaab.domain.WageCalculator
import com.appfactory.hisaab.domain.WageType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class WageCalculatorTest {

    @Test
    fun monthlyWage_allDaysPresent_equalsFullAmount() {
        val counts = AttendanceCounts(presentDays = 30, halfDays = 0, absentDays = 0, leaveDays = 0)
        val gross = WageCalculator.grossWage(WageType.MONTHLY, 9000.0, counts, totalWorkingDaysInPeriod = 30)
        assertEquals(9000.0, gross, 0.001)
    }

    @Test
    fun monthlyWage_someAbsences_proRatedCorrectly() {
        val counts = AttendanceCounts(presentDays = 20, halfDays = 0, absentDays = 10, leaveDays = 0)
        val gross = WageCalculator.grossWage(WageType.MONTHLY, 3000.0, counts, totalWorkingDaysInPeriod = 30)
        // 20/30 * 3000 = 2000
        assertEquals(2000.0, gross, 0.001)
    }

    @Test
    fun monthlyWage_halfDaysCountAsHalf() {
        val counts = AttendanceCounts(presentDays = 0, halfDays = 30, absentDays = 0, leaveDays = 0)
        val gross = WageCalculator.grossWage(WageType.MONTHLY, 3000.0, counts, totalWorkingDaysInPeriod = 30)
        // effectiveWorkedDays = 15, 15/30 * 3000 = 1500
        assertEquals(1500.0, gross, 0.001)
    }

    @Test
    fun dailyWage_multipliesPresentDaysByRate() {
        val counts = AttendanceCounts(presentDays = 12, halfDays = 2, absentDays = 1, leaveDays = 0)
        val gross = WageCalculator.grossWage(WageType.DAILY, 500.0, counts, totalWorkingDaysInPeriod = 15)
        // effectiveWorkedDays = 12 + 1 = 13, 13 * 500 = 6500
        assertEquals(6500.0, gross, 0.001)
    }

    @Test
    fun zeroPresentDays_grossWageIsZero_notCrashOrNaN() {
        val counts = AttendanceCounts(presentDays = 0, halfDays = 0, absentDays = 5, leaveDays = 0)
        val grossMonthly = WageCalculator.grossWage(WageType.MONTHLY, 5000.0, counts, totalWorkingDaysInPeriod = 5)
        val grossDaily = WageCalculator.grossWage(WageType.DAILY, 500.0, counts, totalWorkingDaysInPeriod = 5)
        assertEquals(0.0, grossMonthly, 0.001)
        assertEquals(0.0, grossDaily, 0.001)
        assertTrue(!grossMonthly.isNaN())
    }

    @Test
    fun advancesExceedingGrossWage_netPayableGoesNegative_notClampedToZero() {
        val net = WageCalculator.netPayable(grossWage = 1000.0, totalAdvances = 1500.0)
        assertEquals(-500.0, net, 0.001)
    }

    @Test
    fun zeroTotalWorkingDays_monthlyWage_noDivideByZeroCrash() {
        val counts = AttendanceCounts(presentDays = 0, halfDays = 0, absentDays = 0, leaveDays = 0)
        val gross = WageCalculator.grossWage(WageType.MONTHLY, 5000.0, counts, totalWorkingDaysInPeriod = 0)
        assertEquals(0.0, gross, 0.001)
    }

    @Test(expected = IllegalArgumentException::class)
    fun negativeWageAmount_throws() {
        val counts = AttendanceCounts(presentDays = 1, halfDays = 0, absentDays = 0, leaveDays = 0)
        WageCalculator.grossWage(WageType.DAILY, -100.0, counts, totalWorkingDaysInPeriod = 1)
    }
}
