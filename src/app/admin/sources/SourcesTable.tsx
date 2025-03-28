"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Source } from "@/src/interface/source";
import DataTable, { Column } from "../components/DataTable/DataTable";
import { ExternalLink, Edit, Star, Trash } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import DeleteDialog from "@/src/components/ui/DeleteDialog";
import SafeImage from "@/src/components/ui/SafeImage";

interface SourcesTableProps {
  sources: Array<Source & {
    _count?: {
      comments?: number;
      favoriteSources?: number;
      ratings?: number;
    }
  }>;
}

// Función para determinar la clase del badge de categoría
const getCategoryBadgeClass = (category: string) => {
  switch (category.toLowerCase()) {
    case "general":
      return "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    case "business":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "entertainment":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
    case "health":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "science":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    case "sports":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    case "technology":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
    default:
      return "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
  }
};

export default function SourcesTable({ sources: initialSources }: SourcesTableProps) {
  const [sources, setSources] = useState(initialSources);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  // Obtener categorías únicas para el filtro
  const uniqueCategories = useMemo(() => {
    const categories = sources.map(source => source.category);
    return [...new Set(categories)].sort();
  }, [sources]);

  const handleCategoryFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setCategoryFilter(value === "all" ? null : value);
    setCurrentPage(1);
  };

  const filteredSources = useMemo(() => {
    // Si no hay filtros activos, devolver todas las fuentes
    if (!filterValue && categoryFilter === null) return sources;

    return sources.filter((source) => {
      // Filtro de texto (nombre, descripción, URL)
      const matchesFilter =
        !filterValue ||
        source.name.toLowerCase().includes(filterValue.toLowerCase()) ||
        source.description.toLowerCase().includes(filterValue.toLowerCase()) ||
        source.url.toLowerCase().includes(filterValue.toLowerCase());

      // Filtro de categoría
      const matchesCategory =
        categoryFilter === null || // Explícitamente verificar si es null para "Todas las categorías"
        source.category === categoryFilter;

      return matchesFilter && matchesCategory;
    });
  }, [sources, filterValue, categoryFilter]);

  // Paginación
  const totalPages = Math.ceil(filteredSources.length / rowsPerPage);
  const paginatedSources = filteredSources.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Función para manejar la eliminación de una fuente
  const handleDeleteSource = useCallback(async (sourceId: string): Promise<void> => {
    if (isDeleting) return; // Prevenir múltiples clicks
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/admin/sources/${sourceId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar la fuente');
      }

      // Actualizar el estado local para reflejar la eliminación inmediatamente
      setSources(prevSources => prevSources.filter(source => source.id !== sourceId));
      
      toast.success('Fuente eliminada correctamente');
      
      // Aún hacemos un refresh para actualizar todos los datos del servidor
      router.refresh();
    } catch (error) {
      console.error('Error al eliminar la fuente:', error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar la fuente');
    } finally {
      setIsDeleting(false);
    }
  }, [isDeleting, setSources, router]);

  const columns: Column<Source & { _count?: { comments?: number; favoriteSources?: number; ratings?: number } }>[] = useMemo(
    () => [
      {
        header: "Fuente",
        accessorKey: "source",
        cell: (source) => (
          <div className="flex items-center">
            <div className="h-10 w-10 flex-shrink-0 rounded-md bg-muted flex items-center justify-center mr-3">
              {source.imageUrl ? (
                <SafeImage
                  src={source.imageUrl}
                  alt={source.name}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-md object-cover"
                  priority
                  fallbackSrc="/images/placeholder.webp"
                />
              ) : (
                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {source.name.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <div className="font-medium text-foreground">{source.name}</div>
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground flex items-center hover:text-primary">
                <ExternalLink className="h-3 w-3 mr-1" />
                {source.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
              </a>
            </div>
          </div>
        )
      },
      {
        header: "Categoría",
        accessorKey: "category",
        cell: (source) => (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryBadgeClass(source.category)}`}>
            {source.category}
          </span>
        ),
        filterElement: (
          <select
            className="block w-full rounded-md border border-input bg-background text-foreground py-1.5 px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            value={categoryFilter || "all"}
            onChange={handleCategoryFilterChange}
          >
            <option value="all">Todas las categorías</option>
            {uniqueCategories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        )
      },
      {
        header: "Estadísticas",
        id: "stats",
        cell: (source) => (
          <div className="space-y-1">
            <div className="flex items-center text-amber-500">
              <Star className="h-4 w-4 mr-1" />
              <span>
                {source.avgRating !== undefined 
                  ? `${source.avgRating.toFixed(1)} (${source.ratingCount || source._count?.ratings || 0})` 
                  : "Sin valoraciones"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {source._count?.comments || 0} comentarios
            </div>
            <div className="text-xs text-muted-foreground">
              {source._count?.favoriteSources || 0} favoritos
            </div>
          </div>
        )
      },
      {
        header: "Ubicación",
        accessorKey: "location",
        cell: (source) => {
          // Mapeo de códigos de país a nombres completos
          const countryNames: {[key: string]: string} = {
            'us': 'USA',
            'uk': 'Reino Unido',
            'es': 'España',
            'fr': 'Francia',
            'it': 'Italia',
            'de': 'Alemania',
            'au': 'Australia',
            'ca': 'Canadá',
            'mx': 'México',
            'br': 'Brasil',
            'ar': 'Argentina',
            'cn': 'China',
            'jp': 'Japón',
            'in': 'India',
            'ru': 'Rusia',
            'sa': 'Arabia Saudí'
          };
          
          // Mapeo de códigos de idioma a nombres completos
          const languageNames: {[key: string]: string} = {
            'en': 'Inglés',
            'es': 'Español',
            'fr': 'Francés',
            'it': 'Italiano',
            'de': 'Alemán',
            'pt': 'Portugués',
            'ru': 'Ruso',
            'zh': 'Chino',
            'ja': 'Japonés',
            'ar': 'Árabe',
            'hi': 'Hindi'
          };
          
          const countryName = countryNames[source.country.toLowerCase()] || source.country;
          const languageName = languageNames[source.language.toLowerCase()] || source.language;
          
          return (
            <div>
              <div className="text-sm font-medium">
                {countryName}
              </div>
              <div className="text-xs text-muted-foreground">
                {languageName}
              </div>
            </div>
          );
        }
      },
      {
        header: "Creado",
        accessorKey: "createdAt",
        cell: (source) => {
          return (
            <div className="text-sm">
              {format(new Date(source.createdAt), 'dd/MM/yyyy')}
              <div className="text-xs text-muted-foreground">
                {format(new Date(source.createdAt), 'HH:mm')}
              </div>
            </div>
          );
        }
      },
      {
        header: "Acciones",
        accessorKey: "actions",
        cell: (source) => (
          <div className="flex items-center justify-start gap-1.5 flex-wrap">
            <Link
              href={`/sources/${source.id}`}
              className="inline-flex items-center justify-center h-7 py-0.5 px-1.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors"
              target="_blank"
              title="Ver fuente"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="ml-1 text-xs truncate">Ver</span>
            </Link>
            <Link
              href={`/admin/sources/edit/${source.id}`}
              className="inline-flex items-center justify-center h-7 py-0.5 px-1.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/40 transition-colors"
              title="Editar fuente"
            >
              <Edit className="h-3.5 w-3.5" />
              <span className="ml-1 text-xs truncate">Editar</span>
            </Link>
            <DeleteDialog
              entityId={source.id}
              entityName={source.name}
              entityType="la fuente"
              onDelete={() => handleDeleteSource(source.id)}
              consequenceText="Todos los comentarios, valoraciones y favoritos asociados a esta fuente también serán eliminados."
            />
          </div>
        )
      }
    ],
    [categoryFilter, uniqueCategories, handleDeleteSource]
  );

  return (
    <div className="space-y-4">
      <DataTable<Source & { _count?: { comments?: number; favoriteSources?: number; ratings?: number } }>
        data={paginatedSources}
        columns={columns}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onFilterChange={setFilterValue}
        filterValue={filterValue}
        filterPlaceholder="Buscar fuentes..."
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={setRowsPerPage}
        emptyMessage="No se encontraron fuentes"
      />
    </div>
  );
}
