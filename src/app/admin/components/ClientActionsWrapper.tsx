"use client";

import { ReactNode } from "react";

type ClientActionsWrapperProps = {
  children: ReactNode;
};

/**
 * Este componente sirve como un envoltorio para convertir secciones con eventos
 * interactivos en componentes cliente.
 */
export default function ClientActionsWrapper({ children }: ClientActionsWrapperProps) {
  return <>{children}</>;
}
