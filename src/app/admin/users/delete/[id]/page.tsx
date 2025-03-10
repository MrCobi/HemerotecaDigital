"use client";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { useState, useEffect } from "react";
import { CustomUser as User} from "@/src/interface/user";


export default function DeleteUserPage() {
  const { id } = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      const res = await fetch(`/api/users/${id}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    }
    fetchUser();
  }, [id]);

  const handleDelete = async () => {
    setIsLoading(true);
    const res = await fetch(`/api/users/delete/${id}`, { method: "DELETE" });

    if (res.ok) {
      router.push("/admin/users");
    } else {
      setIsLoading(false);
      alert("Error al eliminar el usuario");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden animate-fadeIn">
          <div className="relative">
            {/* Banda superior roja */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-red-500"></div>
            
            <div className="p-8">
              <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <div className="absolute inset-0 bg-red-500/20 rounded-full animate-pulse"></div>
                  <Image
                    src={user.image || "/images/default_periodico.jpg"}
                    alt={user.name || "Usuario"}
                    fill
                    className="rounded-full object-cover border-4 border-red-500/50"
                  />
                </div>

                <h1 className="text-3xl font-bold text-white mb-2">Confirmar Eliminación</h1>
                <p className="text-gray-400 mb-6">Esta acción no se puede deshacer</p>

                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 mb-8">
                  <h2 className="text-xl font-semibold text-white mb-4">Información del usuario</h2>
                  <div className="space-y-2 text-left">
                    <p className="text-gray-300">
                      <span className="font-medium">Nombre:</span> {user.name}
                    </p>
                    <p className="text-gray-300">
                      <span className="font-medium">Email:</span> {user.email}
                    </p>
                    <p className="text-gray-300">
                      <span className="font-medium">Rol:</span> {user.role}
                    </p>
                    <p className="text-gray-300">
                      <span className="font-medium">ID:</span> {user.id}
                    </p>
                  </div>
                </div>

                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => router.push("/admin/users")}
                    className="flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 transform hover:scale-105"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                    </svg>
                    Cancelar
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isLoading}
                    className={`flex items-center px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 transform hover:scale-105 ${
                      isLoading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isLoading ? (
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                    {isLoading ? 'Eliminando...' : 'Eliminar Usuario'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}