// MENRUT — Perfil del negocio (variante de ClientProfileScreen)
// Base compartida (avatar, cuenta, actividad, soporte, privacidad, sesión) más:
//  - Tarjeta «Negocio»: nombre comercial, municipio y descripción. Se guarda SOLO
//    en localStorage a la espera de un endpoint específico (no se simula sync).
//  - Tarjeta «Buscar mensajeros para entregas» con nota de entregas comerciales.
'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronRight, Loader2, Package, Store, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  AccountCard, ActivityCard, LogoutCard, PrivacyCard, ProfileHeader, SessionGate, SupportCard, TabHeader,
} from '@/components/menrut/screens/public/ClientProfileScreen'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'

// Borrador local del negocio (pendiente de endpoint específico en la API)
const LS_BUSINESS = 'menrut-business-draft'

interface BusinessDraft {
  name: string
  province: string
  municipality: string
  description: string
}

const EMPTY_DRAFT: BusinessDraft = { name: '', province: '', municipality: '', description: '' }

function loadDraft(): BusinessDraft {
  if (typeof window === 'undefined') return EMPTY_DRAFT
  try {
    const raw = localStorage.getItem(LS_BUSINESS)
    return raw ? { ...EMPTY_DRAFT, ...(JSON.parse(raw) as Partial<BusinessDraft>) } : EMPTY_DRAFT
  } catch {
    return EMPTY_DRAFT
  }
}

export default function BusinessProfileScreen() {
  const session = useAppStore((s) => s.session)

  if (!session) return <SessionGate feature="El perfil del negocio" />

  return (
    <div className="pb-10">
      <TabHeader title="Perfil del negocio" subtitle="Tu cuenta comercial en MENRUT" />
      <div className="space-y-4 px-4 pt-4">
        <ProfileHeader session={session} />
        <BusinessCard />
        <DeliveriesCard />
        <AccountCard session={session} />
        <ActivityCard />
        <GeneralProfileLink />
        <SupportCard />
        <PrivacyCard />
        <div className="pt-1">
          <LogoutCard />
        </div>
        <p className="pt-1 text-center text-[10.5px] tracking-wide text-muted-foreground">
          MENRUT · Conectamos caminos.
        </p>
      </div>
    </div>
  )
}

// ─── Tarjeta Negocio (borrador local, sin sincronización simulada) ──────────

function BusinessCard() {
  const [draft, setDraft] = useState<BusinessDraft>(loadDraft)
  const [saving, setSaving] = useState(false)

  const territories = useQuery({
    queryKey: ['territories'],
    queryFn: () => api.territories(),
    staleTime: 24 * 60 * 60 * 1000,
  })

  const provinces = territories.data?.provinces ?? []
  const municipalities = useMemo(
    () => provinces.find((p) => p.name === draft.province)?.municipalities ?? [],
    [provinces, draft.province]
  )

  function set<K extends keyof BusinessDraft>(key: K, value: BusinessDraft[K]) {
    setDraft((d) => ({
      ...d,
      [key]: value,
      ...(key === 'province' ? { municipality: '' } : {}),
    }))
  }

  async function save() {
    setSaving(true)
    try {
      // Endpoint específico pendiente: hoy solo se conserva en este dispositivo.
      localStorage.setItem(LS_BUSINESS, JSON.stringify(draft))
      await new Promise((r) => setTimeout(r, 250)) // breve feedback del guardado
      toast.success('Datos del negocio guardados en este dispositivo')
    } catch {
      toast.error('No se pudieron guardar los datos en este dispositivo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="section-title flex items-center gap-2">
          <Store className="h-4.5 w-4.5 text-navy" aria-hidden />
          Negocio
        </h3>
        <span className="rounded-full bg-orange/10 px-2 py-0.5 text-[10px] font-bold text-orange">
          Se guardará próximamente
        </span>
      </div>
      <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
        Estos datos se guardan en este dispositivo. La sincronización con tu cuenta estará disponible próximamente.
      </p>

      <div className="mt-3 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="biz-name">Nombre comercial</Label>
          <Input
            id="biz-name"
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Ej. Dulcería El Mercado"
            maxLength={80}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label>Provincia</Label>
            <Select value={draft.province} onValueChange={(v) => set('province', v)}>
              <SelectTrigger className="h-11 w-full rounded-xl text-[13px]" aria-label="Provincia del negocio">
                <SelectValue placeholder="Provincia" />
              </SelectTrigger>
              <SelectContent>
                {provinces.map((p) => (
                  <SelectItem key={p.id} value={p.name}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Municipio</Label>
            <Select
              value={draft.municipality}
              onValueChange={(v) => set('municipality', v)}
              disabled={!draft.province}
            >
              <SelectTrigger className="h-11 w-full rounded-xl text-[13px]" aria-label="Municipio del negocio">
                <SelectValue placeholder={draft.province ? 'Municipio' : 'Elige provincia'} />
              </SelectTrigger>
              <SelectContent>
                {municipalities.map((m) => (
                  <SelectItem key={m.id} value={m.name}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="biz-desc">Descripción del negocio</Label>
          <Textarea
            id="biz-desc"
            value={draft.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Qué entregas necesitas, horarios, cualquier detalle útil para el mensajero…"
            rows={3}
            maxLength={400}
            className="rounded-xl text-[13px]"
          />
        </div>

        <Button className="h-11 w-full rounded-full font-semibold" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Guardar datos del negocio
        </Button>
      </div>
    </section>
  )
}

// ─── Tarjeta Buscar mensajeros para entregas ────────────────────────────────

function DeliveriesCard() {
  const navigate = useAppStore((s) => s.navigate)
  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue/10 text-blue">
          <Package className="h-4.5 w-4.5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-semibold leading-tight">Buscar mensajeros para entregas</h3>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
            Encuentra mensajeros que ofrezcan entregas comerciales para tus envíos. Las condiciones de
            cada entrega se coordinan directamente con el mensajero.
          </p>
        </div>
      </div>
      <Button className="mt-3 h-10 w-full rounded-full text-[13px] font-semibold" onClick={() => navigate('home')}>
        Buscar mensajeros
      </Button>
    </section>
  )
}

// ─── Enlace al perfil general (viceversa de ClientProfileScreen) ────────────

function GeneralProfileLink() {
  const navigate = useAppStore((s) => s.navigate)
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-card">
      <button
        type="button"
        onClick={() => navigate('client-profile')}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/50 active:scale-[0.99]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-navy">
          <UserRound className="h-4.5 w-4.5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold leading-tight">Ver perfil general</span>
          <span className="block truncate text-[11.5px] text-muted-foreground">Cuenta, actividad y soporte</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
    </section>
  )
}
