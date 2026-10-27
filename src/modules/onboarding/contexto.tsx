import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAdminApi } from "@core/session/use-admin-api";
import { useAdminSession } from "@core/session/admin-session-context";
import { cargarRecorrido } from "./api";
import type { Recorrido } from "./logica";

interface OnboardingContexto {
  recorrido: Recorrido | null;
  /** Solo el dueño (o el master) puede terminar el primer uso: a los demás no se les avisa. */
  puedeTerminar: boolean;
  /** El asistente está a la vista (se abre solo la primera vez o desde el aviso). */
  abierto: boolean;
  abrir: () => void;
  cerrar: () => void;
  actualizar: (recorrido: Recorrido) => void;
}

const Contexto = createContext<OnboardingContexto>({
  recorrido: null,
  puedeTerminar: false,
  abierto: false,
  abrir: () => undefined,
  cerrar: () => undefined,
  actualizar: () => undefined,
});

export function useOnboarding(): OnboardingContexto {
  return useContext(Contexto);
}

/**
 * Estado del recorrido de primer uso (HU-APP-22, SPEC-41). Lo decide el servidor: `abrir` (dueño que aún
 * no lo tocó) abre el asistente solo, y `avisar` (en curso u omitido) deja el aviso fijo en el header.
 * Si la consulta falla no se bloquea nada: la app sigue como antes.
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const api = useAdminApi();
  const { sesion } = useAdminSession();
  const [recorrido, setRecorrido] = useState<Recorrido | null>(null);
  const [puedeTerminar, setPuedeTerminar] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const negocio = sesion?.tenantId ?? null;

  useEffect(() => {
    let vivo = true;
    if (!negocio) return;
    Promise.all([
      cargarRecorrido(api),
      api.get<{ tenant?: { role?: string } | null; role?: string }>(
        "/admin/me",
      ),
    ])
      .then(([r, me]) => {
        if (!vivo) return;
        const dueno = me.tenant?.role === "owner" || me.role === "master";
        setRecorrido(r);
        setPuedeTerminar(dueno);
        if (r?.abrir && me.tenant?.role === "owner") setAbierto(true);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [api, negocio]);

  const abrir = useCallback(() => setAbierto(true), []);
  const cerrar = useCallback(() => setAbierto(false), []);
  const actualizar = useCallback((r: Recorrido) => setRecorrido(r), []);
  const valor = useMemo(
    () => ({ recorrido, puedeTerminar, abierto, abrir, cerrar, actualizar }),
    [recorrido, puedeTerminar, abierto, abrir, cerrar, actualizar],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
