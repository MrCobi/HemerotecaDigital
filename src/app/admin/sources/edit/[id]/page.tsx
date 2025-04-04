"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import Link from "next/link";
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
import SafeImage from "@/src/components/ui/SafeImage";

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

export default function EditSourcePage() {
  const router = useRouter();
  const params = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Usamos useParams para obtener el ID de forma segura en Next.js 14+
  const id = params.id as string;

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

  // Cargar datos de la fuente
  useEffect(() => {
    async function loadSource() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/admin/sources/${id}`);
        
        if (!response.ok) {
          throw new Error("Error al cargar los datos de la fuente");
        }

        const source = await response.json();

        // Actualizar los valores del formulario con los datos de la fuente
        form.reset({
          name: source.name,
          description: source.description,
          url: source.url,
          imageUrl: source.imageUrl || "",
          category: source.category,
          language: source.language,
          country: source.country,
        });

        // Establecer la vista previa de la imagen
        if (source.imageUrl) {
          setImagePreview(source.imageUrl);
        }
      } catch (err) {
        console.error("Error al cargar la fuente:", err);
        setError("No se pudo cargar la información de la fuente");
      } finally {
        setIsLoading(false);
      }
    }

    loadSource();
  }, [id, form]);

  // Manejar envío del formulario
  async function onSubmit(data: FormValues) {
    try {
      setIsSubmitting(true);

      if (file) {
        const uploadedImageUrl = await uploadFile(file);
        data.imageUrl = uploadedImageUrl;
      }

      const response = await fetch(`/api/admin/sources/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          // Si imageUrl está vacío, enviarlo como null para que la base de datos lo maneje correctamente
          imageUrl: data.imageUrl || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al actualizar la fuente");
      }

      toast.success("Fuente actualizada correctamente");
      router.push("/admin/sources");
    } catch (err) {
      console.error("Error al actualizar la fuente:", err);
      toast.error(err instanceof Error ? err.message : "Error al actualizar la fuente");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center">
          <Link 
            href="/admin/sources" 
            className="text-muted-foreground hover:text-foreground transition-colors mr-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <h2 className="text-2xl font-bold">Error</h2>
        </div>
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          {error}
        </div>
        <Button asChild>
          <Link href="/admin/sources">Volver al listado de fuentes</Link>
        </Button>
      </div>
    );
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
        <h2 className="text-2xl font-bold">Editar Fuente</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información de la fuente</CardTitle>
          <CardDescription>
            Actualiza la información de la fuente informativa.
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
                        {imagePreview && (
                          <div className="mx-auto max-w-[200px] max-h-[200px] overflow-hidden rounded-md border border-gray-200 shadow-sm">
                            <SafeImage
                              src={imagePreview || "/placeholder-image.jpg"}
                              alt="Vista previa"
                              width={200}
                              height={150}
                              className="h-auto w-full object-cover"
                            />
                          </div>
                        )}
                        
                        {/* Widget de subida de archivo */}
                        <input
                          type="file"
                          onChange={handleFileChange}
                          className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        
                        {uploadProgress > 0 && (
                          <div className="bg-primary/10 text-primary p-2 rounded-md">
                            Subiendo imagen... {uploadProgress}%
                          </div>
                        )}
                        {uploadError && (
                          <div className="bg-destructive/10 text-destructive p-2 rounded-md">
                            {uploadError}
                          </div>
                        )}
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
                        value={field.value}
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
                        value={field.value}
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
                        value={field.value}
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
                      Guardando...
                    </>
                  ) : (
                    "Guardar cambios"
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
