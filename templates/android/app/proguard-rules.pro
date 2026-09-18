# Template R8/ProGuard rules. Kept minimal — add app-specific keep rules only when a real
# obfuscation-related crash is observed, not preemptively.

# Room generates code reflectively accessed via annotation processing; the Room Gradle plugin's
# consumer rules already keep what's needed. No extra Room rules should be necessary here.

# Keep Kotlin Parcelize/Serializable models used for backup export/import, if any, e.g.:
# -keep class com.appfactory.**.model.** { *; }
