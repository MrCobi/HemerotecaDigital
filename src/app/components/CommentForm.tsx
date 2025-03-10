"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/src/app/components/ui/textarea";
import { MessageSquare, AlertCircle } from "lucide-react";

const MAX_LENGTH = 500;

export default function CommentForm({
  sourceId,
  onCommentAdded,
}: {
  sourceId: string;
  onCommentAdded: () => void;
}) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const remainingChars = MAX_LENGTH - content.length;
  const isContentValid = content.trim().length >= 3 && content.trim().length <= MAX_LENGTH;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      setError("Debes iniciar sesión para comentar");
      return;
    }

    if (!isContentValid) {
      setError("El comentario debe tener entre 3 y 500 caracteres");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, sourceId }),
      });

      if (!response.ok) throw new Error("Error al publicar comentario");

      setContent("");
      onCommentAdded();
    } catch (error) {
      console.error("Error:", error);
      setError(error instanceof Error ? error.message : "Error desconocido");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setError(null);
          }}
          placeholder="Comparte tu opinión..."
          className={`min-h-[120px] resize-none transition-all duration-200 ${
            error ? 'border-red-500 focus:ring-red-200' : ''
          }`}
          disabled={isSubmitting || !session}
        />
        
        <div className="absolute bottom-3 right-3 text-sm text-gray-500">
          {content.length > 0 && (
            <span className={remainingChars < 50 ? 'text-orange-500' : ''}>
              {remainingChars}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button
          type="submit"
          disabled={isSubmitting || !isContentValid || !session}
          className={`relative overflow-hidden transition-all duration-200 ${
            isSubmitting ? 'bg-blue-400' : ''
          }`}
        >
          <span className={`flex items-center gap-2 ${isSubmitting ? 'opacity-0' : ''}`}>
            <MessageSquare className="w-4 h-4" />
            Publicar comentario
          </span>
          {isSubmitting && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </Button>

        {!session && (
          <span className="text-sm text-gray-500 flex items-center gap-2">
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
            Inicia sesión para comentar
          </span>
        )}
      </div>
    </form>
  );
}