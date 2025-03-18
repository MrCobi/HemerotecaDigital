import { Suspense } from "react";
import ClientResetPasswordPage from "./client-page";

// Configuraciones para resolver el error
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <Suspense fallback={<div className="text-center p-8">Cargando formulario...</div>}>
      <ClientResetPasswordPage token={token} />
    </Suspense>
  );
}
