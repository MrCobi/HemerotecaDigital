"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { fetchTopHeadlines } from "../services/NewsEverythingService";
import { Article } from "../../interface/article";
import Image from "next/image";
import ArticleList from "@/src/app/components/Article/ArticleList";
import Loading from "../components/Loading";
import NoArticlesError from "@/src/app/components/Article/NoArticlesError";
import ArticleForm from "@/src/app/components/Article/ArticleForm";
import Pagination from "@/src/app/components/Article/Pagination";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

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
  const [imagePath, setImagePath] = useState("");
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
        setImagePath(getRandomImage());
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
          setImagePath(getRandomImage());
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
        setError("Error fetching news");
        setImagePath(getRandomImage());
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

  const getRandomImage = () =>
    `/images/ArticuloError/ArticuloError${
      Math.floor(Math.random() * 3) + 1
    }.jpg`;

  // Mostrar pantalla de carga mientras se verifica la sesión
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loading />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-200/20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-blue-100/20 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
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
              <Loading />
            </div>
          )}
          {!loading && error && (
            <div className="mt-8">
              <NoArticlesError message={error} imagePath={imagePath} />
            </div>
          )}

          {!loading && firstVisit && articles.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center min-h-[500px] bg-white/50 rounded-2xl backdrop-blur-sm p-8 shadow-lg">
              <Image
                src="/images/PrimeraVista.png"
                alt="No articles found"
                width={300}
                height={300}
                className="animate-float"
              />
              <h1 className="text-2xl sm:text-3xl font-bold text-blue-800 mt-6 text-center">
                Empieza a buscar noticias
              </h1>
              <p className="text-blue-600 mt-4 text-center max-w-md">
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

export default Page;
