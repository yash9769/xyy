package com.appfactory.hisaab.data

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import com.appfactory.hisaab.domain.AttendanceStatus
import com.appfactory.hisaab.domain.WageType

@Entity(tableName = "staff_members")
data class StaffMember(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val wageType: WageType,
    val wageAmount: Double,
    val roleLabel: String? = null,
    val createdAt: Long,
)

@Entity(
    tableName = "attendance_entries",
    foreignKeys = [
        ForeignKey(
            entity = StaffMember::class,
            parentColumns = ["id"],
            childColumns = ["staffId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index("staffId"), Index(value = ["staffId", "date"], unique = true)],
)
data class AttendanceEntry(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val staffId: Long,
    /** ISO-8601 local date string (yyyy-MM-dd), avoids timezone ambiguity for a purely local app. */
    val date: String,
    val status: AttendanceStatus,
)

@Entity(
    tableName = "advances",
    foreignKeys = [
        ForeignKey(
            entity = StaffMember::class,
            parentColumns = ["id"],
            childColumns = ["staffId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index("staffId")],
)
data class Advance(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val staffId: Long,
    val amount: Double,
    val date: String,
    val note: String? = null,
)

@Entity(
    tableName = "settled_periods",
    foreignKeys = [
        ForeignKey(
            entity = StaffMember::class,
            parentColumns = ["id"],
            childColumns = ["staffId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index("staffId")],
)
data class SettledPeriod(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val staffId: Long,
    val periodStart: String,
    val periodEnd: String,
    val grossWage: Double,
    val totalAdvances: Double,
    val netPayable: Double,
    val settledAt: Long,
)
