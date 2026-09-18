package com.appfactory.hisaab.data

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "hisaab_settings")

enum class AppLanguage(val tag: String) { ENGLISH("en"), HINDI("hi") }

class SettingsRepository(private val context: Context) {
    private object Keys {
        val LANGUAGE = stringPreferencesKey("language")
        val ONBOARDING_SEEN = booleanPreferencesKey("onboarding_seen")
    }

    val language = context.dataStore.data.map { prefs ->
        when (prefs[Keys.LANGUAGE]) {
            AppLanguage.HINDI.tag -> AppLanguage.HINDI
            else -> AppLanguage.ENGLISH
        }
    }

    suspend fun setLanguage(language: AppLanguage) {
        context.dataStore.edit { it[Keys.LANGUAGE] = language.tag }
    }
}
