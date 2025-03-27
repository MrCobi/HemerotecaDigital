"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { PrivacySettings } from "@/src/app/components/PrivacySettings";
import { getUserPrivacySettings } from "@/lib/api";
import { redirect } from "next/navigation";
import { toast } from "react-hot-toast";
import { ThemeSelector } from "@/src/app/components/ThemeSelector";
import { motion } from "framer-motion";
import { UserIcon, LockClosedIcon, TrashIcon, InformationCircleIcon } from "@heroicons/react/24/outline";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState({
    showFavorites: true,
    showActivity: true,
  });
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteRequested, setDeleteRequested] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      if (session?.user) {
        try {
          const userSettings = await getUserPrivacySettings();
          setSettings(userSettings);
        } catch (error) {
          console.error("Error al cargar configuración de privacidad:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    if (status === "authenticated") {
      loadSettings();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [session, status]);

  // Redireccionar si no está autenticado
  if (status === "unauthenticated") {
    redirect("/api/auth/signin");
  }

  const handleDeleteAccount = async () => {
    if (!session?.user?.email) return;
    
    try {
      setIsDeleting(true);
      const response = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Correo de confirmación enviado. Por favor revisa tu bandeja de entrada.');
      } else {
        toast.error(data.message || 'Error al enviar el correo de confirmación');
      }
    } catch (error) {
      console.error('Error al solicitar eliminación de cuenta:', error);
      toast.error('Error al procesar la solicitud');
    } finally {
      setIsDeleting(false);
    }
  };

  // Animación para los items
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  useEffect(() => {
    // Aplicar transiciones a elementos clave cuando cambia el tema
    document.documentElement.style.transition = "background-color 0.5s ease, color 0.5s ease";
    document.body.style.transition = "background-color 0.5s ease, color 0.5s ease";
    
    // Selecciona todos los elementos que cambian con el tema
    const elementsToTransition = document.querySelectorAll('.bg-white, .bg-gray-100, .bg-gray-200, .dark\\:bg-gray-800, .dark\\:bg-gray-700, .dark\\:bg-gray-900');
    
    elementsToTransition.forEach(element => {
      if (element instanceof HTMLElement) {
        element.style.transition = "background-color 0.5s ease, color 0.5s ease, border-color 0.5s ease, box-shadow 0.5s ease";
      }
    });
    
    return () => {
      // Limpieza al desmontar
      document.documentElement.style.transition = "";
      document.body.style.transition = "";
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-950 py-8 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-8 rounded-xl shadow-lg dark:shadow-blue-900/20"
          >
            <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-blue-100">Configuración</h1>
            <div className="flex items-center justify-center py-10">
              <div className="animate-pulse flex space-x-4">
                <div className="rounded-full bg-blue-400 dark:bg-blue-600 h-10 w-10"></div>
                <div className="flex-1 space-y-6 py-1">
                  <div className="h-2 bg-blue-400 dark:bg-blue-600 rounded"></div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="h-2 bg-blue-400 dark:bg-blue-600 rounded col-span-2"></div>
                      <div className="h-2 bg-blue-400 dark:bg-blue-600 rounded col-span-1"></div>
                    </div>
                    <div className="h-2 bg-blue-400 dark:bg-blue-600 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-950 py-8 px-4 sm:px-6 transition-all duration-300">
      <div className="max-w-3xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
            Configuración de tu cuenta
          </h1>
          <p className="mt-3 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Gestiona tus preferencias y opciones de privacidad
          </p>
        </motion.div>
        
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* Sección Tema */}
          <motion.div variants={item} className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg dark:shadow-blue-900/20">
            <div className="flex items-center border-b border-gray-100 dark:border-gray-700 p-5">
              <UserIcon className="h-6 w-6 text-blue-500 dark:text-blue-400 mr-3" />
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Personalización</h3>
            </div>
            <div className="p-5">
              <ThemeSelector />
            </div>
          </motion.div>
          
          {/* Sección de Privacidad */}
          <motion.div variants={item} className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg dark:shadow-blue-900/20">
            <div className="flex items-center border-b border-gray-100 dark:border-gray-700 p-5">
              <LockClosedIcon className="h-6 w-6 text-blue-500 dark:text-blue-400 mr-3" />
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Privacidad</h2>
            </div>
            <div className="p-5">
              <PrivacySettings initialSettings={settings} />
            </div>
          </motion.div>

          {/* Sección de Eliminar Cuenta */}
          <motion.div 
            variants={item} 
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg dark:shadow-blue-900/20"
          >
            <div className="flex items-center border-b border-gray-100 dark:border-gray-700 p-5">
              <TrashIcon className="h-6 w-6 text-red-500 mr-3" />
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Eliminar cuenta</h2>
            </div>
            <div className="p-5">
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg mb-5 border border-red-100 dark:border-red-800/30">
                <p className="text-gray-700 dark:text-gray-200">Una vez elimines tu cuenta, no hay vuelta atrás. Por favor, ten la certeza de que deseas hacerlo.</p>
              </div>
              
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex">
                  <InformationCircleIcon className="h-6 w-6 text-blue-500 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      La eliminación de la cuenta es permanente. Todos tus datos y documentos serán eliminados y no podrán ser recuperados.
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mt-2">
                      <strong>Importante:</strong> Recibirás un correo electrónico de confirmación para completar el proceso. Deberás hacer clic en el enlace de confirmación dentro de las próximas 24 horas.
                    </p>
                  </div>
                </div>
              </div>
              
              {deleteRequested ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                  <p className="text-green-700 dark:text-green-300">
                    <span className="font-medium">¡Solicitud enviada!</span> Hemos enviado un correo electrónico con instrucciones para confirmar la eliminación de tu cuenta.
                  </p>
                </div>
              ) : showDeleteConfirm ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                  <h4 className="text-red-800 dark:text-red-300 font-medium mb-2">¿Estás seguro?</h4>
                  <p className="text-red-700 dark:text-red-300 mb-4 text-sm">Esta acción no se puede deshacer. Se enviará un email de confirmación a tu dirección registrada.</p>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center disabled:opacity-50"
                    >
                      {isDeleting ? 'Procesando...' : 'Confirmar eliminación'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center"
                >
                  <TrashIcon className="h-5 w-5 mr-2" />
                  Solicitar eliminación de cuenta
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
