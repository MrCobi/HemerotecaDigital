// src/app/layout.tsx
import "./globals.css";
import React from "react";
import { SessionProvider } from "next-auth/react";
import ClientLayout from "./ClientLayout";
import { ToastProvider, ToastViewport } from "@/src/app/components/ui/toast";
import { ThemeProvider } from "./components/ThemeProvider";
import AppearanceLoader from "./components/AppearanceLoader";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        {/* Proveedor de Toast debe envolver toda la aplicación */}
        <ToastProvider>
          {/* Proveedor de sesión de NextAuth */}
          <SessionProvider>
            {/* Proveedor de tema */}
            <ThemeProvider>
              {/* Cargador de configuraciones de apariencia */}
              <AppearanceLoader />
              {/* Layout principal del cliente */}
              <ClientLayout>
                {children}
                {/* Viewport para mostrar los toasts (importante posición fija) */}
                <ToastViewport className="[--viewport-padding:_25px] fixed bottom-0 right-0 flex flex-col p-[var(--viewport-padding)] gap-[10px] w-[390px] max-w-[100vw] m-0 list-none z-[2147483647] outline-none" />
              </ClientLayout>
            </ThemeProvider>
          </SessionProvider>
        </ToastProvider>
      </body>
    </html>
  );
}