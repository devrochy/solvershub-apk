import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ReactNode } from "react";
import type {
  GestorPermisoEstado,
  CarteraConfigPublic,
  CarteraApkPublic,
} from "@shared/types/gestor";

export interface CarteraActiva {
  carteraId: string;
  carteraNombre: string;
  tipoInteres: number;
  numCuotas: number;
  config: CarteraConfigPublic;
  /** Permisos del gestor en la cartera (para gatear acciones en la APK). */
  permisos?: GestorPermisoEstado[];
  /** Cobro con QR/link habilitado (ADR-0067). */
  pagoQrActivo?: boolean;
}

export interface CarteraActivaContextValue {
  carteraActiva: CarteraActiva | null;
  setCarteraActiva: (cartera: CarteraActiva | null) => void;
}

/** Construye la cartera activa (contexto) a partir de la cartera del listado. */
export function aCarteraActiva(cartera: CarteraApkPublic): CarteraActiva {
  return {
    carteraId: cartera.id,
    carteraNombre: cartera.nombre,
    tipoInteres: cartera.tipoInteres,
    numCuotas: cartera.numCuotas,
    config: cartera.config,
    permisos: cartera.permisos,
    pagoQrActivo: cartera.pagoQrActivo,
  };
}

export const CarteraActivaContext = createContext<CarteraActivaContextValue | null>(null);

const CLAVE_ACTIVA = "cobranza_cartera_activa";

export function CarteraActivaProvider({ children }: { children: ReactNode }) {
  const [carteraActiva, setCarteraActivaState] = useState<CarteraActiva | null>(null);

  // REQ-APK-021: conserva la cartera activa al reiniciar la app.
  useEffect(() => {
    void AsyncStorage.getItem(CLAVE_ACTIVA)
      .then((raw) => {
        if (!raw) {
          return;
        }
        try {
          setCarteraActivaState(JSON.parse(raw) as CarteraActiva);
        } catch {
          // Dato corrupto: se ignora.
        }
      })
      .catch(() => undefined);
  }, []);

  const setCarteraActiva = useCallback((cartera: CarteraActiva | null) => {
    setCarteraActivaState(cartera);
    if (cartera) {
      void AsyncStorage.setItem(CLAVE_ACTIVA, JSON.stringify(cartera));
    } else {
      void AsyncStorage.removeItem(CLAVE_ACTIVA);
    }
  }, []);

  const value = useMemo(
    () => ({ carteraActiva, setCarteraActiva }),
    [carteraActiva, setCarteraActiva],
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