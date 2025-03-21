"use client";

import { useState } from "react";
import { Trash, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/src/app/components/ui/alert-dialog";
import { Button } from "@/src/app/components/ui/button";

interface DeleteSourceDialogProps {
  _sourceId: string; // Prefixed with underscore to avoid issues with React attributes
  sourceName: string;
  onDelete: () => Promise<void>;
}

export default function DeleteSourceDialog({
  _sourceId,
  sourceName,
  onDelete,
}: DeleteSourceDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete();
    } catch (error) {
      console.error("Error durante la eliminación:", error);
    } finally {
      setIsDeleting(false);
      setIsOpen(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !isDeleting && setIsOpen(open)}>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          className="inline-flex items-center text-sm px-2 py-1 rounded-md"
        >
          <Trash className="w-4 h-4 mr-1" />
          Eliminar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción eliminará la fuente <strong>"{sourceName}"</strong> y no se puede deshacer.
            Todos los comentarios, valoraciones y favoritos asociados a esta fuente también serán eliminados.
          </AlertDialogDescription>
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
                Eliminando...
              </>
            ) : (
              'Eliminar'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
