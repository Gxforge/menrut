// MENRUT — ChatScreen · composición del mensaje (fija al fondo, compacta).
'use client'

import type { KeyboardEvent, RefObject } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MAX_LENGTH } from './data'

export function Composer({
  taRef,
  draft,
  onDraftChange,
  onInput,
  onKeyDown,
  onSubmit,
}: {
  taRef: RefObject<HTMLTextAreaElement | null>
  draft: string
  onDraftChange: (v: string) => void
  onInput: () => void
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  onSubmit: () => void
}) {
  return (
    // Composición: fija al fondo del frame, compacta para el teclado móvil
    <div className="border-t border-line/70 bg-card/95 p-3 pb-safe">
      <div className="flex items-end gap-2">
        <Textarea
          ref={taRef}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onInput={onInput}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={MAX_LENGTH}
          placeholder="Escribe un mensaje…"
          aria-label="Mensaje"
          className="max-h-[120px] min-h-[44px] flex-1 resize-none rounded-2xl border-line bg-background px-3.5 py-2.5 text-[13.5px] leading-snug shadow-none focus-visible:ring-blue/25"
        />
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!draft.trim()}
          aria-label="Enviar mensaje"
          className="h-11 w-11 shrink-0 rounded-full p-0"
        >
          <Send className="h-4.5 w-4.5" aria-hidden />
        </Button>
      </div>
    </div>
  )
}
