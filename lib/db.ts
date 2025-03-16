import { PrismaClient, Prisma } from '@prisma/client';

// ============ Validación mejorada ============
declare const EdgeRuntime: string | undefined;

if (typeof window !== "undefined" || typeof EdgeRuntime !== "undefined") {
  throw new Error("Prisma solo puede usarse en entornos Node.js tradicionales");
}

// ============ Tipos y Configs ============
type EnhancedPrismaClient = PrismaClient & {
  $on(event: 'query', callback: (e: Prisma.QueryEvent) => void): void;
};

declare global {
  var prismaGlobal: EnhancedPrismaClient | undefined;
}

// ============ Factory Function ============
const createPrismaClient = (): EnhancedPrismaClient => {
  const logOptions: Array<Prisma.LogLevel | Prisma.LogDefinition> = [
    { level: 'warn', emit: 'event' },
    { level: 'error', emit: 'event' }
  ];

  if (process.env.NODE_ENV === 'development') {
    logOptions.push({ level: 'info', emit: 'event' });
  }

  const client = new PrismaClient({
    log: logOptions,
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  }) as EnhancedPrismaClient;

  client.$on('query', (e: Prisma.QueryEvent) => {
    if (e.duration > (process.env.NODE_ENV === 'production' ? 200 : 500)) {
      console.warn(`[SLOW QUERY] ${e.query} (${e.duration}ms)`);
    }
  });

  return client;
};

// ============ Gestión Global ============
const prisma: EnhancedPrismaClient = globalThis.prismaGlobal || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

export default prisma;