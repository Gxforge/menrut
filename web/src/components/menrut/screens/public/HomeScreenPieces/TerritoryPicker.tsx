// MENRUT — HomeScreen · selector de territorio (Popover + Command buscador).
'use client'

import { useMemo, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ProvinceDto } from '@/lib/types'

// ─── Selector de territorio (Popover + Command buscador) ─────────────────────

export function TerritoryPicker({
  label, placeholder, value, provinces, loading, tone, onSelect,
}: {
  label: string
  placeholder: string
  value: string | null
  provinces: ProvinceDto[]
  loading: boolean
  tone: 'blue' | 'orange'
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = useMemo(
    () => provinces.flatMap((p) => p.municipalities.map((m) => ({ id: m.id, name: m.name, province: p.name }))).find((m) => m.id === value),
    [provinces, value]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={loading}
          aria-label={`${label}: ${selected ? `${selected.province} · ${selected.name}` : placeholder}`}
          className={cn(
            'flex min-h-[52px] w-full items-center gap-3 rounded-2xl border border-line bg-secondary/50 px-3 text-left pr-14 transition-colors hover:border-blue/40 active:scale-[0.99] disabled:opacity-60',
            open && 'border-blue/60 bg-secondary'
          )}
        >
          <span
            aria-hidden
            className={cn(
              'h-2.5 w-2.5 shrink-0 rounded-full',
              tone === 'blue' ? 'bg-blue' : 'bg-orange'
            )}
          />
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
            {loading ? (
              <Skeleton className="mt-1 h-4 w-28" />
            ) : selected ? (
              <span className="block truncate text-[13.5px] font-semibold">
                {selected.province} · {selected.name}
              </span>
            ) : (
              <span className="block truncate text-[13.5px] text-muted-foreground">{placeholder}</span>
            )}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] rounded-2xl p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar municipio o provincia…" />
          <CommandList className="nice-scroll max-h-[300px]">
            <CommandEmpty>Sin resultados. Prueba con otro nombre.</CommandEmpty>
            {provinces.map((province) => (
              <CommandGroup key={province.id} heading={province.name}>
                {province.municipalities.map((m) => (
                  <CommandItem
                    key={m.id}
                    value={`${m.name} ${province.name}`}
                    onSelect={() => {
                      onSelect(m.id)
                      setOpen(false)
                    }}
                    className="text-[13px]"
                  >
                    <span className="font-medium">{m.name}</span>
                    <span className="ml-auto text-[11px] text-muted-foreground">{province.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
