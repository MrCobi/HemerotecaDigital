"use client";

import { useState, ReactNode } from "react";
import { Trash, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/src/app/components/ui/alert-dialog";
import { Button } from "@/src/app/components/ui/button";

interface DeleteDialogProps {
  entityId?: string;
  entityName?: string;
  entityType?: string;
  title?: string;
  description?: string;
  onDelete: () => Promise<void>;
  buttonSize?: "sm" | "lg" | "default" | "icon";
  buttonLabel?: string;
  deleteLabel?: string;
  deletingLabel?: string;
  consequenceText?: string;
  children?: ReactNode;
}

export default function DeleteDialog({
  entityName,
  entityType = "el elemento",
  title,
  description,
  onDelete,
  buttonSize = "sm",
  buttonLabel = "Eliminar",
  deleteLabel = "Eliminar",
  deletingLabel = "Eliminando...",
  consequenceText,
  children,
}: DeleteDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete();
      setIsOpen(false);
    } catch (error) {
      console.error(`Error durante la eliminación de ${entityType}:`, error);
    } finally {
      setIsDeleting(false);
    }
  };

  const dialogTitle = title || "¿Estás seguro?";
  const dialogDescription = description || 
    `Esta acción eliminará ${entityType}${entityName ? ` <strong>"${entityName}"</strong>` : ''} y no se puede deshacer.`;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !isDeleting && setIsOpen(open)}>
      <AlertDialogTrigger asChild>
        {children || (
          <button
            className="inline-flex items-center justify-center h-7 py-0.5 px-1.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/40 transition-colors"
            title={`Eliminar ${entityType}`}
          >
            <Trash className="h-3.5 w-3.5" />
            <span className="ml-1 text-xs truncate">{buttonLabel}</span>
          </button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
          <div className="text-sm text-muted-foreground">
            <span dangerouslySetInnerHTML={{ __html: dialogDescription }} />
            {consequenceText && (
              <div className="mt-2">{consequenceText}</div>
            )}
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirmDelete} 
            className="bg-destructive hover:bg-destructive/90"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {deletingLabel}
              </>
            ) : (
              deleteLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
