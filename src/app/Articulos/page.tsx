"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { fetchTopHeadlines } from "../services/NewsEverythingService";
import { Article } from "../../interface/article";
import ArticleList from "@/src/app/components/Article/ArticleList";
import NoResultsFound from "@/src/app/components/Article/NoResultsFound";
import ArticleForm from "@/src/app/components/Article/ArticleForm";
import Pagination from "@/src/app/components/Article/Pagination";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import PageLoader from "@/src/app/components/PageLoader";
import { useTheme } from "next-themes";

const defaultSearchParams = {
  sources: "",
  q: "",
  language: "es",
  sortBy: "",
  pageSize: 9,
};

const Page = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstVisit, setFirstVisit] = useState(true);
  const [searchParams, setSearchParams] = useState(defaultSearchParams);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const searchParamsHook = useSearchParams();
  const urlQuery = searchParamsHook.get("q");
  const searchPerformed = useRef(false);
  const queryProcessed = useRef(false);

  // Verificación de autenticación
  useEffect(() => {
    // Si no está autenticado, redirigir a la página de inicio de sesión
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
      return;
    }

    // Verificar que el correo electrónico esté verificado
    if (status === "authenticated" && !session?.user?.emailVerified) {
      router.push("/auth/verification-pending");
      return;
    }
  }, [status, session, router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedParams = sessionStorage.getItem("searchParams");
      const savedArticles = sessionStorage.getItem("articles");
      const savedCurrentPage = sessionStorage.getItem("currentPage");
      const savedTotalPages = sessionStorage.getItem("totalPages");

      // Solo cargamos parámetros guardados si no hay una búsqueda en la URL
      if (!urlQuery) {
        setSearchParams(
          savedParams ? JSON.parse(savedParams) : defaultSearchParams
        );
        setArticles(savedArticles ? JSON.parse(savedArticles) : []);
        setCurrentPage(savedCurrentPage ? parseInt(savedCurrentPage, 10) : 1);
        setTotalPages(savedTotalPages ? parseInt(savedTotalPages, 10) : 1);
        setFirstVisit(!savedArticles);
      } else if (!queryProcessed.current) {
        // Si hay consulta en la URL, establecemos los parámetros de búsqueda
        queryProcessed.current = true;
        setSearchParams(prev => ({ ...prev, q: urlQuery }));
        setFirstVisit(false);
      }
    }
  }, [urlQuery]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setSearchParams((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = useCallback(
    async (e?: React.FormEvent | null) => {
      if (e) e.preventDefault();
      
      // Evitar búsquedas duplicadas
      if (searchPerformed.current) return;
      searchPerformed.current = true;

      if (!searchParams.q.trim() && !searchParams.sources) {
        setError(
          "No se han encontrado artículos. Busque por palabra clave o seleccione una fuente."
        );
        setFirstVisit(false);
        searchPerformed.current = false;
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await fetchTopHeadlines({
          ...searchParams,
          pageSize: 100,
          page: 1,
        });

        if (!data.articles || data.articles.length === 0) {
          setError(
            "No se han encontrado artículos. Intente una búsqueda diferente."
          );
          setFirstVisit(false);
        } else {
          setArticles(data.articles);
          const totalArticles = data.articles.length;
          const calculatedTotalPages = Math.ceil(
            totalArticles / searchParams.pageSize
          );
          setTotalPages(calculatedTotalPages);
          sessionStorage.setItem("articles", JSON.stringify(data.articles));
          sessionStorage.setItem("searchParams", JSON.stringify(searchParams));
          sessionStorage.setItem("totalPages", calculatedTotalPages.toString());
          setCurrentPage(1);
          sessionStorage.setItem("currentPage", "1");
          setFirstVisit(false);
        }
      } catch (error) {
        console.error("Error searching articles:", error);
        setError("Error al buscar noticias. Por favor, inténtelo de nuevo.");
        setFirstVisit(false);
      } finally {
        setLoading(false);
        // Reset search performed flag to allow future searches
        setTimeout(() => {
          searchPerformed.current = false;
        }, 500);
      }
    },
    [searchParams]
  );

  // Ejecutar búsqueda cuando cambian los parámetros de búsqueda desde URL
  useEffect(() => {
    if (queryProcessed.current && searchParams.q && !searchPerformed.current) {
      handleSearch();
    }
  }, [searchParams, handleSearch]);

  const getPaginatedArticles = () => {
    const storedArticles = JSON.parse(
      sessionStorage.getItem("articles") || "[]"
    );
    const startIndex = (currentPage - 1) * searchParams.pageSize;
    const endIndex = Math.min(
      startIndex + searchParams.pageSize,
      storedArticles.length
    );
    return storedArticles.slice(startIndex, endIndex);
  };

  const smoothScrollToTop = () => {
    const scrollDuration = 500;
    const scrollStep = -window.scrollY / (scrollDuration / 15);

    const scrollInterval = setInterval(() => {
      if (window.scrollY > 0) {
        window.scrollBy(0, scrollStep);
      } else {
        clearInterval(scrollInterval);
      }
    }, 15);
  };

  const handlePageChange = (page: number) => {
    setLoading(true);
    setCurrentPage(page);
    sessionStorage.setItem("currentPage", page.toString());
    smoothScrollToTop();
    setTimeout(() => setLoading(false), 500);
  };

  // Mostrar pantalla de carga mientras se verifica la sesión
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-screen bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100 dark:from-gray-900 dark:via-blue-900/30 dark:to-blue-800/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-200/20 dark:bg-blue-400/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-blue-100/20 dark:bg-blue-500/5 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
        </div>

        {/* Content */}
        <div className="relative">
          <ArticleForm
            searchParams={searchParams}
            handleInputChange={handleInputChange}
            handleSearch={handleSearch}
          />

          {loading && (
            <div className="flex justify-center items-center min-h-[400px]">
              <PageLoader />
            </div>
          )}
          {!loading && error && (
            <div className="mt-8">
              <NoResultsFound message={error} />
            </div>
          )}

          {!loading && firstVisit && articles.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center min-h-[500px] bg-white/50 dark:bg-gray-800/50 rounded-2xl backdrop-blur-sm p-8 shadow-lg">
              <FirstVisitIcon />
              <h1 className="text-2xl sm:text-3xl font-bold text-blue-800 dark:text-blue-300 mt-6 text-center">
                Empieza a buscar noticias
              </h1>
              <p className="text-blue-600 dark:text-blue-400 mt-4 text-center max-w-md">
                Utiliza el formulario de búsqueda para encontrar artículos de tu
                interés
              </p>
            </div>
          )}

          {!loading && !error && articles.length > 0 && (
            <div className="space-y-8 mt-8">
              <ArticleList articles={getPaginatedArticles()} />
              <div className="mt-8 flex justify-center">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

// Componente de icono para primera visita
const FirstVisitIcon = () => {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) return null;
  
  // Verificamos tanto theme como resolvedTheme para mayor confiabilidad
  // También comprobamos si existe preferencia de color oscuro en el medio
  const isDarkMode = theme === 'dark' || resolvedTheme === 'dark' || 
    (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="250"
      height="250"
      viewBox="0 0 250 250"
      className="animate-float drop-shadow-xl"
    >
      {/* Fondo circular */}
      <circle cx="125" cy="125" r="100" fill={isDarkMode ? "#1e293b" : "#f0f9ff"} />
      
      {/* Periódico principal */}
      <g transform="translate(85, 65) rotate(5)">
        <rect x="0" y="0" width="100" height="130" rx="3" fill={isDarkMode ? "#475569" : "#ffffff"} stroke={isDarkMode ? "#94a3b8" : "#3b82f6"} strokeWidth="2" />
        
        {/* Titular */}
        <rect x="10" y="10" width="80" height="8" rx="2" fill={isDarkMode ? "#94a3b8" : "#3b82f6"} />
        
        {/* Líneas de texto */}
        <rect x="10" y="25" width="80" height="3" rx="1" fill={isDarkMode ? "#64748b" : "#93c5fd"} />
        <rect x="10" y="33" width="75" height="3" rx="1" fill={isDarkMode ? "#64748b" : "#93c5fd"} />
        <rect x="10" y="41" width="80" height="3" rx="1" fill={isDarkMode ? "#64748b" : "#93c5fd"} />
        
        {/* Imagen */}
        <rect x="10" y="50" width="80" height="40" rx="2" fill={isDarkMode ? "#1e293b" : "#dbeafe"} />
        
        {/* Más líneas de texto */}
        <rect x="10" y="100" width="80" height="3" rx="1" fill={isDarkMode ? "#64748b" : "#93c5fd"} />
        <rect x="10" y="108" width="70" height="3" rx="1" fill={isDarkMode ? "#64748b" : "#93c5fd"} />
        <rect x="10" y="116" width="80" height="3" rx="1" fill={isDarkMode ? "#64748b" : "#93c5fd"} />
      </g>
      
      {/* Periódico en segundo plano */}
      <g transform="translate(60, 75) rotate(-5)">
        <rect x="0" y="0" width="100" height="130" rx="3" fill={isDarkMode ? "#334155" : "#f8fafc"} stroke={isDarkMode ? "#64748b" : "#60a5fa"} strokeWidth="2" />
      </g>
      
      {/* Lupa */}
      <g transform="translate(160, 90) rotate(15)">
        <circle cx="25" cy="25" r="20" fill="none" stroke={isDarkMode ? "#38bdf8" : "#2563eb"} strokeWidth="6" />
        <line x1="40" y1="40" x2="60" y2="60" stroke={isDarkMode ? "#38bdf8" : "#2563eb"} strokeWidth="6" strokeLinecap="round" />
      </g>
      
      {/* Estrellas/destellos */}
      <g fill={isDarkMode ? "#38bdf8" : "#3b82f6"}>
        <circle cx="55" cy="65" r="4" />
        <circle cx="180" cy="150" r="3" />
        <circle cx="65" cy="185" r="5" />
        <circle cx="190" cy="75" r="4" />
      </g>
    </svg>
  );
};

export default Page;
