import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import NetInfo from "@react-native-community/netinfo";
import { sincronizarCola } from "../api/offline-sync";
import { DEVICE_API_KEY } from "../config";
import {
  contarCola,
  encolar as encolarCola,
  listarCola,
  removerDeCola,
} from "./cola";

export interface OfflineValue {
  isOnline: boolean;
  sinSubir: number;
  encolar(tipoEvento: string, payload: Record<string, unknown>): Promise<void>;
  sincronizar(): Promise<void>;
}

export const OfflineContext = createContext<OfflineValue | null>(null);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [sinSubir, setSinSubir] = useState(0);

  useEffect(() => {
    let activo = true;
    const desuscribir = NetInfo.addEventListener((state) => {
      if (activo) {
        setIsOnline(state.isConnected !== false);
      }
    });
    NetInfo.fetch()
      .then((state) => {
        if (activo) {
          setIsOnline(state.isConnected !== false);
        }
      })
      .catch(() => undefined);
    contarCola()
      .then((n) => {
        if (activo) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- async on-mount
          setSinSubir(n);
        }
      })
      .catch(() => undefined);
    return () => {
      activo = false;
      desuscribir();
    };
  }, []);

  const actualizarContador = useCallback(async () => {
    setSinSubir(await contarCola());
  }, []);

  const encolar = useCallback(
    async (tipoEvento: string, payload: Record<string, unknown>) => {
      await encolarCola(tipoEvento, payload);
      await actualizarContador();
    },
    [actualizarContador],
  );

  const sincronizar = useCallback(async () => {
    const eventos = await listarCola();
    if (eventos.length === 0) {
      return;
    }
    const confirmados = await sincronizarCola(eventos, DEVICE_API_KEY);
    for (const id of confirmados) {
      await removerDeCola(id);
    }
    await actualizarContador();
  }, [actualizarContador]);

  useEffect(() => {
    if (isOnline) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- async flush de la cola
      void sincronizar().catch(() => undefined);
    }
  }, [isOnline, sincronizar]);

  const value = useMemo(
    () => ({ isOnline, sinSubir, encolar, sincronizar }),
    [isOnline, sinSubir, encolar, sincronizar],
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline(): OfflineValue {
  const ctx = useContext(OfflineContext);
  if (!ctx) {
    throw new Error("useOffline debe usarse dentro de OfflineProvider");
  }
  return ctx;
}