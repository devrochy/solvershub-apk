import { useCallback, useEffect, useState } from "react";

import { estaVisto, guardarVistos, leerVistos, marcarVisto, type Vistos } from "./vistos";

type ChatConActividad = {
  id: string;
  last_message_at?: string | null;
  started_at: string;
};

/** Marcas de «visto» del dispositivo, cargadas de AsyncStorage al montar. */
export function useVistos() {
  const [vistos, setVistos] = useState<Vistos>({});

  useEffect(() => {
    let vigente = true;
    void leerVistos().then((guardados) => {
      if (vigente) setVistos(guardados);
    });
    return () => {
      vigente = false;
    };
  }, []);

  const marcar = useCallback((id: string, actividad: string) => {
    setVistos((actuales) => {
      const siguiente = marcarVisto(actuales, id, actividad);
      if (siguiente === actuales) return actuales;
      void guardarVistos(siguiente);
      return siguiente;
    });
  }, []);

  const visto = useCallback((chat: ChatConActividad) => estaVisto(vistos, chat), [vistos]);

  return { marcar, visto };
}
