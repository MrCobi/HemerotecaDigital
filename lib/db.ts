import { PrismaClient, Prisma } from '@prisma/client';

// ============ Validación mejorada ============
declare const EdgeRuntime: string | undefined;

// Declaración global para TypeScript
declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

// Definir un tipo unificado que incluya todos los modelos de Prisma para evitar problemas de tipo
type UnifiedPrismaClient = PrismaClient;

// Creamos un cliente falso para entornos Edge
let prisma: UnifiedPrismaClient;

if (typeof window !== "undefined" || typeof EdgeRuntime !== "undefined") {
  // En entornos Edge o browser, exportamos un cliente falso
  // Solo mostrar advertencias en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.warn("Advertencia: Prisma no está disponible en este entorno (Edge Runtime)");
  }
  
  // Creamos un proxy que simula ser un PrismaClient pero lanza errores
  // Este enfoque mantiene la compatibilidad de tipos
  const handler = {
    get(target: Record<string, unknown>, prop: string) {
      // Para permitir await prisma
      if (prop === "then") {
        return null;
      }
      
      // Simulamos la estructura de Prisma para el tipado
      return new Proxy({}, {
        get() {
          return () => {
            throw new Error("Prisma no puede utilizarse en este contexto. Esta operación debe realizarse en un entorno Node.js tradicional.");
          };
        }
      });
    }
  };
  
  // Creamos un proxy que satisface el tipado de PrismaClient
  prisma = new Proxy({}, handler) as unknown as UnifiedPrismaClient;
} else {
  // ============ Tipos y Configs ============
  type EnhancedPrismaClient = PrismaClient & {
    $on(event: 'query', callback: (e: Prisma.QueryEvent) => void): void;
  };

  // ============ Factory Function ============
  const createPrismaClient = (): EnhancedPrismaClient => {
    const logOptions: Array<Prisma.LogLevel | Prisma.LogDefinition> = [
      { level: 'warn', emit: 'stdout' },
      { level: 'error', emit: 'stdout' }
    ];

    if (process.env.NODE_ENV === 'development') {
      logOptions.push({ level: 'info', emit: 'stdout' });
      logOptions.push({ level: 'query', emit: 'event' });
    }

    const client = new PrismaClient({
      log: logOptions
    }) as EnhancedPrismaClient;

    // Solo configuramos el event listener para queries en desarrollo
    if (process.env.NODE_ENV === 'development') {
      client.$on('query', (e: Prisma.QueryEvent) => {
        if (e.duration > 500) {
          console.warn(`[SLOW QUERY] ${e.query} (${e.duration}ms)`);
        }
      });
    }

    return client;
  };

  // ============ Gestión Global ============
  prisma = globalThis.prismaGlobal || createPrismaClient();

  if (process.env.NODE_ENV !== 'production') {
    globalThis.prismaGlobal = prisma;
  }
}

// El export se hace con el tipo explícito para que TypeScript reconozca todos los modelos
const typedPrisma = prisma as UnifiedPrismaClient;
export default typedPrisma;