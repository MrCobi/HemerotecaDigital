"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Star } from "lucide-react";
import { API_ROUTES } from "@/src/config/api-routes";

export default function StarRating({ sourceId }: { sourceId: string }) {
  const { data: session } = useSession();
  const [userRating, setUserRating] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    const fetchRatings = async () => {
      try {
        if (session?.user?.id) {
          const userRes = await fetch(API_ROUTES.sources.ratings.get(sourceId) + `&t=${Date.now()}`);
          if (!userRes.ok) throw new Error("Error al obtener la valoración del usuario");
          const userData = await userRes.json();
          setUserRating(userData.rating || 0);
        }

        const avgRes = await fetch(API_ROUTES.sources.ratings.average(sourceId) + `&t=${Date.now()}`);
        if (!avgRes.ok) throw new Error("Error al obtener la media de valoraciones");
        const avgData = await avgRes.json();
        setAverageRating(avgData.average);
        setTotalRatings(avgData.total);
      } catch (error) {
        console.error("Error fetching ratings:", error);
      }
    };

    fetchRatings();
  }, [sourceId, session]);

  const handleRate = async (value: number) => {
    if (!session?.user?.id || loading) return;

    try {
      setLoading(true);
      const response = await fetch(API_ROUTES.sources.ratings.add, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId, value }),
      });

      if (!response.ok) throw new Error("Error al guardar la valoración");

      setUserRating(value);

      const avgRes = await fetch(API_ROUTES.sources.ratings.average(sourceId) + `&t=${Date.now()}`);
      if (!avgRes.ok) throw new Error("Error al obtener la media actualizada");
      const avgData = await avgRes.json();
      setAverageRating(avgData.average);
      setTotalRatings(avgData.total || 0);
    } catch (error) {
      console.error("Rating error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRating = async () => {
    if (!session?.user?.id || loading) return;

    try {
      setLoading(true);
      const response = await fetch(API_ROUTES.sources.ratings.delete(sourceId), {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Error al eliminar la valoración");

      setUserRating(0);

      const avgRes = await fetch(API_ROUTES.sources.ratings.average(sourceId) + `&t=${Date.now()}`);
      if (!avgRes.ok) throw new Error("Error al obtener la media actualizada");
      const avgData = await avgRes.json();
      setAverageRating(avgData.average);
      setTotalRatings(avgData.total || 0);
    } catch (error) {
      console.error("Error al eliminar la valoración:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number, interactive = false) => {
    return (
      <div className="flex items-center gap-0.5 sm:gap-1">
        {[1, 2, 3, 4, 5].map((value) => {
          const filled = value <= (interactive ? (hoverRating || userRating) : rating);
          const halfFilled = !filled && value <= rating + 0.5;

          return (
            <button
              key={value}
              onClick={() => interactive && handleRate(value)}
              onMouseEnter={() => interactive && setHoverRating(value)}
              onMouseLeave={() => interactive && setHoverRating(0)}
              disabled={!session || loading || !interactive}
              className={`relative transition-all duration-200 ${interactive ? 'cursor-pointer hover:scale-110' : ''
                } ${loading ? 'opacity-50' : ''}`}
            >
              <Star
                className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors duration-200 ${filled
                    ? 'fill-yellow-400 stroke-yellow-400'
                    : halfFilled
                      ? 'fill-yellow-400/50 stroke-yellow-400'
                      : 'fill-transparent stroke-gray-300'
                  }`}
              />
            </button>
          );
        })}
      </div>
    );
  };

  const formatRatingCount = (count: number): string => {
    if (count >= 1_000_000) {
      return `${(count / 1_000_000).toFixed(1)}M`;
    }
    if (count >= 10_000) {
      return `${Math.round(count / 1000)}k`;
    }
    if (count >= 1_000) {
      return `${(count / 1_000).toFixed(1)}k`;
    }
    return count.toString();
  };

  return (
    <div className="flex flex-col items-start gap-2 relative">
      <div className="flex items-center gap-2 flex-wrap z-10">
        <div className="flex items-center">
          {renderStars(averageRating, false)}
        </div>
        <div className="flex items-center text-white/90 dark:text-gray-200 text-sm">
          <span className="font-semibold mr-1">{averageRating.toFixed(1)}</span>
          <span>
            ({formatRatingCount(totalRatings)} {totalRatings === 1 ? "valoración" : "valoraciones"})
          </span>
        </div>
      </div>

      {session?.user?.id && (
        <div className="relative z-20 w-full">
          <h4 className="text-sm font-medium text-white/80 dark:text-gray-300 mb-1">
            Tu valoración
          </h4>
          <div className="flex items-center gap-2">
            <div className="flex">{renderStars(userRating, true)}</div>

            {userRating > 0 && (
              <button
                onClick={handleRemoveRating}
                disabled={loading}
                className="ml-2 text-xs sm:text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
              >
                <svg
                  className="w-3 h-3 sm:w-4 sm:h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                <span className="whitespace-nowrap">Quitar valoración</span>
              </button>
            )}
          </div>
        </div>
      )}

      {!session?.user?.id && (
        <div className="relative z-20 bg-white/10 dark:bg-gray-800/50 p-2 rounded-md mt-2">
          <div className="flex items-center gap-2 text-white/80 dark:text-gray-300 text-sm">
            <svg
              className="w-4 h-4"
              fill="none" 
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span>Inicia sesión para valorar</span>
          </div>
        </div>
      )}
    </div>
  );
}