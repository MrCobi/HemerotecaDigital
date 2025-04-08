"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Loader2 } from "lucide-react";
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
import { Textarea } from "@/src/app/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/app/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/app/components/ui/card";

// Categorías disponibles
const CATEGORIES = [
  "general",
  "business",
  "entertainment",
  "health",
  "science",
  "sports",
  "technology",
];

// Idiomas disponibles (códigos ISO 639-1)
const LANGUAGES = [
  { code: "es", name: "Español" },
  { code: "en", name: "Inglés" },
  { code: "fr", name: "Francés" },
  { code: "de", name: "Alemán" },
  { code: "it", name: "Italiano" },
  { code: "pt", name: "Portugués" },
  { code: "ru", name: "Ruso" },
  { code: "zh", name: "Chino" },
  { code: "ja", name: "Japonés" },
  { code: "ar", name: "Árabe" },
];

// Países disponibles (códigos ISO 3166-1 alpha-2)
const COUNTRIES = [
  { code: "es", name: "España" },
  { code: "us", name: "Estados Unidos" },
  { code: "mx", name: "México" },
  { code: "ar", name: "Argentina" },
  { code: "co", name: "Colombia" },
  { code: "cl", name: "Chile" },
  { code: "pe", name: "Perú" },
  { code: "ve", name: "Venezuela" },
  { code: "gb", name: "Reino Unido" },
  { code: "fr", name: "Francia" },
  { code: "de", name: "Alemania" },
  { code: "it", name: "Italia" },
  { code: "pt", name: "Portugal" },
  { code: "br", name: "Brasil" },
  { code: "ru", name: "Rusia" },
  { code: "cn", name: "China" },
  { code: "jp", name: "Japón" },
  { code: "in", name: "India" },
];

// Esquema de validación para el formulario
const formSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100, "El nombre no puede exceder los 100 caracteres"),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres").max(500, "La descripción no puede exceder los 500 caracteres"),
  url: z.string().url("URL inválida").max(512, "La URL no puede exceder los 512 caracteres"),
  imageUrl: z.string().optional().or(z.literal('')),
  category: z.string().refine(value => CATEGORIES.includes(value), {
    message: "Categoría inválida",
  }),
  language: z.string().refine(value => LANGUAGES.some(lang => lang.code === value), {
    message: "Idioma inválido",
  }),
  country: z.string().refine(value => COUNTRIES.some(country => country.code === value), {
    message: "País inválido",
  }),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewSourcePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Manejador de cambio de archivo
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Verificar que sea un archivo de imagen
      if (!selectedFile.type.startsWith('image/')) {
        setUploadError('Solo se permiten archivos de imagen');
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
      setUploadError(null);
    }
  }, []);

  // Función para subir archivo
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
            const response = JSON.parse(xhr.responseText);
            // Construir la URL completa a partir del public_id
            const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo';
            const fullUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${response.url}`;
            resolve(fullUrl);
          } else {
            reject(new Error(xhr.statusText || "Error al subir el archivo"));
          }
        }
      };

      xhr.open("POST", "/api/upload");
      xhr.send(formData);
    });
  }, []);

  // Configurar formulario con React Hook Form y Zod
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      description: "",
      url: "",
      imageUrl: "",
      category: "",
      language: "",
      country: "",
    },
  });

  // Manejar envío del formulario
  async function onSubmit(data: FormValues) {
    try {
      setIsSubmitting(true);
      setUploadProgress(0);
      setUploadError(null);
      
      // Si hay un archivo, subirlo primero
      let imageUrl = "";
      if (file) {
        try {
          imageUrl = await uploadFile(file);
        } catch (err) {
          toast.error("Error al subir imagen: " + (err instanceof Error ? err.message : "Error desconocido"));
          setIsSubmitting(false);
          return;
        }
      }
      
      // Actualizar el imageUrl en los datos del formulario
      if (imageUrl) {
        data.imageUrl = imageUrl;
      } else {
        // Usar la imagen predeterminada para fuentes sin imagen
        data.imageUrl = "/images/default-source-image.svg";
      }

      // Enviar datos de la fuente al API
      const response = await fetch("/api/admin/sources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          // Ya no necesitamos la verificación para null porque siempre tendremos una URL
          imageUrl: data.imageUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al crear la fuente");
      }

      toast.success("Fuente creada correctamente");
      router.push("/admin/sources");
      router.refresh();
    } catch (error) {
      toast.error("Error al crear la fuente: " + (error instanceof Error ? error.message : "Error desconocido"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Link 
          href="/admin/sources" 
          className="text-muted-foreground hover:text-foreground transition-colors mr-2"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h2 className="text-2xl font-bold">Nueva Fuente</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información de la fuente</CardTitle>
          <CardDescription>
            Ingresa la información de la nueva fuente informativa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre de la fuente" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://ejemplo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe brevemente esta fuente..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Imagen (opcional)</FormLabel>
                      <div className="space-y-4">
                        {/* Vista previa de la imagen */}
                        <div className="mx-auto max-w-[200px] max-h-[200px] overflow-hidden rounded-md border border-gray-200 shadow-sm">
                          <Image
                            src={imagePreview || "/images/default-source-image.svg"}
                            alt="Vista previa"
                            width={200}
                            height={150}
                            className="h-auto w-full object-contain"
                            onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/images/default-source-image.svg";
                            }}
                          />
                        </div>
                        
                        <FormControl>
                          <Input
                            type="hidden"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground mt-2">
                          Recomendado: Imagen con relación de aspecto 16:9 o 4:3. Formatos aceptados: JPG, PNG.
                        </p>
                        <input type="file" onChange={handleFileChange} />
                        {uploadError && (
                          <p className="text-xs text-red-500">{uploadError}</p>
                        )}
                        {uploadProgress > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Subiendo archivo... ({uploadProgress}%)
                          </p>
                        )}
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una categoría" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Idioma</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un idioma" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LANGUAGES.map((language) => (
                            <SelectItem key={language.code} value={language.code}>
                              {language.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>País</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un país" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COUNTRIES.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/admin/sources")}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    "Crear fuente"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
