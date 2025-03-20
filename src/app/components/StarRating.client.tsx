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
  const [showTooltip, setShowTooltip] = useState(false);

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
    <div className="space-y-3 sm:space-y-4">
      <div className="bg-gradient-to-br from-gray-700/30 to-gray-600/30 p-3 sm:p-4 rounded-xl backdrop-blur-sm border border-white/20">
        <div className="flex items-center justify-between mb-1 sm:mb-2">
          <div className="flex items-center gap-2 sm:gap-3">
            {renderStars(averageRating)}
            <span className="text-xl sm:text-2xl font-bold text-white">
              {averageRating ? averageRating.toFixed(1) : "0.0"}
            </span>
          </div>
          <div
            className="relative"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <div className="text-xs sm:text-sm text-white/90 cursor-help flex items-center">
              <span className="font-bold mr-1">{totalRatings}</span>
              <span>{totalRatings === 1 ? 'valoración' : 'valoraciones'}</span>
            </div>
            {showTooltip && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 sm:px-3 py-1 bg-gray-800/95 text-white text-xs rounded whitespace-nowrap z-10">
                Total de valoraciones recibidas
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800/95"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {session ? (
        <div className="bg-gradient-to-br from-gray-700/20 to-gray-600/20 p-3 sm:p-4 rounded-xl backdrop-blur-sm border border-white/10">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-xs sm:text-sm font-medium text-white/90">Tu valoración</span>
            {userRating > 0 && (
              <span className="text-xs sm:text-sm font-bold text-yellow-400">
                {userRating} {userRating === 1 ? 'estrella' : 'estrellas'}
              </span>
            )}
          </div>
          {renderStars(userRating, true)}
          {userRating > 0 && (
            <button
              onClick={handleRemoveRating}
              disabled={loading}
              className="mt-2 sm:mt-3 text-xs sm:text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
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
              Quitar valoración
            </button>
          )}
        </div>
      ) : (
        <div className="bg-gradient-to-br from-gray-700/20 to-gray-600/20 p-3 sm:p-4 rounded-xl backdrop-blur-sm border border-white/10">
          <div className="flex items-center justify-center gap-1 sm:gap-2 text-white/80">
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
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
            <span className="text-xs sm:text-sm">Inicia sesión para valorar</span>
          </div>
        </div>
      )}
    </div>
  );
}