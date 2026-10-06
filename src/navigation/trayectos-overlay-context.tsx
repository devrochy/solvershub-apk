import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import type { ClienteTrayectoDiarioPublic, TrayectoPublic } from "@shared/types/gestor";

/** Datos que necesita el overlay de trayectos (capa sobre la pestaña Trayecto diario). */
export interface ContenidoTrayectosOverlay {
  clientes: ClienteTrayectoDiarioPublic[];
  trayectos: TrayectoPublic;
}

export interface TrayectosOverlayValue {
  contenido: ContenidoTrayectosOverlay | null;
  abrir(contenido: ContenidoTrayectosOverlay): void;
  cerrar(): void;
}

export const TrayectosOverlayContext =
  createContext<TrayectosOverlayValue | null>(null);

/**
 * Estado del overlay de trayectos a nivel global. Permite renderizar el overlay
 * como una capa **hermana encima** de la capa de pestañas (igual que el detalle
 * del cliente), en vez de anidarlo dentro del tab: así su gesto de swipe no
 * compite con el swipe de la pestaña y siempre cierra revelando «cobros del
 * día».
 */
export function TrayectosOverlayProvider({ children }: { children: ReactNode }) {
  const [contenido, setContenido] = useState<ContenidoTrayectosOverlay | null>(
    null,
  );

  const value = useMemo(
    () => ({
      contenido,
      abrir: setContenido,
      cerrar: () => setContenido(null),
    }),
    [contenido],
  );

  return (
    <TrayectosOverlayContext.Provider value={value}>
      {children}
    </TrayectosOverlayContext.Provider>
  );
}

export function useTrayectosOverlay(): TrayectosOverlayValue {
  const ctx = useContext(TrayectosOverlayContext);
  if (!ctx) {
    throw new Error(
      "useTrayectosOverlay debe usarse dentro de TrayectosOverlayProvider",
    );
  }
  return ctx;
}
