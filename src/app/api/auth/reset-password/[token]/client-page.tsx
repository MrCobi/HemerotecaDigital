"use client";

import { useSearchParams } from "next/navigation";
import ResetPasswordForm from "./_components/reset-password-form";

export default function ClientResetPasswordPage({ token }: { token: string }) {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");

  return (
    <div>
      <ResetPasswordForm token={token} />
      {status === "error" && (
        <p className="text-red-500 text-center mt-4">
          Ha ocurrido un error. Por favor, intenta nuevamente.
        </p>
      )}
    </div>
  );
}
