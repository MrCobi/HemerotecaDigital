// lib/db.ts
import { PrismaClient } from "@prisma/client";

// 1. Definir tipo de instancia
type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

// 2. Función de creación de cliente
const prismaClientSingleton = () => {
  return new PrismaClient();
};

// 3. Extender GlobalThis con declaración segura
declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClientSingleton | undefined;
}

// 4. Inicialización
const prisma: PrismaClientSingleton = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

// 5. Preservar instancia en desarrollo
if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}