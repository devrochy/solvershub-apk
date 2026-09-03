import { createContext, ReactNode, useContext, useMemo, useState } from "react";

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

export function PantallaActivaProvider({ children }: { children: ReactNode }) {
  const [pantalla, setPantalla] = useState<PantallaActiva | null>(null);

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