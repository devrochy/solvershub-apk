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
import { sessionGateway } from "../session/token-store";
import {
  contarCola,
  encolar as encolarCola,
  existePendiente,
  fusionarPendiente,
  insertarEvento,
  listarCola,
  removerDeCola,
} from "./cola";
import {
  EventoError,
  guardarErroresSync,
  guardarUltimaSincronizacion,
  leerErroresSync,
  leerUltimaSincronizacion,
} from "./sync-meta";

export interface OfflineValue {
  isOnline: boolean;
  sinSubir: number;
  errorSync: string | null;
  /** Timestamp (ms) de la última sincronización exitosa; `null` si nunca. */
  ultimaSincronizacion: number | null;
  /** Eventos que el backend rechazó (REQ-APK-010). */
  eventosError: EventoError[];
  /** Se incrementa al "sincronizar general" para que las pantallas re-consulten. */
  versionRecarga: number;
  /** Devuelve `false` si la cola está llena (para que la UI avise). */
  encolar(tipoEvento: string, payload: Record<string, unknown>): Promise<boolean>;
  encolarSiNoExiste(
    tipoEvento: string,
    payload: Record<string, unknown>,
    dedupeKey: string,
  ): Promise<boolean>;
  sincronizar(): Promise<void>;
  /** Flush de la cola + refetch de datos (carteras/día). */
  sincronizarGeneral(): Promise<void>;
  /** Reintenta un evento rechazado (vuelve a la cola con su mismo id). */
  reintentarEvento(eventoIdCliente: string): Promise<void>;
  /** Descarta un evento rechazado. */
  descartarEvento(eventoIdCliente: string): Promise<void>;
}

export const OfflineContext = createContext<OfflineValue | null>(null);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [sinSubir, setSinSubir] = useState(0);
  const [errorSync, setErrorSync] = useState<string | null>(null);
  const [ultimaSincronizacion, setUltimaSincronizacion] = useState<number | null>(null);
  const [eventosError, setEventosError] = useState<EventoError[]>([]);
  const [versionRecarga, setVersionRecarga] = useState(0);

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
           
          setSinSubir(n);
        }
      })
      .catch(() => undefined);
    leerUltimaSincronizacion()
      .then((ts) => {
        if (activo) {
           
          setUltimaSincronizacion(ts);
        }
      })
      .catch(() => undefined);
    leerErroresSync()
      .then((errs) => {
        if (activo) {
           
          setEventosError(errs);
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
      const evento = await encolarCola(tipoEvento, payload);
      await actualizarContador();
      if (!evento) {
        setErrorSync(
          "La cola offline está llena. Conéctate y sincroniza antes de registrar más.",
        );
        return false;
      }
      return true;
    },
    [actualizarContador],
  );

  const encolarSiNoExiste = useCallback(
    async (
      tipoEvento: string,
      payload: Record<string, unknown>,
      dedupeKey: string,
    ) => {
      if (await existePendiente(tipoEvento, dedupeKey)) {
        // REQ-APK-011: no descartar la 2ª edición offline; fusionar los cambios.
        if (tipoEvento === "cambio_cliente") {
          await fusionarPendiente(tipoEvento, dedupeKey, payload);
          return true;
        }
        return false;
      }
      const evento = await encolarCola(tipoEvento, payload, dedupeKey);
      await actualizarContador();
      if (!evento) {
        setErrorSync(
          "La cola offline está llena. Conéctate y sincroniza antes de registrar más.",
        );
        return false;
      }
      return true;
    },
    [actualizarContador],
  );

  const sincronizar = useCallback(async () => {
    try {
      const eventos = await listarCola();
      if (eventos.length > 0) {
        const tokens = await sessionGateway.getTokens();
        if (!tokens) {
          throw new Error("Sesión expirada");
        }
        const acks = await sincronizarCola(eventos, tokens.accessToken);
        const porId = new Map(eventos.map((e) => [e.eventoIdCliente, e]));
        const errores: EventoError[] = [];
        for (const ack of acks) {
          const evento = porId.get(ack.eventoIdCliente);
          if (ack.estado === "error") {
            errores.push({
              eventoIdCliente: ack.eventoIdCliente,
              tipoEvento: evento?.tipoEvento ?? "?",
              error: ack.error ?? "El servidor rechazó el evento.",
              payload: evento?.payload ?? {},
              creadoEn: new Date().toISOString(),
            });
          }
          // Confirmados y rechazados salen de la cola: los rechazados quedan
          // visibles para reintentar/descartar (no bloquean el resto).
          await removerDeCola(ack.eventoIdCliente);
        }
        if (errores.length > 0) {
          const previos = await leerErroresSync();
          const fusionados = [
            ...previos.filter((p) => !errores.some((e) => e.eventoIdCliente === p.eventoIdCliente)),
            ...errores,
          ];
          setEventosError(fusionados);
          await guardarErroresSync(fusionados);
        }
      }
      setErrorSync(null);
      const ts = Date.now();
      setUltimaSincronizacion(ts);
      await guardarUltimaSincronizacion(ts);
    } catch {
      // 401 del backend o error de red: la cola se queda pendiente y se expone
      // el error para que la UI avise.
      setErrorSync(
        "No se pudo sincronizar. Verifica la conexión e inicia sesión de nuevo.",
      );
      throw new Error("Fallo de sincronización");
    }
    await actualizarContador();
  }, [actualizarContador]);

  const sincronizarGeneral = useCallback(async () => {
    // Flush de la cola + refetch: se incrementa versionRecarga para que las
    // pantallas vuelvan a consultar sus datos.
    await sincronizar();
    setVersionRecarga((v) => v + 1);
  }, [sincronizar]);

  const reintentarEvento = useCallback(
    async (eventoIdCliente: string) => {
      const error = eventosError.find((e) => e.eventoIdCliente === eventoIdCliente);
      if (!error) {
        return;
      }
      const insertado = await insertarEvento({
        eventoIdCliente: error.eventoIdCliente,
        tipoEvento: error.tipoEvento,
        payload: error.payload,
        creadoEn: error.creadoEn,
      });
      if (!insertado) {
        setErrorSync("No se pudo reintentar: la cola offline está llena.");
        return;
      }
      const restantes = eventosError.filter((e) => e.eventoIdCliente !== eventoIdCliente);
      setEventosError(restantes);
      await guardarErroresSync(restantes);
      await actualizarContador();
      void sincronizar().catch(() => undefined);
    },
    [actualizarContador, eventosError, sincronizar],
  );

  const descartarEvento = useCallback(
    async (eventoIdCliente: string) => {
      const restantes = eventosError.filter((e) => e.eventoIdCliente !== eventoIdCliente);
      setEventosError(restantes);
      await guardarErroresSync(restantes);
    },
    [eventosError],
  );

  useEffect(() => {
    if (isOnline) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- async flush de la cola
      void sincronizar().catch(() => undefined);
    }
  }, [isOnline, sincronizar]);

  const value = useMemo(
    () => ({
      isOnline,
      sinSubir,
      errorSync,
      ultimaSincronizacion,
      eventosError,
      versionRecarga,
      encolar,
      encolarSiNoExiste,
      sincronizar,
      sincronizarGeneral,
      reintentarEvento,
      descartarEvento,
    }),
    [
      isOnline,
      sinSubir,
      errorSync,
      ultimaSincronizacion,
      eventosError,
      versionRecarga,
      encolar,
      encolarSiNoExiste,
      sincronizar,
      sincronizarGeneral,
      reintentarEvento,
      descartarEvento,
    ],
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
