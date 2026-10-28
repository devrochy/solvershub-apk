import { useCallback, useEffect, useRef, useState } from "react";

export type EstadoCarga = "cargando" | "ok" | "error";

export interface Carga<T> {
  estado: EstadoCarga;
  datos: T | null;
  /** Vuelve a pedir el dato mostrando «cargando» (el botón «Reintentar» de cada widget). */
  reintentar: () => void;
}

/**
 * Carga independiente de una fuente del Resumen: cada una tiene su estado y su «Reintentar», así
 * que si falla una el resto de los widgets se muestra igual. `version` sube con el pull-to-refresh
 * (recarga sin volver a «cargando», el `RefreshControl` ya lo indica).
 */
export function useCarga<T>(pedir: () => Promise<T>, activo: boolean, version: number): Carga<T> {
  const [estado, setEstado] = useState<EstadoCarga>(activo ? "cargando" : "ok");
  const [datos, setDatos] = useState<T | null>(null);
  const [intento, setIntento] = useState(0);
  const pedirRef = useRef(pedir);
  useEffect(() => {
    pedirRef.current = pedir;
  });

  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    pedirRef
      .current()
      .then((d) => {
        if (!vivo) return;
        setDatos(d);
        setEstado("ok");
      })
      .catch(() => {
        if (vivo) setEstado("error");
      });
    return () => {
      vivo = false;
    };
  }, [activo, version, intento]);

  const reintentar = useCallback(() => {
    setEstado("cargando");
    setIntento((i) => i + 1);
  }, []);

  return { estado, datos, reintentar };
}
