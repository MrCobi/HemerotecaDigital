"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Source } from "@/src/interface/source";
import DataTable, { Column } from "../components/DataTable/DataTable";
import { ExternalLink, Edit, Star } from "lucide-react";
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
    if (!filterValue && categoryFilter === null) return sources;

    return sources.filter((source) => {
      const matchesFilter =
        !filterValue ||
        source.name.toLowerCase().includes(filterValue.toLowerCase()) ||
        source.description.toLowerCase().includes(filterValue.toLowerCase()) ||
        source.url.toLowerCase().includes(filterValue.toLowerCase());

      const matchesCategory =
        categoryFilter === null || // Explícitamente verificar si es null para "Todas las categorías"
        source.category === categoryFilter;

      return matchesFilter && matchesCategory;
    });
  }, [sources, filterValue, categoryFilter]);

  const totalPages = Math.ceil(filteredSources.length / rowsPerPage);
  const paginatedSources = filteredSources.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleDeleteSource = useCallback(async (sourceId: string): Promise<void> => {
    if (isDeleting) return;

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

      setSources(prevSources => prevSources.filter(source => source.id !== sourceId));
      
      toast.success('Fuente eliminada correctamente');
      
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
        className: "w-[30%]",
        cell: (source) => (
          <div className="flex items-center">
            <div className="h-10 w-10 flex-shrink-0 rounded-md bg-muted flex items-center justify-center mr-2">
              {source.imageUrl ? (
                <SafeImage
                  src={source.imageUrl.replace('http:', 'https:')}
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
            <div className="min-w-0 flex-1">
              <div className="font-medium text-foreground text-sm truncate">{source.name}</div>
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground flex items-center hover:text-primary truncate">
                <ExternalLink className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">{source.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</span>
              </a>
            </div>
          </div>
        )
      },
      {
        header: "Categoría",
        accessorKey: "category",
        className: "w-[15%]",
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
        className: "w-[20%]",
        cell: (source) => (
          <div className="space-y-1">
            <div className="flex items-center text-amber-500">
              <Star className="h-4 w-4 mr-1" />
              <span className="text-sm">
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
        className: "w-[15%]",
        cell: (source) => {
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
        className: "w-[10%]",
        cell: (source) => {
          return (
            <div className="text-sm whitespace-nowrap">
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
        className: "w-[10%]",
        cell: (source) => (
          <div className="flex items-center gap-1 flex-wrap min-w-0">
            <Link
              href={`/sources/${source.id}`}
              className="inline-flex items-center justify-center h-7 py-0.5 px-1.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors"
              target="_blank"
              title="Ver fuente"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="ml-1 text-xs truncate hidden sm:inline">Ver</span>
            </Link>
            <Link
              href={`/admin/sources/edit/${source.id}`}
              className="inline-flex items-center justify-center h-7 py-0.5 px-1.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/40 transition-colors"
              title="Editar fuente"
            >
              <Edit className="h-3.5 w-3.5" />
              <span className="ml-1 text-xs truncate hidden sm:inline">Editar</span>
            </Link>
            <DeleteDialog
              entityId={source.id}
              entityName={source.name}
              entityType="la fuente"
              onDelete={() => handleDeleteSource(source.id)}
              consequenceText="Todos los comentarios, valoraciones y favoritos asociados a esta fuente también serán eliminados."
            />
          </div>
        ),
        hideOnMobile: false
      }
    ],
    [handleDeleteSource]
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
