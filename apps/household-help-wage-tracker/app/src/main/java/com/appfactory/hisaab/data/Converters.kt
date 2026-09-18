package com.appfactory.hisaab.data

import androidx.room.TypeConverter
import com.appfactory.hisaab.domain.AttendanceStatus
import com.appfactory.hisaab.domain.WageType

class Converters {
    @TypeConverter
    fun fromWageType(value: WageType): String = value.name

    @TypeConverter
    fun toWageType(value: String): WageType = WageType.valueOf(value)

    @TypeConverter
    fun fromAttendanceStatus(value: AttendanceStatus): String = value.name

    @TypeConverter
    fun toAttendanceStatus(value: String): AttendanceStatus = AttendanceStatus.valueOf(value)
}
