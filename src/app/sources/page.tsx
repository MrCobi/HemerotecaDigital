"use client";

import { Source } from "@/src/interface/source";
import SourcesPage from "@/src/app/components/SourceList";
import { useEffect, useState } from "react";

export default function Page() {
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/sources");
        const data = await response.json();
        setSources(data.sources);
      } catch (error) {
        console.error("Error fetching sources:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return <SourcesPage sources={sources} />;
}