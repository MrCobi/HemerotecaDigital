"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/src/app/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/app/components/ui/form";
import { Input } from "@/src/app/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/src/app/components/ui/card";
import { AlertCircle, CheckCircle, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_ROUTES } from "@/src/config/api-routes";
import { useTheme } from "next-themes";

// Esquema de validación para el formulario
const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .max(32, "La contraseña no puede tener más de 32 caracteres"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

// Tipo para los valores del formulario
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

enum VerificationStatus {
  LOADING = "loading",
  INVALID = "invalid",
  VALID = "valid",
  ERROR = "error",
  SUCCESS = "success",
}

const ResetPasswordPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { setTheme } = useTheme();
  
  const [status, setStatus] = useState<VerificationStatus>(VerificationStatus.LOADING);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Aplicar el tema según la preferencia del sistema
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(systemPrefersDark ? 'dark' : 'light');
    }
  }, [setTheme]);

  // Configuración del formulario con React Hook Form y Zod
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  // Verificar el token al cargar la página
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStatus(VerificationStatus.INVALID);
        setMessage("No se ha proporcionado un token de restablecimiento");
        return;
      }

      try {
        // Verificar el token con el servidor
        const response = await fetch(API_ROUTES.auth.resetPasswordVerify(token));
        const data = await response.json();

        if (!response.ok) {
          setStatus(VerificationStatus.INVALID);
          setMessage(data.error || "Token no válido o expirado");
          return;
        }
        
        setStatus(VerificationStatus.VALID);
      } catch (error) {
        console.error("Error al verificar el token:", error);
        setStatus(VerificationStatus.ERROR);
        setMessage("Error al verificar el token. Por favor, inténtalo de nuevo.");
      }
    };

    verifyToken();
  }, [token]);

  // Manejar el envío del formulario
  const onSubmit = async (values: ResetPasswordFormValues) => {
    if (!token) {
      toast.error("Token no válido");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(API_ROUTES.auth.resetPasswordReset(token), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: values.password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Error al restablecer la contraseña");
        return;
      }

      setStatus(VerificationStatus.SUCCESS);
      toast.success("Contraseña restablecida con éxito");
      
      // Redireccionar al inicio de sesión después de 3 segundos
      setTimeout(() => {
        router.push("/api/auth/signin");
      }, 3000);
    } catch (error) {
      console.error("Error al restablecer la contraseña:", error);
      toast.error("Error al conectar con el servidor");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Renderizar contenido según el estado
  const renderContent = () => {
    switch (status) {
      case VerificationStatus.LOADING:
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <LoaderCircle className="h-12 w-12 animate-spin text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">Verificando token...</h2>
            <p className="text-muted-foreground">Estamos validando tu solicitud de restablecimiento de contraseña.</p>
          </div>
        );

      case VerificationStatus.INVALID:
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Token no válido</h2>
            <p className="text-muted-foreground mb-4">{message || "El token de restablecimiento no es válido o ha expirado."}</p>
            <Button asChild>
              <Link href="/forgot-password">Solicitar nuevo enlace</Link>
            </Button>
          </div>
        );

      case VerificationStatus.ERROR:
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error de verificación</h2>
            <p className="text-muted-foreground mb-4">{message || "Ha ocurrido un error al verificar el token."}</p>
            <Button asChild>
              <Link href="/forgot-password">Intentar de nuevo</Link>
            </Button>
          </div>
        );

      case VerificationStatus.SUCCESS:
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">¡Contraseña restablecida!</h2>
            <p className="text-muted-foreground mb-4">Tu contraseña ha sido actualizada correctamente.</p>
            <Button asChild>
              <Link href="/api/auth/signin">Iniciar sesión</Link>
            </Button>
          </div>
        );

      case VerificationStatus.VALID:
        return (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nueva contraseña</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormDescription>
                        Mínimo 6 caracteres, máximo 32 caracteres.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar contraseña</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Restableciendo...
                  </>
                ) : (
                  "Restablecer contraseña"
                )}
              </Button>
            </form>
          </Form>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg dark:bg-gray-800 dark:border-gray-700">
        {status === VerificationStatus.VALID ? (
          <>
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center dark:text-white">Restablecer contraseña</CardTitle>
              <CardDescription className="text-center dark:text-gray-300">
                Crea una nueva contraseña para tu cuenta
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderContent()}
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center dark:text-white">Restablecimiento de contraseña</CardTitle>
            </CardHeader>
            <CardContent>
              {renderContent()}
            </CardContent>
            <CardFooter className="flex justify-center">
              <Link href="/api/auth/signin" className="text-primary underline-offset-4 hover:underline font-medium">
                Volver al inicio de sesión
              </Link>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
};

export default ResetPasswordPage;
