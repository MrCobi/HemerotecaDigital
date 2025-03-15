// lib/db.ts
import { PrismaClient, Prisma } from '@prisma/client';

// 1. Tipo para la instancia de Prisma con extensiones
type EnhancedPrismaClient = PrismaClient<{
  log: Array<Prisma.LogLevel | Prisma.LogDefinition>;
}>;

// 2. Configuración de conexión adaptativa
const connectionConfig = {
  pool: {
    max: process.env.NODE_ENV === 'production' ? 15 : 5,
    min: process.env.NODE_ENV === 'production' ? 5 : 2,
    acquire: 30000,
    idle: 10000
  },
  log: {
    queries: {
      threshold: process.env.NODE_ENV === 'production' ? 200 : 500
    }
  }
};

// 3. Factory function mejorada con tipos correctos
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
        url: `${process.env.DATABASE_URL}?connection_limit=${
          process.env.NODE_ENV === 'production' ? 20 : 5
        }&pool_timeout=10`
      }
    }
  });

  // 4. Middleware de logging de consultas lentas con tipo correcto
  client.$on('query' as never, (e: Prisma.QueryEvent) => {
    if (e.duration > connectionConfig.log.queries.threshold) {
      console.warn(`[SLOW QUERY] ${e.query} - ${e.duration}ms`);
    }
  });

  return client;
};

// 5. Gestión de instancia global con seguridad TypeScript
declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: EnhancedPrismaClient | undefined;
}

// 6. Inicialización segura con tipos
const prisma: EnhancedPrismaClient = globalThis.prismaGlobal || createPrismaClient();

// 7. Configuración de cierre para entornos serverless
if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
} else {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
    console.log('Prisma connection closed gracefully');
  });

  process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

// 8. Exportación optimizada
export default prisma;