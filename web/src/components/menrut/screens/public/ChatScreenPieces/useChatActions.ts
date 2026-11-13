// MENRUT — ChatScreen · acciones de entrega y encargo (código por chat, v2.2).
'use client'

import { useMutation, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'

export function useChatActions(conversationId: string, qc: QueryClient) {
  const refresh = () => qc.invalidateQueries({ queryKey: ['messages', conversationId] })
  const fail = (e: unknown) => toast.error(e instanceof Error ? e.message : 'No se pudo completar la acción.')

  const requestCode = useMutation({
    mutationFn: () => api.requestDeliveryCode(conversationId),
    onSuccess: (r) => {
      toast.success(r.reused ? 'Ya tienes un código vigente en este chat.' : 'Código de entrega creado.')
      refresh()
    },
    onError: fail,
  })

  const clientConfirm = useMutation({
    mutationFn: (deliveryId: string) => api.clientConfirmReceipt(conversationId, deliveryId),
    onSuccess: () => {
      toast.success('Recepción confirmada. El mensajero ya puede escribir el código.')
      refresh()
    },
    onError: fail,
  })

  const cancelCode = useMutation({
    mutationFn: (deliveryId: string) => api.cancelDeliveryCode(conversationId, deliveryId),
    onSuccess: () => {
      toast.success('Código cancelado.')
      refresh()
    },
    onError: fail,
  })

  const verifyCode = useMutation({
    mutationFn: (args: { deliveryId: string; code: string }) =>
      api.verifyDeliveryCode(conversationId, args.deliveryId, args.code),
    onSuccess: () => {
      toast.success('Entrega verificada.')
      refresh()
    },
    onError: fail,
  })

  const createEncargo = useMutation({
    mutationFn: (description: string) => api.createEncargo(conversationId, description),
    onSuccess: () => {
      toast.success('Encargo creado.')
      refresh()
    },
    onError: fail,
  })

  return { requestCode, clientConfirm, cancelCode, verifyCode, createEncargo }
}
