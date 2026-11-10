// MENRUT — ClientProfileScreen · tarjeta Cuenta: editar nombre y teléfono.
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { SessionUser } from '@/lib/types'

// ─── Tarjeta Cuenta: editar nombre y teléfono ───────────────────────────────

export function AccountCard({ session }: { session: SessionUser }) {
  const setSession = useAppStore((s) => s.setSession)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(session.fullName)
  const [phone, setPhone] = useState(session.phone ?? '')
  const [saving, setSaving] = useState(false)

  function startEdit() {
    setName(session.fullName)
    setPhone(session.phone ?? '')
    setEditing(true)
  }

  async function save() {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('El nombre no puede estar vacío.')
      return
    }
    setSaving(true)
    try {
      const payload: { fullName: string; phone?: string } = { fullName: trimmed }
      const p = phone.trim()
      if (p) payload.phone = p
      const { user } = await api.updateProfile(payload)
      setSession(user)
      setEditing(false)
      toast.success('Datos actualizados')
    } catch {
      toast.error('No se pudieron guardar los datos. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="section-title">Cuenta</h3>
        {!editing && (
          <Button variant="ghost" size="sm" className="rounded-full text-blue" onClick={startEdit}>
            Editar
          </Button>
        )}
      </div>

      {!editing ? (
        <dl className="mt-2 space-y-2.5">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Nombre</dt>
            <dd className="mt-0.5 text-[14px] font-medium">{session.fullName}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Teléfono</dt>
            <dd className="mt-0.5 text-[14px] font-medium">{session.phone || 'Sin teléfono'}</dd>
          </div>
        </dl>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="acc-name">Nombre</Label>
            <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acc-phone">Teléfono</Label>
            <Input
              id="acc-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              inputMode="tel"
              placeholder="Ej. +53 5xxxxxxx"
              maxLength={20}
              autoComplete="tel"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              className="h-11 flex-1 rounded-full"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button className="h-11 flex-1 rounded-full font-semibold" onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Guardar
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
