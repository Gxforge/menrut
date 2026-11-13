// MENRUT — Store global de navegación y sesión (Zustand)
import { create } from 'zustand'
import { clearChatCache } from '@/lib/chat-cache'
import { clearQrQueue } from '@/lib/qr-delivery'
import { clearPersistedQueries } from '@/lib/query-cache'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ScreenId, SessionUser, SearchFilters, CoverageType } from './types'

// T8-c (tipos de mensajero): el buscador incorpora un filtro `coverageType`.
// `SearchFilters` vive en types.ts (contrato backend, solo lectura), así que el
// campo extra del buscador se declara aquí. 'any' = sin filtro.
export type SearchFiltersState = SearchFilters & {
  coverageType: 'any' | CoverageType
}

interface AppState {
  screen: ScreenId
  history: ScreenId[]
  session: SessionUser | null
  search: SearchFiltersState
  selectedCourierId: string | null
  activeConversationId: string | null
  activeConversationOtherName: string | null
  editingRouteId: string | null // para route-form en modo edición
  hydrated: boolean

  navigate: (s: ScreenId) => void
  back: () => void
  resetTo: (s: ScreenId) => void
  setSession: (u: SessionUser | null) => void
  logout: () => void
  setSearch: (patch: Partial<SearchFiltersState>) => void
  clearSearch: () => void
  selectCourier: (id: string) => void
  openConversation: (id: string, otherName: string) => void
  setEditingRoute: (id: string | null) => void
  setHydrated: (v: boolean) => void
}

export const DEFAULT_SEARCH: SearchFiltersState = {
  originId: null,
  destinationId: null,
  routeMode: 'any',
  serviceType: 'any',
  vehicle: 'any',
  minRating: null,
  maxFee: null,
  onlyVerified: false,
  sort: 'relevance',
  coverageType: 'any',
}

// Pantallas sin navegación inferior
export const FULLSCREEN_SCREENS: ScreenId[] = [
  'splash', 'login', 'register', 'recovery',
]

// Pantallas que pertenecen al panel admin (navegación propia)
export const ADMIN_SCREENS: ScreenId[] = [
  'admin-home', 'admin-couriers', 'admin-businesses', 'admin-payments',
  'admin-tools', 'admin-moderation', 'admin-settings', 'admin-system',
]

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      screen: 'splash',
      history: [],
      session: null,
      search: { ...DEFAULT_SEARCH },
      selectedCourierId: null,
      activeConversationId: null,
      activeConversationOtherName: null,
      editingRouteId: null,
      hydrated: false,

      navigate: (s) => {
        const { screen, history } = get()
        if (s === screen) return
        set({ screen: s, history: [...history, screen].slice(-30) })
      },

      back: () => {
        const { history } = get()
        if (history.length === 0) return
        const prev = history[history.length - 1]
        set({ screen: prev, history: history.slice(0, -1) })
      },

      resetTo: (s) => set({ screen: s, history: [] }),

      setSession: (u) => set({ session: u }),

      logout: () => {
        clearChatCache()
        clearQrQueue()
        clearPersistedQueries()
        set({
          session: null,
          screen: 'home',
          history: [],
          selectedCourierId: null,
          activeConversationId: null,
        })
      },

      setSearch: (patch) => set({ search: { ...get().search, ...patch } }),

      clearSearch: () => set({ search: { ...DEFAULT_SEARCH } }),

      selectCourier: (id) => set({ selectedCourierId: id }),

      openConversation: (id, otherName) =>
        set({ activeConversationId: id, activeConversationOtherName: otherName }),

      setEditingRoute: (id) => set({ editingRouteId: id }),

      setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: 'menrut-store',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // La pantalla NO se persiste: cada apertura de la app arranca en el
      // splash (comportamiento PWA) y de ahí a la pantalla del rol.
      partialize: (state) => ({
        session: state.session,
        search: state.search,
      }),
      // Migración v0 → v1: la app anterior (Vite) sí persistía «screen»; si
      // alguien quedó con un login abandonado en el almacenamiento local, se
      // descarta aquí ANTES de fusionar, para que nunca arranque en login.
      migrate: (persisted) => {
        if (persisted && typeof persisted === 'object') {
          delete (persisted as Record<string, unknown>).screen
        }
        return persisted as { session: AppState['session']; search: SearchFiltersState }
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true)
      },
    }
  )
)

// ¿Hay sesión activa? (helper)
export const isLoggedIn = (s: AppState) => s.session !== null
export const isCourierSession = (s: AppState) => s.session?.role === 'courier'
export const isAdminSession = (s: AppState) => s.session?.role === 'admin'
