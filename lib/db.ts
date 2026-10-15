import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma

// Retry helper for DB queries that may fail due to connection issues
export async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 500): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : ''
      const code = (error as { code?: string })?.code
      const isConnectionError = msg.includes('Too many database connections') ||
        msg.includes('idle-session timeout') ||
        msg.includes('Connection refused') ||
        code === 'P2037' || code === 'P2024'
      if (isConnectionError && attempt < retries) {
        console.warn(`DB retry ${attempt + 1}/${retries} after connection error`)
        await new Promise(r => setTimeout(r, delay * (attempt + 1)))
        continue
      }
      throw error
    }
  }
  throw new Error('withRetry: should not reach here')
}
