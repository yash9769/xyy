package com.appfactory.hisaab

import android.app.Application
import com.appfactory.hisaab.data.HisaabDatabase
import com.appfactory.hisaab.data.SettingsRepository

class HisaabApplication : Application() {
    val database: HisaabDatabase by lazy { HisaabDatabase.getInstance(this) }
    val settingsRepository: SettingsRepository by lazy { SettingsRepository(this) }
}
