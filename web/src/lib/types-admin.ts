// MENRUT — Tipos del dominio de administración: panel general, cuentas,
// auditoría, moderación, sistema y bases de datos en vivo.

import type { Role } from './types-shared'

// ─── Administración ─────────────────────────────────────────────────────────

export interface AdminOverviewDto {
  couriers: { total: number; verified: number; pending: number; hidden: number }
  clients: { total: number }
  routes: { active: number; scheduled: number }
  payments: { pending: number; approvedThisMonth: number }
  reports: { open: number }
  demoCouriers: number
}

export interface AdminCourierDto {
  courierId: string
  userId: string
  fullName: string
  email: string
  avatarUrl: string | null
  verificationStatus: string
  isPublic: boolean
  ratingAvg: number
  ratingCount: number
  routesCount: number
  planName: string | null
  planExpiresAt: string | null
  permanenceCredits: number
  createdAt: string
  isDemo: boolean
}

export interface AdminAccountDto {
  id: string
  fullName: string
  email: string
  role: Role
  status: string
  createdAt: string
  reportsCount: number
}

export interface AuditLogDto {
  id: string
  actorName: string
  action: string
  entityType: string
  entityId: string
  detail: string
  createdAt: string
}

export interface ReportFlagDto {
  id: string
  reporterName: string
  targetType: string
  targetId: string
  reason: string
  status: string
  createdAt: string
}

export interface SystemStatusDto {
  databaseOk: boolean
  territories: number
  couriers: number
  users: number
  routes: number
  conversations: number
  notifications: number
  auditEvents: number
  demoShare: number
  reconciliation: {
    id: string
    startedAt: string
    finishedAt: string | null
    pendingBefore: number
    synced: number
    reservationsReleased: number
    orphansRepaired: number
    ok: boolean
    detail: string
  } | null
}

// ─── Panel admin · Bases de datos en vivo (sondas reales por binding) ──────

export interface SupabaseProjectDto {
  name: string
  ref: string
  url: string
  region: string
  /** Producción (Auth + Storage) o reservado (entorno de pruebas aislado). */
  role: string
  reserved: boolean
  healthy: boolean
}

export interface ShardDatabaseDto {
  id: number
  binding: string
  database: string
  role: string
  enabled: boolean
  ok: boolean
  sizeBytes: number
  capacityBytes: number
  usedPct: number
  couriers: number
  profiles: number
  routes: number
  reviews: number
  wallets: number
  pendingOutbox: number
  schemaVersion: number
  measuredAt: string | null
}

export interface CoreDatabaseDto {
  ok: boolean
  name: string
  binding: string
  role: string
  tables: number
  accounts: number
  couriersPublic: number
  paymentsPending: number
  territories: number
  shardsRegistered: number
  shardsEnabled: number
  roundRobinLastShard: number
}

export interface DatabasesStatusDto {
  ok: boolean
  checkedAt: string
  core: CoreDatabaseDto
  shards: ShardDatabaseDto[]
  supabase: { ok: boolean; projects: SupabaseProjectDto[] }
  totals: { d1Databases: number; totalSizeBytes: number; couriersAssigned: number }
}
