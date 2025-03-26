"use client";

import FollowsTable from "./FollowsTable";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
  follower: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  following: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

export default function FollowsPage() {
  const [follows, setFollows] = useState<Follow[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar datos al inicio
  useEffect(() => {
    const fetchFollows = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/follows');
        
        if (!response.ok) {
          throw new Error('Error al cargar datos de seguidores');
        }
        
        const data = await response.json();
        
        // Transformamos los resultados para añadir un id único a cada relación
        const followsWithId = (data || []).map((follow: {
          followerId: string;
          followingId: string;
          createdAt: Date;
          follower: {
            id: string;
            name: string | null;
            email: string | null;
            image: string | null;
          };
          following: {
            id: string;
            name: string | null;
            email: string | null;
            image: string | null;
          };
        }) => ({
          ...follow,
          id: `follow_${follow.followerId}_${follow.followingId}`
        }));
        
        setFollows(followsWithId);
      } catch (error) {
        console.error("Error al cargar seguidores:", error);
        toast.error("No se pudieron cargar los datos de seguidores");
      } finally {
        setLoading(false);
      }
    };
    
    fetchFollows();
  }, []);

  // Función para eliminar relación de seguimiento
  const handleDeleteFollow = async (id: string) => {
    try {
      // Extraer followerId y followingId del ID compuesto
      const [_, followerId, followingId] = id.split('_');
      
      if (!followerId || !followingId) {
        throw new Error('ID de relación de seguimiento inválido');
      }
      
      const response = await fetch(`/api/admin/follows?followerId=${followerId}&followingId=${followingId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar relación');
      }
      
      // Actualizar el estado local para eliminar la relación sin recargar la página
      setFollows(currentFollows => 
        currentFollows.filter(follow => follow.id !== id)
      );
      
      toast.success('Relación de seguimiento eliminada correctamente');
    } catch (error: Error | unknown) {
      console.error('Error al eliminar relación de seguimiento:', error);
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar la relación de seguimiento');
      throw error; // Re-lanzar el error para que el componente FollowsTable pueda manejar el estado de carga
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Seguidores</h1>
        <p className="text-muted-foreground">
          Gestiona las relaciones de seguimiento entre usuarios.
        </p>
      </div>

      <div className="bg-card rounded-lg shadow">
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <FollowsTable follows={follows} onDeleteFollow={handleDeleteFollow} />
        )}
      </div>
    </div>
  );
}
