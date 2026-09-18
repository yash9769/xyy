package com.appfactory.hisaab.data

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface HisaabDao {

    // -- Staff members --
    @Insert
    suspend fun insertStaff(staff: StaffMember): Long

    @Update
    suspend fun updateStaff(staff: StaffMember)

    @Delete
    suspend fun deleteStaff(staff: StaffMember)

    @Query("SELECT * FROM staff_members ORDER BY createdAt ASC")
    fun observeAllStaff(): Flow<List<StaffMember>>

    @Query("SELECT * FROM staff_members WHERE id = :staffId")
    fun observeStaff(staffId: Long): Flow<StaffMember?>

    @Query("SELECT * FROM staff_members WHERE id = :staffId")
    suspend fun getStaffOnce(staffId: Long): StaffMember?

    // -- Attendance --
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAttendance(entry: AttendanceEntry)

    @Query("DELETE FROM attendance_entries WHERE staffId = :staffId AND date = :date")
    suspend fun clearAttendance(staffId: Long, date: String)

    @Query(
        "SELECT * FROM attendance_entries WHERE staffId = :staffId AND date BETWEEN :periodStart AND :periodEnd ORDER BY date ASC",
    )
    fun observeAttendanceForPeriod(staffId: Long, periodStart: String, periodEnd: String): Flow<List<AttendanceEntry>>

    @Query(
        "SELECT * FROM attendance_entries WHERE staffId = :staffId AND date BETWEEN :periodStart AND :periodEnd ORDER BY date ASC",
    )
    suspend fun getAttendanceForPeriodOnce(staffId: Long, periodStart: String, periodEnd: String): List<AttendanceEntry>

    // -- Advances --
    @Insert
    suspend fun insertAdvance(advance: Advance): Long

    @Query(
        "SELECT * FROM advances WHERE staffId = :staffId AND date BETWEEN :periodStart AND :periodEnd ORDER BY date DESC",
    )
    fun observeAdvancesForPeriod(staffId: Long, periodStart: String, periodEnd: String): Flow<List<Advance>>

    @Query(
        "SELECT * FROM advances WHERE staffId = :staffId AND date BETWEEN :periodStart AND :periodEnd ORDER BY date DESC",
    )
    suspend fun getAdvancesForPeriodOnce(staffId: Long, periodStart: String, periodEnd: String): List<Advance>

    // -- Settled periods --
    @Insert
    suspend fun insertSettledPeriod(period: SettledPeriod): Long

    @Query("SELECT * FROM settled_periods WHERE staffId = :staffId ORDER BY settledAt DESC")
    fun observeSettledPeriods(staffId: Long): Flow<List<SettledPeriod>>

    @Query("SELECT * FROM settled_periods WHERE staffId = :staffId ORDER BY periodEnd DESC LIMIT 1")
    suspend fun getLatestSettledPeriod(staffId: Long): SettledPeriod?

    // -- Backup export/import support --
    @Query("SELECT * FROM staff_members")
    suspend fun getAllStaffOnce(): List<StaffMember>

    @Query("SELECT * FROM attendance_entries")
    suspend fun getAllAttendanceOnce(): List<AttendanceEntry>

    @Query("SELECT * FROM advances")
    suspend fun getAllAdvancesOnce(): List<Advance>

    @Query("SELECT * FROM settled_periods")
    suspend fun getAllSettledPeriodsOnce(): List<SettledPeriod>

    @Query("DELETE FROM staff_members")
    suspend fun clearAllStaff()

    @Insert
    suspend fun insertAllStaff(staff: List<StaffMember>): List<Long>

    @Insert
    suspend fun insertAllAttendance(entries: List<AttendanceEntry>)

    @Insert
    suspend fun insertAllAdvances(advances: List<Advance>)

    @Insert
    suspend fun insertAllSettledPeriods(periods: List<SettledPeriod>)
}
