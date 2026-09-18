import com.appfactory.hisaab.data.Advance
import com.appfactory.hisaab.data.AttendanceEntry
import com.appfactory.hisaab.data.BackupManager
import com.appfactory.hisaab.data.SettledPeriod
import com.appfactory.hisaab.data.StaffMember
import com.appfactory.hisaab.domain.AttendanceStatus
import com.appfactory.hisaab.domain.WageType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class BackupManagerTest {

    private val sampleStaff = listOf(
        StaffMember(id = 1, name = "Asha", wageType = WageType.MONTHLY, wageAmount = 9000.0, roleLabel = "Cook", createdAt = 1000L),
    )
    private val sampleAttendance = listOf(
        AttendanceEntry(id = 1, staffId = 1, date = "2026-09-01", status = AttendanceStatus.PRESENT),
        AttendanceEntry(id = 2, staffId = 1, date = "2026-09-02", status = AttendanceStatus.HALF_DAY),
    )
    private val sampleAdvances = listOf(
        Advance(id = 1, staffId = 1, amount = 500.0, date = "2026-09-05", note = "Festival advance"),
    )
    private val sampleSettled = listOf(
        SettledPeriod(id = 1, staffId = 1, periodStart = "2026-08-01", periodEnd = "2026-08-31", grossWage = 9000.0, totalAdvances = 500.0, netPayable = 8500.0, settledAt = 2000L),
    )

    @Test
    fun exportThenParse_roundTripsExactly() {
        val json = BackupManager.export(sampleStaff, sampleAttendance, sampleAdvances, sampleSettled)
        val parsed = BackupManager.parse(json)

        assertEquals(sampleStaff, parsed.staff)
        assertEquals(sampleAttendance, parsed.attendance)
        assertEquals(sampleAdvances, parsed.advances)
        assertEquals(sampleSettled, parsed.settledPeriods)
    }

    @Test
    fun exportWithNullOptionalFields_roundTrips() {
        val staffNoRole = listOf(StaffMember(id = 2, name = "Ravi", wageType = WageType.DAILY, wageAmount = 400.0, roleLabel = null, createdAt = 3000L))
        val advanceNoNote = listOf(Advance(id = 2, staffId = 2, amount = 100.0, date = "2026-09-10", note = null))
        val json = BackupManager.export(staffNoRole, emptyList(), advanceNoNote, emptyList())
        val parsed = BackupManager.parse(json)

        assertEquals(null, parsed.staff.first().roleLabel)
        assertEquals(null, parsed.advances.first().note)
    }

    @Test
    fun parse_invalidJson_throwsInvalidBackupException_failsClosed() {
        assertThrows(BackupManager.InvalidBackupException::class.java) {
            BackupManager.parse("{ this is not valid json")
        }
    }

    @Test
    fun parse_wrongSchemaVersion_throwsInvalidBackupException() {
        val badJson = """{"schemaVersion": 999, "staff": [], "attendance": [], "advances": [], "settledPeriods": []}"""
        assertThrows(BackupManager.InvalidBackupException::class.java) {
            BackupManager.parse(badJson)
        }
    }

    @Test
    fun parse_missingRequiredField_throwsInvalidBackupException_notCrash() {
        val badJson = """{"schemaVersion": 1, "staff": [{"id": 1}], "attendance": [], "advances": [], "settledPeriods": []}"""
        assertThrows(BackupManager.InvalidBackupException::class.java) {
            BackupManager.parse(badJson)
        }
    }
}
