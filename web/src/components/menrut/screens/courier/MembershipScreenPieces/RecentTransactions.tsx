// MENRUT — MembershipScreen · Movimientos recientes de las carteras.
'use client'

import { Coins, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/format'
import type { WalletTransactionDto } from '@/lib/types'

export function RecentTransactions({ movimientos }: { movimientos: WalletTransactionDto[] }) {
  return (
    <section className="mt-6" aria-label="Movimientos recientes">
      <h2 className="section-title mb-2.5 flex items-center gap-1.5">
        <Receipt className="h-4 w-4 text-muted-foreground" aria-hidden />
        Movimientos recientes
      </h2>
      {movimientos.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-card px-4 py-8 text-center text-[13px] text-muted-foreground">
          Todavía no hay movimientos en tus carteras.
        </p>
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
          {movimientos.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                  t.walletType === 'permanence' ? 'bg-blue/10 text-blue' : 'bg-cyan/10 text-cyan',
                )}
                aria-hidden
              >
                <Coins className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold leading-tight">{t.reason}</p>
                <p className="text-[11px] text-muted-foreground">
                  {t.walletType === 'permanence' ? 'Permanencia' : 'Herramientas'} ·{' '}
                  {formatDateTime(t.createdAt)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p
                  className={cn(
                    'text-[14px] font-bold leading-tight',
                    t.delta >= 0 ? 'text-success' : 'text-danger',
                  )}
                >
                  {t.delta >= 0 ? '+' : '−'}
                  {Math.abs(t.delta)}
                </p>
                <p className="text-[10.5px] text-muted-foreground">Saldo: {t.balanceAfter}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Los precios de los planes son una propuesta comercial pendiente de confirmar. Los importes
        definitivos se administran desde el panel de MENRUT.
      </p>
    </section>
  )
}
