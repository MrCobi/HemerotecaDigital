"use client";

import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/app/components/ui/form";
import { Input } from "@/src/app/components/ui/input";
import { Button } from "@/src/app/components/ui/button";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/src/app/components/ui/alert";

// Esquema de validación para la contraseña
const PasswordSetupSchema = z.object({
  password: z.string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .max(32, "La contraseña no puede tener más de 32 caracteres"),
  confirmPassword: z.string()
    .min(1, "Confirma tu contraseña"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export default function SetupPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { data: session, update } = useSession();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const form = useForm<z.infer<typeof PasswordSetupSchema>>({
    resolver: zodResolver(PasswordSetupSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  const password = form.watch('password');

  // Función para calcular la seguridad de la contraseña
  const calculatePasswordStrength = useCallback(() => {
    let strength = 0;
    if (password.length >= 6) strength += 1;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return Math.min(strength, 4);
  }, [password]);

  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength());
    if (form.getValues('confirmPassword')) form.trigger('confirmPassword');
  }, [password, form, calculatePasswordStrength]);

  // Función para enviar la contraseña
  const onSubmit = async (values: z.infer<typeof PasswordSetupSchema>) => {
    setError(null);
    setSuccess(null);
    
    startTransition(async () => {
      try {
        const response = await fetch('/api/auth/setup-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password: values.password }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Error al configurar tu contraseña");
          return;
        }

        setSuccess("¡Contraseña configurada correctamente!");
        
        // Usar un enfoque combinado para limpiar y actualizar la sesión
        try {
          // 1. Primero, actualizar la sesión local
          await update({
            ...session,
            user: {
              ...session?.user,
              needsPasswordChange: false
            }
          });
          
          console.log("Sesión local actualizada");
          
          // 2. Mostrar el mensaje de éxito por un momento
          setTimeout(() => {
            console.log("Redirigiendo a la ruta de limpieza de sesión");
            
            // 3. Redirigir a través de nuestra API de limpieza de sesión
            // Esto forzará la limpieza de cookies y obtendrá una sesión totalmente nueva
            window.location.href = '/api/auth/clear-session';
          }, 1000);
        } catch (updateError) {
          console.error("Error al actualizar la sesión:", updateError);
          
          // Si hay un error, intentar la limpieza de sesión de todas formas
          setTimeout(() => {
            window.location.href = '/api/auth/clear-session';
          }, 1000);
        }
        
      } catch (err) {
        console.error("Error:", err);
        setError("Ocurrió un error inesperado. Por favor, intenta nuevamente.");
      }
    });
  };

  // Verificar si el usuario ya tiene una sesión activa y no necesita cambiar contraseña
  useEffect(() => {
    if (session?.user && !session?.user?.needsPasswordChange) {
      router.push('/home');
    }
  }, [session, router]);

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 border border-gray-100 dark:border-gray-700 backdrop-blur-sm backdrop-filter">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">Configura tu contraseña</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Como te has registrado con Google, necesitas establecer una contraseña para tu cuenta
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4 animate-in fade-in slide-in-from-top-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 bg-green-50 text-green-800 border-green-200 animate-in fade-in slide-in-from-top-4">
          <AlertTitle>¡Éxito!</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium text-gray-700 dark:text-gray-300">Nueva contraseña</FormLabel>
                <div className="relative group">
                  <FormControl>
                    <Input
                      {...field}
                      disabled={isPending}
                      type={showPassword ? "text" : "password"}
                      placeholder="********"
                      className="pr-10 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-800"
                    />
                  </FormControl>
                  <button
                    type="button"
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none transition-colors duration-200"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-600 dark:text-gray-300">Seguridad:</span>
                    <span className="text-xs font-medium">
                      {passwordStrength === 0 && "Muy débil"}
                      {passwordStrength === 1 && "Débil"}
                      {passwordStrength === 2 && "Media"}
                      {passwordStrength === 3 && "Buena"}
                      {passwordStrength === 4 && "Fuerte"}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${
                        passwordStrength === 0
                          ? "bg-red-500 w-0"
                          : passwordStrength === 1
                          ? "bg-red-500 w-1/4"
                          : passwordStrength === 2
                          ? "bg-yellow-500 w-2/4"
                          : passwordStrength === 3
                          ? "bg-yellow-500 w-3/4"
                          : "bg-green-500 w-full"
                      }`}
                    />
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium text-gray-700 dark:text-gray-300">Confirmar contraseña</FormLabel>
                <div className="relative group">
                  <FormControl>
                    <Input
                      {...field}
                      disabled={isPending}
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="********"
                      className="pr-10 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-800"
                    />
                  </FormControl>
                  <button
                    type="button"
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none transition-colors duration-200"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 dark:from-blue-500 dark:to-indigo-500 dark:hover:from-blue-600 dark:hover:to-indigo-600 text-white py-2 rounded-lg transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg font-medium"
            disabled={isPending}
          >
            {isPending ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Guardando...
              </span>
            ) : (
              "Guardar contraseña"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
