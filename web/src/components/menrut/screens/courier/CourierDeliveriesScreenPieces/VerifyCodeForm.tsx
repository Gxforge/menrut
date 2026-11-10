// MENRUT — CourierDeliveriesScreen · formulario de verificación por código.
'use client'

import { useState } from 'react'
import { Loader2, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface VerifyCodeFormProps {
  pending: boolean
  onVerify: (code: string) => void
}

export function VerifyCodeForm({ pending, onVerify }: VerifyCodeFormProps) {
  const [code, setCode] = useState('')

  function submit() {
    const clean = code.replace(/\D/g, '').slice(0, 6)
    if (clean.length === 6) onVerify(clean)
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <div className="relative flex-1">
        <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="Código de 6 dígitos"
          aria-label="Código de entrega del cliente"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          className="h-11 rounded-full pl-9 text-center font-display text-[17px] tracking-[0.3em]"
        />
      </div>
      <Button
        className="h-11 rounded-full px-5 font-bold"
        disabled={pending || code.replace(/\D/g, '').length !== 6}
        onClick={submit}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : 'Verificar'}
      </Button>
    </div>
  )
}
