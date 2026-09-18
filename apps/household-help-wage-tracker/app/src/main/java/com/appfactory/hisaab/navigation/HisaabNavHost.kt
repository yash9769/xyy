package com.appfactory.hisaab.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.appfactory.hisaab.data.HisaabDao
import com.appfactory.hisaab.data.SettingsRepository
import com.appfactory.hisaab.settings.SettingsScreen
import com.appfactory.hisaab.staff.AddEditStaffScreen
import com.appfactory.hisaab.staff.StaffDetailScreen
import com.appfactory.hisaab.staff.StaffListScreen

private const val ARG_STAFF_ID = "staffId"

sealed class Dest(val route: String) {
    data object StaffList : Dest("staffList")
    data object AddStaff : Dest("addStaff")
    data object EditStaff : Dest("editStaff/{$ARG_STAFF_ID}") {
        fun routeFor(staffId: Long) = "editStaff/$staffId"
    }
    data object StaffDetail : Dest("staffDetail/{$ARG_STAFF_ID}") {
        fun routeFor(staffId: Long) = "staffDetail/$staffId"
    }
    data object Settings : Dest("settings")
}

@Composable
fun HisaabNavHost(
    dao: HisaabDao,
    settingsRepository: SettingsRepository,
    navController: NavHostController = rememberNavController(),
) {
    NavHost(navController = navController, startDestination = Dest.StaffList.route) {
        composable(Dest.StaffList.route) {
            StaffListScreen(
                dao = dao,
                onAddStaff = { navController.navigate(Dest.AddStaff.route) },
                onOpenStaff = { id -> navController.navigate(Dest.StaffDetail.routeFor(id)) },
                onOpenSettings = { navController.navigate(Dest.Settings.route) },
            )
        }
        composable(Dest.AddStaff.route) {
            AddEditStaffScreen(dao = dao, staffId = null, onDone = { navController.popBackStack() })
        }
        composable(
            Dest.EditStaff.route,
            arguments = listOf(navArgument(ARG_STAFF_ID) { type = NavType.LongType }),
        ) { backStackEntry ->
            val staffId = backStackEntry.arguments?.getLong(ARG_STAFF_ID)
            AddEditStaffScreen(dao = dao, staffId = staffId, onDone = { navController.popBackStack() })
        }
        composable(
            Dest.StaffDetail.route,
            arguments = listOf(navArgument(ARG_STAFF_ID) { type = NavType.LongType }),
        ) { backStackEntry ->
            val staffId = backStackEntry.arguments?.getLong(ARG_STAFF_ID) ?: return@composable
            StaffDetailScreen(
                dao = dao,
                staffId = staffId,
                onEdit = { navController.navigate(Dest.EditStaff.routeFor(staffId)) },
                onBack = { navController.popBackStack() },
            )
        }
        composable(Dest.Settings.route) {
            SettingsScreen(
                dao = dao,
                settingsRepository = settingsRepository,
                onBack = { navController.popBackStack() },
            )
        }
    }
}
