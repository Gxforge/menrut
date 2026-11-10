// MENRUT — Enrutador de pantallas (SPA de una sola ruta /)
'use client'

import { useAppStore } from '@/lib/store'

// Pública / cliente
import SplashScreen from '@/components/menrut/screens/public/SplashScreen'
import LoginScreen from '@/components/menrut/screens/public/LoginScreen'
import RegisterScreen from '@/components/menrut/screens/public/RegisterScreen'
import RecoveryScreen from '@/components/menrut/screens/public/RecoveryScreen'
import CompleteProfileScreen from '@/components/menrut/screens/public/CompleteProfileScreen'
import HomeScreen from '@/components/menrut/screens/public/HomeScreen'
import FiltersScreen from '@/components/menrut/screens/public/FiltersScreen'
import ResultsScreen from '@/components/menrut/screens/public/ResultsScreen'
import PassportScreen from '@/components/menrut/screens/public/PassportScreen'
import MapScreen from '@/components/menrut/screens/public/MapScreen'
import SavedScreen from '@/components/menrut/screens/public/SavedScreen'
import InboxScreen from '@/components/menrut/screens/public/InboxScreen'
import ChatScreen from '@/components/menrut/screens/public/ChatScreen'
import NotificationsScreen from '@/components/menrut/screens/public/NotificationsScreen'
import ClientProfileScreen from '@/components/menrut/screens/public/ClientProfileScreen'
import BusinessProfileScreen from '@/components/menrut/screens/public/BusinessProfileScreen'
import PrivacyScreen from '@/components/menrut/screens/public/PrivacyScreen'

// Mensajero
import CourierHomeScreen from '@/components/menrut/screens/courier/CourierHomeScreen'
import CourierRoutesScreen from '@/components/menrut/screens/courier/CourierRoutesScreen'
import RouteFormScreen from '@/components/menrut/screens/courier/RouteFormScreen'
import ReputationScreen from '@/components/menrut/screens/courier/ReputationScreen'
import MembershipScreen from '@/components/menrut/screens/courier/MembershipScreen'
import PlanOptionsScreen from '@/components/menrut/screens/courier/PlanOptionsScreen'
import ToolsScreen from '@/components/menrut/screens/courier/ToolsScreen'
import CourierDeliveriesScreen from '@/components/menrut/screens/courier/CourierDeliveriesScreen'
import SettingsScreen from '@/components/menrut/screens/courier/SettingsScreen'

// Administración
import AdminHomeScreen from '@/components/menrut/screens/admin/AdminHomeScreen'
import AdminCouriersScreen from '@/components/menrut/screens/admin/AdminCouriersScreen'
import AdminBusinessesScreen from '@/components/menrut/screens/admin/AdminBusinessesScreen'
import AdminPaymentsScreen from '@/components/menrut/screens/admin/AdminPaymentsScreen'
import AdminToolsScreen from '@/components/menrut/screens/admin/AdminToolsScreen'
import AdminModerationScreen from '@/components/menrut/screens/admin/AdminModerationScreen'
import AdminSettingsScreen from '@/components/menrut/screens/admin/AdminSettingsScreen'
import AdminSystemScreen from '@/components/menrut/screens/admin/AdminSystemScreen'
import AdminDatabasesScreen from '@/components/menrut/screens/admin/AdminDatabasesScreen'

export function AppRouter() {
  const screen = useAppStore((s) => s.screen)

  switch (screen) {
    // Pública / cliente
    case 'splash': return <SplashScreen />
    case 'login': return <LoginScreen />
    case 'register': return <RegisterScreen />
    case 'recovery': return <RecoveryScreen />
    case 'complete-profile': return <CompleteProfileScreen />
    case 'home': return <HomeScreen />
    case 'filters': return <FiltersScreen />
    case 'results': return <ResultsScreen />
    case 'passport': return <PassportScreen />
    case 'map': return <MapScreen />
    case 'saved': return <SavedScreen />
    case 'inbox': return <InboxScreen />
    case 'chat': return <ChatScreen />
    case 'notifications': return <NotificationsScreen />
    case 'client-profile': return <ClientProfileScreen />
    case 'business-profile': return <BusinessProfileScreen />
    case 'privacy': return <PrivacyScreen />
    // Mensajero
    case 'courier-home': return <CourierHomeScreen />
    case 'courier-routes': return <CourierRoutesScreen />
    case 'route-form': return <RouteFormScreen />
    case 'reputation': return <ReputationScreen />
    case 'membership': return <MembershipScreen />
    case 'plan-options': return <PlanOptionsScreen />
    case 'tools': return <ToolsScreen />
    case 'courier-deliveries': return <CourierDeliveriesScreen />
    case 'settings': return <SettingsScreen />
    // Administración
    case 'admin-home': return <AdminHomeScreen />
    case 'admin-couriers': return <AdminCouriersScreen />
    case 'admin-businesses': return <AdminBusinessesScreen />
    case 'admin-payments': return <AdminPaymentsScreen />
    case 'admin-tools': return <AdminToolsScreen />
    case 'admin-moderation': return <AdminModerationScreen />
    case 'admin-settings': return <AdminSettingsScreen />
    case 'admin-system': return <AdminSystemScreen />
    case 'admin-databases': return <AdminDatabasesScreen />
    default: return <HomeScreen />
  }
}
