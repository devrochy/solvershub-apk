import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type PantallaActiva =
  | { tipo: "cliente"; rutaId: number; clienteId: number; nombre: string; latitud?: number; longitud?: number; prestamoAutoSeleccionado?: boolean }
  | { tipo: "prestamo"; rutaId: number; prestamoId: number; clienteNombre: string; telefonoWhatsapp: string; valor: number; numCuotas: number }
  | { tipo: "ruta"; rutaId: number; rutaNombre: string };

export interface PantallaActivaValue {
  pantalla: PantallaActiva | null;
  abrir(pantalla: PantallaActiva): void;
  cerrar(): void;
}

export const PantallaActivaContext = createContext<PantallaActivaValue | null>(null);

export interface PantallaActivaProviderProps {
  children: ReactNode;
  /** Clave que, al cambiar, limpia la pantalla activa (p. ej. id de sesión). */
  resetKey?: unknown;
}

export function PantallaActivaProvider({ children, resetKey }: PantallaActivaProviderProps) {
  const [pantalla, setPantalla] = useState<PantallaActiva | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset de la pantalla activa al cambiar de sesión (p. ej. logout)
    setPantalla(null);
  }, [resetKey]);

  const value = useMemo(
    () => ({
      pantalla,
      abrir: setPantalla,
      cerrar: () => setPantalla(null),
    }),
    [pantalla],
  );

  return (
    <PantallaActivaContext.Provider value={value}>
      {children}
    </PantallaActivaContext.Provider>
  );
}

export function usePantallaActiva(): PantallaActivaValue {
  const ctx = useContext(PantallaActivaContext);
  if (!ctx) {
    throw new Error("usePantallaActiva debe usarse dentro de PantallaActivaProvider");
  }
  return ctx;
}