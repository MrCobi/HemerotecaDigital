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
import { SignUpSchema } from "@/lib/zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerAction } from "@/actions/auth-action";
import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { API_ROUTES } from "@/src/config/api-routes";

const ExtendedSignUpSchema = SignUpSchema.extend({
  confirmPassword: z.string()
    .min(1, "La confirmación de contraseña es requerida"),
  bio: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export default function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const { update } = useSession();

  const form = useForm<z.infer<typeof ExtendedSignUpSchema>>({
    resolver: zodResolver(ExtendedSignUpSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
      username: "",
      image: "",
      bio: "",
    },
    mode: "onChange",
  });

  const password = form.watch('password');

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

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        form.setError('image', { message: 'Solo se permiten archivos de imagen' });
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = () => setPreviewImage(reader.result as string);
      reader.readAsDataURL(selectedFile);
    }
  }, [form]);

  const uploadFile = useCallback((file: File) => {
    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("file", file);

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      });

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText).url);
          } else {
            reject(new Error(xhr.statusText || "Error subiendo archivo"));
          }
        }
      };

      xhr.open("POST", API_ROUTES.auth.registerUpload);
      xhr.send(formData);
    });
  }, []);

  const onSubmit = useCallback(async (values: z.infer<typeof ExtendedSignUpSchema>) => {
    setError(null);
    setUploadProgress(0);

    try {
      let imageUrl = "/images/AvatarPredeterminado.webp";
      
      if (file) {
        try {
          imageUrl = await uploadFile(file);
        } catch (err) {
          throw new Error("Error subiendo imagen: " + (err as Error).message);
        }
      }

      startTransition(async () => {
        try {
          const { confirmPassword: _confirmPassword, ...signupData } = values;
          const response = await registerAction({
            ...signupData,
            image: imageUrl,
          });

          if (response.error) {
            setError(response.error);
          } else {
            await update(); // Actualiza la sesión
            router.refresh(); // Fuerza recarga de datos del lado del cliente
            
            // Redirect based on whether email verification is required
            if (response.requiresVerification) {
              router.push("/auth/verification-pending");
            } else {
              router.push("/home");
            }
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Error en el registro");
        }
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar la solicitud");
    }
  }, [file, router, startTransition, uploadFile, update]);

  const StrengthIndicator = useCallback(() => (
    <div className="flex gap-1 mt-1">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className={`h-1 w-full rounded-full transition-all ${
            passwordStrength > i ? 
            (passwordStrength >= 3 ? 'bg-blue-500 dark:bg-blue-400' : 
             passwordStrength >= 2 ? 'bg-yellow-500 dark:bg-yellow-400' : 'bg-red-500 dark:bg-red-400') : 
            'bg-gray-200 dark:bg-gray-700'
          }`}
        />
      ))}
    </div>
  ), [passwordStrength]);

  return (
    <div className="flex min-h-screen w-full dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900">
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Registro en Hemeroteca Digital</h1>
            <p className="text-gray-600 dark:text-blue-200">Crea tu cuenta para acceder a nuestro archivo histórico</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-200 font-medium">Nombre completo</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          placeholder="Ej. María González"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800/60 dark:text-white dark:placeholder-blue-200/70 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 dark:text-red-400 text-sm" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-200 font-medium">Nombre de usuario</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          placeholder="Ej. maria_2023"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800/60 dark:text-white dark:placeholder-blue-200/70 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 dark:text-red-400 text-sm" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-200 font-medium">Correo electrónico</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="Ej. ejemplo@correo.com"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800/60 dark:text-white dark:placeholder-blue-200/70 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 dark:text-red-400 text-sm" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel className="text-gray-700 dark:text-gray-200 font-medium">Contraseña</FormLabel>
                      <div className="group relative inline-block">
                        <svg
                          className="h-4 w-4 text-gray-500 dark:text-gray-300 cursor-help"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded p-2 w-48 shadow-lg">
                          Requisitos:
                          <ul className="list-disc pl-4 mt-1">
                            <li>Mínimo 6 caracteres</li>
                            <li>Recomendado usar mayúsculas y números</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Mínimo 6 caracteres"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800/60 dark:text-white dark:placeholder-blue-200/70 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                          {showPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <StrengthIndicator />
                    <FormMessage className="text-red-500 dark:text-red-400 text-sm" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-200 font-medium">Confirmar contraseña</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Repite tu contraseña"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800/60 dark:text-white dark:placeholder-blue-200/70 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                          {showConfirmPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-500 dark:text-red-400 text-sm" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-200 font-medium">Biografía (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        placeholder="Ej. Estudiante de historia"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800/60 dark:text-white dark:placeholder-blue-200/70 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 dark:text-red-400 text-sm" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="image"
                render={({ field: { onChange, ...restField } }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-200 font-medium">Foto de perfil (opcional)</FormLabel>
                    <div className="mt-2 flex flex-col items-center justify-center">
                      <div className="mb-4">
                        {previewImage ? (
                          <div className="relative w-24 h-24">
                            <Image
                              src={previewImage}
                              alt="Vista previa"
                              width={96}
                              height={96}
                              className="rounded-full object-cover w-24 h-24 border-4 border-gray-200 dark:border-gray-700 shadow-md"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewImage(null);
                                setFile(null);
                                onChange("");
                              }}
                              className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
                              aria-label="Eliminar imagen"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border-4 border-gray-200 dark:border-gray-700">
                            <Image
                              src="/images/AvatarPredeterminado.webp"
                              alt="Avatar predeterminado"
                              width={96}
                              height={96}
                              className="rounded-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                      <label className="bg-white dark:bg-gray-800 py-2 px-3 border border-gray-300 dark:border-gray-700 dark:text-blue-200 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-blue-200 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                        Seleccionar imagen
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="sr-only"
                        />
                      </label>
                    </div>
                    <FormMessage className="text-red-500 dark:text-red-400 text-sm" />
                  </FormItem>
                )}
              />

              {error && (
                <div className="bg-red-100 dark:bg-red-900 border-l-4 border-red-500 dark:border-red-700 text-red-700 dark:text-red-400 p-4 rounded-md">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-red-500 dark:text-red-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2.5">
                  <div
                    className="bg-blue-500 dark:bg-blue-400 h-2.5 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={isPending}
                className="w-full py-3 px-4 bg-blue-500 rounded-xl text-white font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <div className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-5 w-5 mr-3 text-white"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Creando cuenta...
                  </div>
                ) : (
                  "Crear cuenta"
                )}
              </Button>

              {/* Separador de opciones */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800/80 text-gray-500 dark:text-gray-400">
                    O regístrate con
                  </span>
                </div>
              </div>

              {/* Botón de registro con Google */}
              <Button
                type="button"
                className="w-full bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-white border border-gray-300 dark:border-gray-700 font-medium py-3 px-4 rounded-xl transition-all shadow hover:shadow-md flex items-center justify-center"
                onClick={() => signIn("google", { callbackUrl: "/home" })}
              >
                <svg 
                  className="h-5 w-5 mr-2" 
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Registrarse con Google
              </Button>

              <div className="text-center mt-4 text-sm text-gray-600 dark:text-blue-200">
                ¿Ya tienes una cuenta?{" "}
                <Link href="/api/auth/signin" className="text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200 font-medium">
                  Inicia sesión
                </Link>
              </div>
            </form>
          </Form>
        </div>
      </div>

      <div className="hidden lg:block lg:w-1/2 bg-blue-100 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-indigo-600/40 dark:from-blue-500/10 dark:to-indigo-800/20"></div>
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="max-w-lg text-center">
            <div className="mb-8">
              <Image 
                src="/images/default_periodico.jpg" 
                alt="Hemeroteca Digital" 
                width={120} 
                height={120}
                className="mx-auto rounded-xl shadow-lg"
                priority
              />
            </div>
            <h2 className="text-4xl font-bold text-white mb-4 drop-shadow-md">Hemeroteca Digital</h2>
            <p className="text-xl text-white/90 mb-6 drop-shadow">
              Accede a nuestra colección de periódicos y documentos históricos digitalizados
            </p>
            <div className="grid grid-cols-3 gap-4 mt-12">
              {[
                { value: "+10,000", label: "Documentos" },
                { value: "+50", label: "Años de historia" },
                { value: "+200", label: "Fuentes" }
              ].map((item, index) => (
                <div key={index} className="bg-white/20 dark:bg-gray-800/30 backdrop-blur-sm p-4 rounded-lg shadow-lg">
                  <h3 className="font-bold text-white">{item.value}</h3>
                  <p className="text-white/80 text-sm">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}