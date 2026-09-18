package com.appfactory.template

import android.app.Application

/**
 * Base Application class. Apps generated from this template should rename this class and use it
 * to hold process-wide singletons (Room database instance, DataStore) via simple lazy properties —
 * no DI framework needed at this app size (see templates/android/README.md).
 */
open class TemplateApplication : Application()
