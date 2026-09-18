package com.appfactory.hisaab.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters

@Database(
    entities = [StaffMember::class, AttendanceEntry::class, Advance::class, SettledPeriod::class],
    version = 1,
    exportSchema = true,
)
@TypeConverters(Converters::class)
abstract class HisaabDatabase : RoomDatabase() {
    abstract fun dao(): HisaabDao

    companion object {
        @Volatile private var instance: HisaabDatabase? = null

        fun getInstance(context: Context): HisaabDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    HisaabDatabase::class.java,
                    "hisaab.db",
                ).build().also { instance = it }
            }
    }
}
