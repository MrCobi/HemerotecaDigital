"use client";

import { useEffect, useState, useRef, memo, useCallback } from "react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { es } from "date-fns/locale";
import { useSession } from "next-auth/react";
import type { Session } from "next-auth";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  depth: number;
  user: {
    id: string;
    username: string;
    image: string | null;
  };
  parent?: {
    user: {
      username: string;
    };
  };
  replies?: Comment[];
}

interface CommentListProps {
  sourceId: string;
  refreshKey: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onCommentsLoaded?: (total: number) => void;
}

const DeleteConfirmationDialog = ({
  isOpen,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && confirmRef.current) {
      confirmRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full shadow-2xl transform transition-all scale-100 animate-in zoom-in-95 duration-200">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          ¿Eliminar comentario?
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Esta acción no se puede deshacer. ¿Estás seguro de que quieres eliminar permanentemente este comentario?
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600"
          >
            Cancelar
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

const CommentItem = memo(
  ({
    comment,
    depth = 0,
    session,
    replyingTo,
    setReplyingTo,
    handleDelete,
    handleReply,
    replyContent,
    setReplyContent,
    textareaRef,
    visibleReplies,
    toggleReplyVisibility,
    isNewComment,
  }: {
    comment: Comment;
    depth?: number;
    session: Session | null;
    replyingTo: { id: string; userName: string } | null;
    setReplyingTo: (value: { id: string; userName: string } | null) => void;
    handleDelete: (commentId: string) => void;
    handleReply: (commentId: string) => void;
    replyContent: string;
    setReplyContent: (value: string) => void;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    visibleReplies: Set<string>;
    toggleReplyVisibility: (commentId: string) => void;
    isNewComment: boolean;
  }) => {
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isVisible = isNewComment || visibleReplies.has(comment.id);

    return (
      <div
        className={`${
          depth > 0 ? "ml-2 md:ml-6 lg:ml-8" : ""
        } mt-4 border-l-2 border-indigo-100 dark:border-indigo-900/30 pl-3 md:pl-4 relative transition-all animate-in slide-in-from-left-1 duration-200`}
      >
        <div
          className={`bg-white dark:bg-gray-800/90 p-4 md:p-5 rounded-xl shadow-md relative backdrop-blur-sm transition-all duration-300 hover:shadow-lg ${
            isNewComment
              ? "animate-pulse-light border-2 border-blue-200 dark:border-blue-800"
              : "border border-gray-100 dark:border-gray-700/50"
          }`}
        >
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-start gap-3 md:gap-4 flex-1">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-indigo-600/20 rounded-full animate-pulse-slow"></div>
                <Image
                  src={comment.user.image ?? "/default-avatar.png"}
                  alt={comment.user.username}
                  width={40}
                  height={40}
                  className="rounded-full border-2 border-gray-100 dark:border-gray-700 object-cover z-10 relative"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base truncate max-w-[150px] md:max-w-none">
                    {comment.user.username}
                  </h3>
                  {comment.parent && (
                    <span className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center gap-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="truncate max-w-[100px] md:max-w-none">
                        {comment.parent.user.username}
                      </span>
                    </span>
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                    {formatDistanceToNow(new Date(comment.createdAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm md:text-base break-words leading-relaxed">
                  {comment.content}
                </p>

                <div className="flex items-center justify-between mt-3">
                  {depth < 3 && (
                    <button
                      onClick={() =>
                        setReplyingTo({
                          id: comment.id,
                          userName: comment.user.username,
                        })
                      }
                      className="text-blue-600 dark:text-blue-400 text-xs md:text-sm hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1.5 transition-colors group"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 transition-transform group-hover:scale-110"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Responder
                    </button>
                  )}

                  {(comment.userId === session?.user?.id ||
                    session?.user?.role === "admin") && (
                    <button
                      aria-label="Eliminar comentario"
                      onClick={() => handleDelete(comment.id)}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors ml-auto p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 group"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 md:h-5 md:w-5 transition-transform group-hover:scale-110"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {replyingTo?.id === comment.id && (
            <div className="mt-4 md:mt-5 ml-2 md:ml-6 transition-all animate-in slide-in-from-left-2">
              <div className="p-4 md:p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Respondiendo a{" "}
                  <span className="font-bold">{replyingTo.userName}</span>
                </div>
                <textarea
                  ref={textareaRef}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Escribe tu respuesta..."
                  className="w-full p-3 md:p-4 border-2 border-blue-100 dark:border-blue-800/50 rounded-lg mb-3 resize-none focus:border-blue-300 focus:ring-2 focus:ring-blue-200 dark:bg-gray-800 dark:text-white transition-all text-sm md:text-base"
                  rows={3}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleReply(comment.id)}
                    disabled={
                      replyContent.trim().length < 3 ||
                      replyContent.trim().length > 500
                    }
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-all shadow hover:shadow-md text-sm"
                  >
                    Publicar respuesta
                  </button>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {hasReplies && (
          <div className="mt-2 ml-2 md:ml-4">
            <button
              onClick={() => toggleReplyVisibility(comment.id)}
              className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50/80 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs md:text-sm transition-all"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 transition-transform duration-300 ${
                  isVisible ? "rotate-90" : "group-hover:translate-x-0.5"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              {isVisible
                ? "Ocultar respuestas"
                : `${comment.replies?.length} ${
                    comment.replies?.length === 1 ? "respuesta" : "respuestas"
                  }`}
            </button>
          </div>
        )}

        {isVisible &&
          comment.replies?.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              session={session}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              handleDelete={handleDelete}
              handleReply={handleReply}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              textareaRef={textareaRef}
              visibleReplies={visibleReplies}
              toggleReplyVisibility={toggleReplyVisibility}
              isNewComment={false}
            />
          ))}
      </div>
    );
  }
);

CommentItem.displayName = "CommentItem";

export default function CommentList({
  sourceId,
  refreshKey,
  currentPage,
  onPageChange,
  onCommentsLoaded,
}: CommentListProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    userName: string;
  } | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [visibleReplies, setVisibleReplies] = useState<Set<string>>(new Set());
  const [newComments, setNewComments] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [totalPages, setTotalPages] = useState(1);
  const commentsPerPage = 5;
  const [deleteState, setDeleteState] = useState({
    showDialog: false,
    commentId: "",
  });

  const fetchComments = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch(
          `/api/comments/list/${sourceId}?page=${currentPage}&limit=${commentsPerPage}`,
          { signal }
        );

        if (!response.ok) throw new Error("Error en la solicitud");

        const data = await response.json();
        if (!data || typeof data.totalPages !== "number") {
          throw new Error("Datos inválidos");
        }

        setComments(data.comments || []);
        setTotalPages(data.totalPages);

        if (onCommentsLoaded) onCommentsLoaded(data.total || 0);
        if (currentPage > data.totalPages && data.totalPages > 0) {
          onPageChange(1);
        }

        setError(null);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Error:", error);
          setError("Error al cargar comentarios");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [currentPage, sourceId, onCommentsLoaded, onPageChange, commentsPerPage]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchComments(controller.signal);
    return () => controller.abort();
  }, [sourceId, refreshKey, currentPage, fetchComments]);

  useEffect(() => {
    if (replyingTo && textareaRef.current) textareaRef.current.focus();
  }, [replyingTo]);

  const handleDelete = (commentId: string) =>
    setDeleteState({ showDialog: true, commentId });

  const confirmDelete = async () => {
    try {
      const response = await fetch(`/api/comments/${deleteState.commentId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Error al eliminar");
      await fetchComments();
    } catch (error) {
      console.error("Error eliminando comentario:", error);
      setError(
        `Error al eliminar: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`
      );
    } finally {
      setDeleteState({ showDialog: false, commentId: "" });
    }
  };

  const handleReply = async (commentId: string) => {
    try {
      const response = await fetch(`/api/comments/${commentId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent, sourceId }),
      });

      if (!response.ok) throw new Error("Error al publicar respuesta");

      const result = await response.json();
      setReplyContent("");
      setReplyingTo(null);

      if (result.comment?.id) {
        setNewComments((prev) => new Set(prev).add(result.comment.id));
        setTimeout(
          () =>
            setNewComments(
              (prev) =>
                new Set([...prev].filter((id) => id !== result.comment.id))
            ),
          3000
        );
      }

      await fetchComments();
    } catch (error) {
      console.error("Error:", error);
      setError(error instanceof Error ? error.message : "Error desconocido");
    }
  };

  const toggleReplyVisibility = (commentId: string) => {
    setVisibleReplies(
      (prev) =>
        new Set(
          prev.has(commentId)
            ? [...prev].filter((id) => id !== commentId)
            : [...prev, commentId]
        )
    );
  };

  return (
    <div className="space-y-6">
      <DeleteConfirmationDialog
        isOpen={deleteState.showDialog}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteState({ showDialog: false, commentId: "" })}
      />

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="text-center p-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl">
          <svg
            className="h-12 w-12 mx-auto text-red-500 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="font-medium">{error}</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
          <svg
            className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-500 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">
            Sé el primero en comentar
          </p>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Comparte tu opinión sobre este contenido
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                session={session}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                handleDelete={handleDelete}
                handleReply={handleReply}
                replyContent={replyContent}
                setReplyContent={setReplyContent}
                textareaRef={textareaRef}
                visibleReplies={visibleReplies}
                toggleReplyVisibility={toggleReplyVisibility}
                isNewComment={newComments.has(comment.id)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 md:gap-4 mt-8">
              <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 md:px-4 py-1.5 md:py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm text-sm"
              >
                <span className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="hidden md:inline">Anterior</span>
                </span>
              </button>
              <div className="px-3 md:px-4 py-1.5 md:py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm flex items-center text-sm">
                <span className="text-gray-700 dark:text-gray-300">
                  <span className="hidden md:inline">Página </span>
                  <span className="font-medium">{currentPage}</span>
                  <span> / </span>
                  <span className="font-medium">{totalPages}</span>
                </span>
              </div>
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 md:px-4 py-1.5 md:py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm text-sm"
              >
                <span className="flex items-center">
                  <span className="hidden md:inline">Siguiente</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 ml-1"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}