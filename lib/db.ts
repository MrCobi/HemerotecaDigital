import { PrismaClient, Prisma } from '@prisma/client';

// ============ Validación inicial ============
if (typeof window !== "undefined") {
  throw new Error("Prisma solo puede usarse en el servidor");
}

// ============ Tipos y Configs ============
type EnhancedPrismaClient = PrismaClient<{
  log: Array<Prisma.LogLevel | Prisma.LogDefinition>;
}> & {
  $on(event: 'query', callback: (e: Prisma.QueryEvent) => void): void;
};

declare global {
   // eslint-disable-next-line no-var -- Global declaration for prismaGlobal must use var
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

  const dbUrl = new URL(process.env.DATABASE_URL!);
  dbUrl.searchParams.set("connection_limit", 
    process.env.NODE_ENV === "production" ? "20" : "5"
  );
  dbUrl.searchParams.set("pool_timeout", "10");

  const client = new PrismaClient({
    log: logOptions,
    datasources: {
      db: {
        url: dbUrl.toString()
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

// ============ Manejo de cierre ============
const gracefulShutdown = async () => {
  try {
    await prisma.$disconnect();
    console.log('Prisma connection closed');
  } catch (error) {
    console.error('Error closing Prisma:', error);
  }
};

if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
  process.on('uncaughtException', gracefulShutdown);
}

export default prisma;