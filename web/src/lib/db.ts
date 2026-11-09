import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// En dev se crea SIEMPRE un cliente nuevo y se pisa el global: tras
// `prisma generate`/`db push` con el servidor arrancado, el singleton viejo
// queda desincronizado con el schema (HMR no lo reemplaza solo).
// La creación solo ocurre cuando este módulo se re-evalúa (raro en dev).
export const db = new PrismaClient({
  log: ['query'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db