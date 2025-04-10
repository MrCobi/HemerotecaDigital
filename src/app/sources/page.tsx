"use client";

import { Source } from "@/src/interface/source";
import SourcesPage from "@/src/app/components/SourceList";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { API_ROUTES } from "@/src/config/api-routes";

export default function Page() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSources, setTotalSources] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const sourcesPerPage = 6;

  useEffect(() => {
    // Verificar autenticación
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
      return;
    }

    // Verificar que el correo electrónico está verificado
    if (status === "authenticated" && !session?.user?.emailVerified) {
      router.push("/auth/verification-pending");
      return;
    }

    const fetchData = async () => {
      try {
        const response = await fetch(API_ROUTES.sources.list(
          currentPage,
          sourcesPerPage,
          selectedLanguage !== "all" ? selectedLanguage : undefined,
          searchTerm || undefined
        ));
        const data = await response.json();

        setSources(data.sources);
        setTotalSources(data.pagination.total);
      } catch (error) {
        console.error("Error fetching sources:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchData();
    }
  }, [currentPage, searchTerm, selectedLanguage, status, session, router]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
  };

  // Mostrar loading mientras se verifica la sesión
  if (status === "loading" || isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <SourcesPage
      sources={sources}
      totalSources={totalSources}
      currentPage={currentPage}
      sourcesPerPage={sourcesPerPage}
      selectedLanguage={selectedLanguage}
      onPageChange={handlePageChange}
      onSearch={handleSearch}
      onLanguageChange={handleLanguageChange}
    />
  );
}
