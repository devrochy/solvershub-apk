import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSession } from "./session-context";
import type { NotificacionPublic } from "../types/gestor";

const CLAVE_LAST_SEEN = "cobranza_notif_last_seen";
const CLAVE_DESCARTADAS = "cobranza_notif_descartadas";

interface NotificacionesValue {
  items: NotificacionPublic[];
  noLeidas: number;
  cargando: boolean;
  cargar(): Promise<void>;
  marcarVistas(): Promise<void>;
  descartar(id: string): Promise<void>;
}

const DEFAULT: NotificacionesValue = {
  items: [],
  noLeidas: 0,
  cargando: false,
  cargar: async () => undefined,
  marcarVistas: async () => undefined,
  descartar: async () => undefined,
};

const NotificacionesContext = createContext<NotificacionesValue>(DEFAULT);

/**
 * Feed de notificaciones del gestor/propietario. El estado "leído" se resuelve
 * en el dispositivo: `noLeidas` = eventos posteriores a `lastSeen` (AsyncStorage).
 */
export function NotificacionesProvider({ children }: { children: ReactNode }) {
  const { api, gestor } = useSession();
  const [items, setItems] = useState<NotificacionPublic[]>([]);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [descartadas, setDescartadas] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setItems(await api.notificaciones());
    } catch {
      // Sin conexión: se mantiene la última lista cargada.
    } finally {
      setCargando(false);
    }
  }, [api]);

  const marcarVistas = useCallback(async () => {
    const ahora = new Date().toISOString();
    setLastSeen(ahora);
    await AsyncStorage.setItem(CLAVE_LAST_SEEN, ahora);
  }, []);

  const descartar = useCallback(async (id: string) => {
    setDescartadas((actuales) => {
      if (actuales.includes(id)) {
        return actuales;
      }
      const siguientes = [...actuales, id];
      void AsyncStorage.setItem(CLAVE_DESCARTADAS, JSON.stringify(siguientes));
      return siguientes;
    });
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE_LAST_SEEN)
      .then((valor) => setLastSeen(valor))
      .catch(() => undefined);
    AsyncStorage.getItem(CLAVE_DESCARTADAS)
      .then((valor) => {
        if (valor) {
          setDescartadas(JSON.parse(valor) as string[]);
        }
      })
      .catch(() => undefined);
  }, []);

  const gestorId = gestor?.id ?? null;
  useEffect(() => {
    if (gestorId !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch al cambiar de usuario (async; el setState ocurre dentro de cargar)
      void cargar();
    }
  }, [gestorId, cargar]);

  const visibles = useMemo(
    () => items.filter((n) => !descartadas.includes(n.id)),
    [items, descartadas],
  );

  const noLeidas = useMemo(
    () => visibles.filter((n) => !lastSeen || n.fecha > lastSeen).length,
    [visibles, lastSeen],
  );

  const value = useMemo(
    () => ({ items: visibles, noLeidas, cargando, cargar, marcarVistas, descartar }),
    [visibles, noLeidas, cargando, cargar, marcarVistas, descartar],
  );

  return (
    <NotificacionesContext.Provider value={value}>
      {children}
    </NotificacionesContext.Provider>
  );
}

export function useNotificaciones(): NotificacionesValue {
  return useContext(NotificacionesContext);
}
