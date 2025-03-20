import { Metadata } from "next";
import prisma from "@/lib/db";
import FavoritesTable from "./FavoritesTable";

export const metadata: Metadata = {
  title: "Favoritos | Panel de Administración",
  description: "Gestiona los favoritos de los usuarios en la Hemeroteca Digital",
};

export default async function FavoritesPage() {
  const favoritesData = await prisma.favoriteSource.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      source: {
        select: {
          id: true,
          name: true,
          url: true,
          imageUrl: true,
          category: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Añadir un ID único a cada favorito para la tabla
  const favorites = favoritesData.map(favorite => ({
    ...favorite,
    id: `fav_${favorite.userId}_${favorite.sourceId}`
  }));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Favoritos</h1>
        <p className="text-muted-foreground">
          Gestiona los favoritos guardados por los usuarios.
        </p>
      </div>

      <div className="bg-card rounded-lg shadow">
        <FavoritesTable favorites={favorites} />
      </div>
    </div>
  );
}
