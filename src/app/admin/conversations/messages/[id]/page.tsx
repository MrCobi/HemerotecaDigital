"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import MessagesContainer, { 
  Message,
  User,
  ConversationParticipant
} from "../../components/MessagesContainer";
import { Button } from "@/src/app/components/ui/button";


interface Conversation {
  id: string;
  name: string | null;
  isGroup: boolean;
  imageUrl?: string | null;
  description?: string | null;
  participants: ConversationParticipant[];
  creatorId?: string;
  creator?: User | null;
  _count?: {
    messages?: number;
    participants?: number;
  };
  messages?: Message[];
}

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

// Número de mensajes por página para la visualización paginada local
const MESSAGES_PER_PAGE = 20;

export default function ConversationMessagesPage({ params }: PageProps) {
  const router = useRouter();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [participantMap, setParticipantMap] = useState<Record<string, ConversationParticipant>>({});
  const [totalPages, setTotalPages] = useState(1);
  const [allMessages, setAllMessages] = useState<Message[]>([]);

  // Obtener el ID de la conversación desde los parámetros
  useEffect(() => {
    async function getParamId() {
      try {
        const parameters = await params;
        setConversationId(parameters.id);
      } catch (err) {
        console.error("Error al obtener ID de parámetros:", err);
        setError("Error al cargar la página");
        setLoading(false);
      }
    }
    
    getParamId();
  }, [params]);

  // Cargar la información de la conversación y sus mensajes
  const loadConversation = useCallback(async () => {
    if (!conversationId) return;
    
    setLoading(true);
    
    try {
      // Verificar sesión
      const sessionRes = await fetch('/api/auth/session');
      const sessionData = await sessionRes.json();
      
      if (!sessionData.user) {
        router.push('/auth/signin');
        return;
      }
      
      // Cargar datos de la conversación
      const response = await fetch(`/api/admin/conversations/${conversationId}`);
      
      if (!response.ok) {
        throw new Error(`Error al cargar la conversación: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Datos de conversación:', data);
      setConversation(data);
      
      // Crear mapa de participantes
      const participantsMap = data.participants.reduce((map: Record<string, ConversationParticipant>, participant: ConversationParticipant) => {
        map[participant.userId] = participant;
        return map;
      }, {} as Record<string, ConversationParticipant>);
      
      setParticipantMap(participantsMap);
      
      // Utilizar los mensajes incluidos en la conversación o incluir parámetro en la llamada
      console.log(`Usando los mensajes de la conversación`);;
      
      // Si hay mensajes en la respuesta actual, los usamos directamente
      let messagesData = [];
      
      if (Array.isArray(data.messages) && data.messages.length > 0) {
        console.log('Usando mensajes incluidos en la respuesta de conversación');
        messagesData = data.messages;
      } else {
        // Si no hay mensajes, intentar obtenerlos con una llamada adicional
        console.log('Intentando cargar mensajes con parámetro include');
        try {
          const messagesResponse = await fetch(
            `/api/admin/conversations/${conversationId}?include=messages`
          );
          
          if (!messagesResponse.ok) {
            console.error('Error al cargar mensajes:', messagesResponse.status);
            setError('No se pudieron cargar los mensajes');
            setLoading(false);
            return;
          }
          
          const fullData = await messagesResponse.json();
          if (fullData && Array.isArray(fullData.messages)) {
            console.log(`Se encontraron ${fullData.messages.length} mensajes con include=messages`);
            messagesData = fullData.messages;
          } else {
            console.error('No se encontraron mensajes en la respuesta con include');
          }
        } catch (err) {
          console.error('Error al cargar mensajes con include:', err);
        }
      }
      console.log('Mensajes disponibles:', messagesData?.length || 0);
      
      // Procesar los mensajes
      if (Array.isArray(messagesData) && messagesData.length > 0) {
        // Ordenar mensajes del más antiguo al más reciente
        const sortedMessages = [...messagesData].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        
        console.log(`Se han cargado ${sortedMessages.length} mensajes`);
        
        // Guardar todos los mensajes y calcular paginación
        setAllMessages(sortedMessages);
        const numPages = Math.max(1, Math.ceil(sortedMessages.length / MESSAGES_PER_PAGE));
        setTotalPages(numPages);
        
        // Establecer explícitamente los mensajes de la primera página
        const startIdx = 0;
        const endIdx = Math.min(MESSAGES_PER_PAGE, sortedMessages.length);
        const firstPageMessages = sortedMessages.slice(startIdx, endIdx);
        
        console.log(`Mostrando mensajes ${startIdx+1} a ${endIdx} de ${sortedMessages.length}`);
        setMessages(firstPageMessages);
        setCurrentPage(1);
        setLoading(false);
      } else {
        console.log('No se encontraron mensajes o formato inválido:', messagesData);
        setAllMessages([]);
        setMessages([]);
        setTotalPages(1);
        setLoading(false);
      }
    } catch (err) {
      console.error("Error al cargar datos:", err);
      setError("Error al cargar los datos");
      setLoading(false);
    }
  }, [conversationId, router]);

  // Función para manejar la paginación 
  const handlePageChange = (page: number) => {
    // Asegurarnos de que la página esté dentro de los límites válidos
    if (page < 1 || page > totalPages) {
      console.log(`Página inválida ${page}, limitando a rango válido`);
      page = Math.max(1, Math.min(page, totalPages));
    }
    
    console.log(`Cambiando a página ${page} de ${totalPages}`);
    
    if (allMessages.length === 0) {
      console.log('No hay mensajes para mostrar');
      setMessages([]);
      setCurrentPage(page);
      setLoading(false);
      return;
    }
    
    // Calcular índices para la página actual
    const startIdx = (page - 1) * MESSAGES_PER_PAGE;
    const endIdx = Math.min(startIdx + MESSAGES_PER_PAGE, allMessages.length);
    
    // Obtener mensajes para la página actual
    const pageMessages = allMessages.slice(startIdx, endIdx);
    console.log(`Mostrando ${pageMessages.length} mensajes (${startIdx+1} a ${endIdx} de ${allMessages.length})`);
    setMessages(pageMessages);
    setCurrentPage(page);
    setLoading(false);
  };

  
  // Cargar datos iniciales cuando se obtiene el ID de la conversación
  useEffect(() => {
    if (conversationId) {
      loadConversation();
    }
  }, [conversationId, loadConversation]);
  
  // Función para recargar la conversación cuando sea necesario
  const _refreshConversation = useCallback(() => {
    if (conversationId) {
      loadConversation();
    }
  }, [conversationId, loadConversation]);



  // Manejar la eliminación de un mensaje
  const handleMessageDeleted = async (messageId: string) => {
    try {
      // Eliminar el mensaje de la vista actual
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      
      // Eliminar el mensaje también de la lista completa
      setAllMessages((prev) => prev.filter((m) => m.id !== messageId));
      
      const newTotalPages = Math.ceil(allMessages.length / MESSAGES_PER_PAGE);
      setTotalPages(newTotalPages);
      
      // Si eliminamos el último mensaje de la página actual y hay más páginas
      if (messages.length === 1 && currentPage > 1) {
        handlePageChange(currentPage - 1);
      } else if (messages.length === 0 && currentPage > 1) {
        // Si ya no quedan mensajes en esta página
        handlePageChange(currentPage - 1);
      }
      
      // Notificar eliminación exitosa
      toast.success("Mensaje eliminado correctamente");
    } catch (err) {
      console.error("Error al actualizar mensajes:", err);
      toast.error("Error al eliminar el mensaje");
    }
  };

  
  // Mostrar pantalla de carga inicial
  if (loading && !conversation) {
    return (
      <div className="container px-3 sm:px-4 py-4 sm:py-6 max-w-6xl mx-auto">
        <div className="animate-pulse flex flex-col gap-4 sm:gap-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="h-10 w-10 rounded-full bg-muted"></div>
            <div>
              <div className="h-5 w-32 sm:w-40 bg-muted rounded mb-2"></div>
              <div className="h-4 w-20 sm:w-24 bg-muted rounded"></div>
            </div>
          </div>
          
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-border bg-muted/30">
              <div className="h-5 sm:h-6 w-48 sm:w-64 bg-muted rounded"></div>
            </div>
            <div className="p-3 sm:p-6">
              <div className="flex flex-col gap-3 sm:gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted"></div>
                    <div className="flex-1">
                      <div className="h-4 sm:h-5 w-24 sm:w-32 bg-muted rounded mb-1 sm:mb-2"></div>
                      <div className="h-12 sm:h-16 w-full bg-muted/50 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar pantalla de error
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-destructive mb-3 sm:mb-4">
          <MessageSquare className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-2" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold mb-2">Error</h1>
        <p className="text-sm sm:text-base text-muted-foreground text-center">{error}</p>
        <Button 
          onClick={() => router.push('/admin/conversations')}
          className="mt-4 sm:mt-6"
          size="sm"
        >
          Volver a conversaciones
        </Button>
      </div>
    );
  }

  // Renderizar vista principal
  return (
    <div className="container px-3 sm:px-4 py-4 sm:py-6 max-w-6xl mx-auto">
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex items-center">
            <Link 
              href={`/admin/conversations/view/${conversationId}`}
              className="mr-2 p-2 rounded-full hover:bg-accent transition-colors"
              aria-label="Volver"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div className="overflow-hidden max-w-[60vw] sm:max-w-none">
              <h1 className="text-xl sm:text-2xl font-bold truncate">
                Mensajes
                {conversation?.isGroup && conversation.name && (
                  <span className="ml-1 max-w-[100px] sm:max-w-none truncate inline-block"> - {conversation.name}</span>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">
                Total: {allMessages.length} mensaje{allMessages.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <div className="flex ml-auto sm:ml-0">
            <Link
              href={`/admin/conversations/view/${conversationId}`}
              className="inline-flex items-center justify-center h-9 px-3 sm:px-4 py-1 sm:py-2 text-sm font-medium transition-colors bg-card border border-input hover:bg-accent rounded-md"
            >
              Ver detalles
            </Link>
          </div>
        </div>
      </div>

      {/* Panel de mensajes con paginación */}
      <div className="bg-card shadow rounded-lg overflow-hidden border border-border max-w-full">
        <div className="p-3 sm:p-4 border-b border-border bg-muted/30">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 max-w-full overflow-hidden">
            <h2 className="text-lg font-medium truncate">Historial de mensajes</h2>
            <span className="text-sm text-muted-foreground sm:self-center">
              {allMessages.length} mensaje{allMessages.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        
        <div className="p-3 sm:p-6">
          {loading ? (
            <div className="flex justify-center py-4 sm:py-8">
              <div className="animate-pulse flex flex-col items-center">
                <div className="h-12 w-12 rounded-full bg-muted mb-3"></div>
                <div className="h-4 w-44 bg-muted rounded mb-2"></div>
                <div className="h-3 w-32 bg-muted rounded"></div>
              </div>
            </div>
          ) : messages.length > 0 ? (
            <div className="space-y-3 sm:space-y-6 max-w-full overflow-hidden">
              <MessagesContainer
                messages={messages}
                participantMap={participantMap}
                onMessageDeleted={handleMessageDeleted}
              />
            </div>
          ) : (
            <div className="py-6 sm:py-12 text-center">
              <MessageSquare className="h-10 sm:h-12 w-10 sm:w-12 mx-auto text-muted-foreground opacity-50 mb-2 sm:mb-3" />
              <p className="text-sm sm:text-base text-muted-foreground">No hay mensajes que mostrar en esta página</p>
            </div>
          )}
        </div>
        
        {totalPages > 1 && (
          <div className="px-2 sm:px-6 py-4 border-t border-border max-w-full overflow-hidden">
            {/* Paginación adaptada para móviles */}
            <div className="flex flex-wrap justify-center items-center gap-1 sm:gap-2 w-full max-w-full overflow-x-auto pb-2">
              {/* Botón Anterior - Adaptado para móviles */}
              <button
                onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`flex items-center justify-center rounded-md min-w-[36px] h-[36px] text-sm
                  ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent'} 
                  border border-input bg-background`}
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline-block ml-1">Ant</span>
              </button>
              
              {/* Números de página adaptados para pantallas pequeñas */}
              <div className="flex items-center flex-wrap justify-center">
                {totalPages <= 5 ? (
                  /* Si hay 5 o menos páginas, mostrar todas */
                  Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`min-w-[36px] h-[36px] mx-[1px] sm:mx-1 rounded-md flex items-center justify-center text-sm 
                        ${currentPage === page 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-background hover:bg-accent border border-input'}
                        ${Math.abs(page - currentPage) > 1 && page !== 1 && page !== totalPages ? 'hidden sm:flex' : ''}`}
                    >
                      {page}
                    </button>
                  ))
                ) : (
                  /* Si hay más de 5 páginas, mostrar versión compacta */
                  <>
                    {/* Primera página siempre visible en pantallas normales */}
                    {currentPage > 2 && (
                      <button
                        onClick={() => handlePageChange(1)}
                        className="min-w-[36px] h-[36px] mx-[1px] sm:mx-1 rounded-md flex items-center justify-center text-sm bg-background hover:bg-accent border border-input hidden sm:flex"
                      >
                        1
                      </button>
                    )}
                    
                    {/* Elipsis si estamos lejos del inicio */}
                    {currentPage > 3 && (
                      <span className="mx-[1px] sm:mx-1 flex items-center justify-center">
                        <span className="hidden sm:inline">...</span>
                        <span className="sm:hidden inline">..</span>
                      </span>
                    )}
                    
                    {/* Página anterior si no es la primera */}
                    {currentPage > 1 && (
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        className="min-w-[36px] h-[36px] mx-[1px] sm:mx-1 rounded-md flex items-center justify-center text-sm bg-background hover:bg-accent border border-input"
                      >
                        {currentPage - 1}
                      </button>
                    )}
                    
                    {/* Página actual */}
                    <button
                      className="min-w-[36px] h-[36px] mx-[1px] sm:mx-1 rounded-md flex items-center justify-center text-sm bg-primary text-primary-foreground"
                      aria-current="page"
                    >
                      {currentPage}
                    </button>
                    
                    {/* Página siguiente si no es la última */}
                    {currentPage < totalPages && (
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        className="min-w-[36px] h-[36px] mx-[1px] sm:mx-1 rounded-md flex items-center justify-center text-sm bg-background hover:bg-accent border border-input"
                      >
                        {currentPage + 1}
                      </button>
                    )}
                    
                    {/* Elipsis si estamos lejos del final */}
                    {currentPage < totalPages - 2 && (
                      <span className="mx-[1px] sm:mx-1 flex items-center justify-center">
                        <span className="hidden sm:inline">...</span>
                        <span className="sm:hidden inline">..</span>
                      </span>
                    )}
                    
                    {/* Última página siempre visible en pantallas normales */}
                    {currentPage < totalPages - 1 && (
                      <button
                        onClick={() => handlePageChange(totalPages)}
                        className="min-w-[36px] h-[36px] mx-[1px] sm:mx-1 rounded-md flex items-center justify-center text-sm bg-background hover:bg-accent border border-input hidden sm:flex"
                      >
                        {totalPages}
                      </button>
                    )}
                  </>
                )}
              </div>
              
              {/* Botón Siguiente - Adaptado para móviles */}
              <button
                onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`flex items-center justify-center rounded-md min-w-[36px] h-[36px] text-sm 
                  ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent'} 
                  border border-input bg-background`}
                aria-label="Página siguiente"
              >
                <span className="hidden sm:inline-block mr-1">Sig</span>
                <ChevronLeft className="h-4 w-4 transform rotate-180" />
              </button>
            </div>
            
            {/* Indicador de página actual */}
            <div className="text-center text-xs text-muted-foreground mt-2">
              Página {currentPage} de {totalPages}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
