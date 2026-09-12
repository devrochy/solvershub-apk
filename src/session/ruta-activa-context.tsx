import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { CobradorPermisoEstado, RutaConfigPublic } from "../types/cobrador";

export interface RutaActiva {
  rutaId: number;
  rutaNombre: string;
  tipoInteres: number;
  numCuotas: number;
  config: RutaConfigPublic;
  /** Permisos del cobrador en la ruta (para gatear acciones en la APK). */
  permisos?: CobradorPermisoEstado[];
}

export interface RutaActivaContextValue {
  rutaActiva: RutaActiva | null;
  setRutaActiva: (ruta: RutaActiva | null) => void;
}

export const RutaActivaContext = createContext<RutaActivaContextValue | null>(null);

export function RutaActivaProvider({ children }: { children: ReactNode }) {
  const [rutaActiva, setRutaActiva] = useState<RutaActiva | null>(null);
  const value = useMemo(
    () => ({ rutaActiva, setRutaActiva }),
    [rutaActiva],
  );
  return (
    <RutaActivaContext.Provider value={value}>
      {children}
    </RutaActivaContext.Provider>
  );
}

export function useRutaActiva(): RutaActivaContextValue {
  const ctx = useContext(RutaActivaContext);
  if (!ctx) {
    throw new Error("useRutaActiva debe usarse dentro de RutaActivaProvider");
  }
  return ctx;
}