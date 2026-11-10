// MENRUT — MapScreen · constantes territoriales, tipos y helpers de localStorage.

// ─── Organización territorial (occidente → centro → oriente) ────────────────
// Solo agrupa la vista; no son datos de producto.

export const REGION_ORDER = ['Occidente', 'Centro', 'Oriente'] as const
export type RegionLabel = (typeof REGION_ORDER)[number]

export const PROVINCE_REGION: Record<string, RegionLabel> = {
  'Pinar del Río': 'Occidente', 'Artemisa': 'Occidente', 'La Habana': 'Occidente',
  'Mayabeque': 'Occidente', 'Matanzas': 'Occidente', 'Isla de la Juventud': 'Occidente',
  'Villa Clara': 'Centro', 'Cienfuegos': 'Centro', 'Sancti Spíritus': 'Centro',
  'Ciego de Ávila': 'Centro', 'Camagüey': 'Centro',
  'Las Tunas': 'Oriente', 'Holguín': 'Oriente', 'Granma': 'Oriente',
  'Santiago de Cuba': 'Oriente', 'Guantánamo': 'Oriente',
}

// Vecindades geográficas reales: se usan para sugerir alternativas cuando una
// provincia no tiene rutas publicadas.
export const NEIGHBORS: Record<string, string[]> = {
  'Pinar del Río': ['Artemisa'],
  'Artemisa': ['Pinar del Río', 'La Habana'],
  'La Habana': ['Artemisa', 'Mayabeque'],
  'Mayabeque': ['La Habana', 'Matanzas'],
  'Matanzas': ['Mayabeque', 'Villa Clara', 'Isla de la Juventud'],
  'Isla de la Juventud': ['La Habana', 'Matanzas'],
  'Villa Clara': ['Matanzas', 'Cienfuegos', 'Sancti Spíritus'],
  'Cienfuegos': ['Villa Clara', 'Sancti Spíritus'],
  'Sancti Spíritus': ['Villa Clara', 'Cienfuegos', 'Ciego de Ávila'],
  'Ciego de Ávila': ['Sancti Spíritus', 'Camagüey'],
  'Camagüey': ['Ciego de Ávila', 'Las Tunas'],
  'Las Tunas': ['Camagüey', 'Holguín'],
  'Holguín': ['Las Tunas', 'Granma', 'Santiago de Cuba'],
  'Granma': ['Holguín', 'Las Tunas', 'Santiago de Cuba'],
  'Santiago de Cuba': ['Holguín', 'Granma', 'Guantánamo'],
  'Guantánamo': ['Santiago de Cuba', 'Holguín'],
}

export const LS_LIST_MODE = 'menrut-map-list-mode'
export const LS_ZONE = 'menrut-map-zone'

export function readLS(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeLS(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Sin almacenamiento disponible: la preferencia vive solo en memoria.
  }
}

// ─── Tipos locales ──────────────────────────────────────────────────────────

export interface ProvinceCount {
  id: string
  name: string
  region: RegionLabel | 'Otras'
  count: number
}
