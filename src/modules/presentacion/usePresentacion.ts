import { useCallback, useEffect, useMemo, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { leerPresentacionVista, marcarPresentacionVista } from "./presentacion";

export interface Presentacion {
  /** La lectura del flag y de "reducir movimiento" ya terminó. */
  listo: boolean;
  vista: boolean;
  reduceMotion: boolean;
  marcarVista(): Promise<void>;
}

/** Estado del video de presentación de primer inicio (flag local + a11y). */
export function usePresentacion(): Presentacion {
  const [listo, setListo] = useState(false);
  const [vista, setVista] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let activo = true;
    Promise.all([
      leerPresentacionVista(),
      AccessibilityInfo.isReduceMotionEnabled().catch(() => false),
    ])
      .then(([vistaLeida, reduce]) => {
        if (!activo) return;
        setVista(vistaLeida);
        setReduceMotion(reduce);
      })
      .catch(() => undefined)
      .finally(() => {
        if (activo) setListo(true);
      });
    return () => {
      activo = false;
    };
  }, []);

  const marcarVista = useCallback(async () => {
    setVista(true);
    await marcarPresentacionVista();
  }, []);

  return useMemo(
    () => ({ listo, vista, reduceMotion, marcarVista }),
    [listo, vista, reduceMotion, marcarVista],
  );
}
