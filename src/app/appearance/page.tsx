"use client";

import dynamic from 'next/dynamic';

// Utilizamos dynamic import para evitar el error durante el prerender
const AppearanceSettings = dynamic(
  () => import('@/src/app/components/AppearanceSettings').then(mod => mod.AppearanceSettings),
  { ssr: false }
);

export default function AppearancePage() {
  // Renderizar el componente AppearanceSettings para evitar problemas de prerender
  return (
    <div suppressHydrationWarning>
      {typeof window !== 'undefined' && <AppearanceSettings />}
    </div>
  );
}
