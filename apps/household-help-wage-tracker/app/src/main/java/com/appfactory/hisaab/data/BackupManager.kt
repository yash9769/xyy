package com.appfactory.hisaab.data

import com.appfactory.hisaab.domain.AttendanceStatus
import com.appfactory.hisaab.domain.WageType
import org.json.JSONArray
import org.json.JSONObject

/**
 * Local-only backup/restore, serialized to a single JSON file. Uses org.json (bundled with the
 * Android platform) rather than adding a serialization library dependency — the schema is small
 * and flat. This is the app's alternative to cloud sync: the user keeps a copy of their own data
 * without the app ever needing a network permission (see PRIVACY.md).
 */
object BackupManager {

    const val SCHEMA_VERSION = 1

    fun export(
        staff: List<StaffMember>,
        attendance: List<AttendanceEntry>,
        advances: List<Advance>,
        settledPeriods: List<SettledPeriod>,
    ): String {
        val root = JSONObject()
        root.put("schemaVersion", SCHEMA_VERSION)

        root.put("staff", JSONArray(staff.map { s ->
            JSONObject().apply {
                put("id", s.id)
                put("name", s.name)
                put("wageType", s.wageType.name)
                put("wageAmount", s.wageAmount)
                put("roleLabel", s.roleLabel)
                put("createdAt", s.createdAt)
            }
        }))

        root.put("attendance", JSONArray(attendance.map { a ->
            JSONObject().apply {
                put("id", a.id)
                put("staffId", a.staffId)
                put("date", a.date)
                put("status", a.status.name)
            }
        }))

        root.put("advances", JSONArray(advances.map { adv ->
            JSONObject().apply {
                put("id", adv.id)
                put("staffId", adv.staffId)
                put("amount", adv.amount)
                put("date", adv.date)
                put("note", adv.note)
            }
        }))

        root.put("settledPeriods", JSONArray(settledPeriods.map { p ->
            JSONObject().apply {
                put("id", p.id)
                put("staffId", p.staffId)
                put("periodStart", p.periodStart)
                put("periodEnd", p.periodEnd)
                put("grossWage", p.grossWage)
                put("totalAdvances", p.totalAdvances)
                put("netPayable", p.netPayable)
                put("settledAt", p.settledAt)
            }
        }))

        return root.toString(2)
    }

    class InvalidBackupException(message: String) : Exception(message)

    data class ParsedBackup(
        val staff: List<StaffMember>,
        val attendance: List<AttendanceEntry>,
        val advances: List<Advance>,
        val settledPeriods: List<SettledPeriod>,
    )

    /** Fails closed: any structural problem throws [InvalidBackupException] and imports nothing. */
    fun parse(jsonText: String): ParsedBackup {
        val root = try {
            JSONObject(jsonText)
        } catch (e: Exception) {
            throw InvalidBackupException("File is not valid JSON")
        }

        val schemaVersion = root.optInt("schemaVersion", -1)
        if (schemaVersion != SCHEMA_VERSION) {
            throw InvalidBackupException("Unsupported backup schema version: $schemaVersion")
        }

        try {
            val staff = root.getJSONArray("staff").let { arr ->
                (0 until arr.length()).map { i ->
                    val o = arr.getJSONObject(i)
                    StaffMember(
                        id = o.getLong("id"),
                        name = o.getString("name"),
                        wageType = WageType.valueOf(o.getString("wageType")),
                        wageAmount = o.getDouble("wageAmount"),
                        roleLabel = if (o.isNull("roleLabel") || !o.has("roleLabel")) null else o.getString("roleLabel"),
                        createdAt = o.getLong("createdAt"),
                    )
                }
            }
            val attendance = root.getJSONArray("attendance").let { arr ->
                (0 until arr.length()).map { i ->
                    val o = arr.getJSONObject(i)
                    AttendanceEntry(
                        id = o.getLong("id"),
                        staffId = o.getLong("staffId"),
                        date = o.getString("date"),
                        status = AttendanceStatus.valueOf(o.getString("status")),
                    )
                }
            }
            val advances = root.getJSONArray("advances").let { arr ->
                (0 until arr.length()).map { i ->
                    val o = arr.getJSONObject(i)
                    Advance(
                        id = o.getLong("id"),
                        staffId = o.getLong("staffId"),
                        amount = o.getDouble("amount"),
                        date = o.getString("date"),
                        note = if (o.isNull("note") || !o.has("note")) null else o.getString("note"),
                    )
                }
            }
            val settledPeriods = root.getJSONArray("settledPeriods").let { arr ->
                (0 until arr.length()).map { i ->
                    val o = arr.getJSONObject(i)
                    SettledPeriod(
                        id = o.getLong("id"),
                        staffId = o.getLong("staffId"),
                        periodStart = o.getString("periodStart"),
                        periodEnd = o.getString("periodEnd"),
                        grossWage = o.getDouble("grossWage"),
                        totalAdvances = o.getDouble("totalAdvances"),
                        netPayable = o.getDouble("netPayable"),
                        settledAt = o.getLong("settledAt"),
                    )
                }
            }
            return ParsedBackup(staff, attendance, advances, settledPeriods)
        } catch (e: InvalidBackupException) {
            throw e
        } catch (e: Exception) {
            throw InvalidBackupException("Backup file is missing expected fields: ${e.message}")
        }
    }
}
