import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { GestorPermisoEstado, CarteraConfigPublic } from "../types/gestor";

export interface CarteraActiva {
  carteraId: number;
  carteraNombre: string;
  tipoInteres: number;
  numCuotas: number;
  config: CarteraConfigPublic;
  /** Permisos del gestor en la cartera (para gatear acciones en la APK). */
  permisos?: GestorPermisoEstado[];
}

export interface CarteraActivaContextValue {
  carteraActiva: CarteraActiva | null;
  setCarteraActiva: (cartera: CarteraActiva | null) => void;
}

export const CarteraActivaContext = createContext<CarteraActivaContextValue | null>(null);

export function CarteraActivaProvider({ children }: { children: ReactNode }) {
  const [carteraActiva, setCarteraActiva] = useState<CarteraActiva | null>(null);
  const value = useMemo(
    () => ({ carteraActiva, setCarteraActiva }),
    [carteraActiva],
  );
  return (
    <CarteraActivaContext.Provider value={value}>
      {children}
    </CarteraActivaContext.Provider>
  );
}

export function useCarteraActiva(): CarteraActivaContextValue {
  const ctx = useContext(CarteraActivaContext);
  if (!ctx) {
    throw new Error("useCarteraActiva debe usarse dentro de CarteraActivaProvider");
  }
  return ctx;
}