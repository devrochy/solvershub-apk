import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import type { ClienteAdmin } from "@core/api/admin";
import {
  detalleConversacion,
  listarConversaciones,
  mensajesDesde,
  type ConversationDetail,
  type ConversationSummary,
  type FiltroConversaciones,
  type MessageItem,
} from "./api";
import { ordenarPorLlegada } from "./presentacion";

/** Bandeja en vivo (como el panel): solo con la pantalla enfocada y la app en primer plano. */
export const INTERVALO_HILO_MS = 4_000;
export const INTERVALO_LISTA_MS = 12_000;
export const INTERVALO_DETALLE_MS = 15_000;

/**
 * Llama a `tarea` cada `intervaloMs` sin solapar peticiones. Se pausa con la app en
 * segundo plano y consulta enseguida al volver. Al desmontar, deja de consultar.
 */
export function usePolling(tarea: () => Promise<void>, intervaloMs: number, activo = true) {
  const tareaRef = useRef(tarea);
  useEffect(() => {
    tareaRef.current = tarea;
  }, [tarea]);

  useEffect(() => {
    if (!activo) return;
    let montado = true;
    let enVuelo = false;

    async function tick() {
      if (!montado || enVuelo || AppState.currentState !== "active") return;
      enVuelo = true;
      try {
        await tareaRef.current();
      } catch {
        // Un fallo de red no corta el polling: el siguiente tick lo intenta de nuevo.
      } finally {
        enVuelo = false;
      }
    }

    const id = setInterval(() => void tick(), intervaloMs);
    const suscripcion = AppState.addEventListener("change", (estado) => {
      if (estado === "active") void tick();
    });
    return () => {
      montado = false;
      clearInterval(id);
      suscripcion.remove();
    };
  }, [intervaloMs, activo]);
}

/** Une mensajes por `id` (el servidor re-entrega el solape del cursor) y los ordena. */
export function unirMensajes(actuales: MessageItem[], nuevos: MessageItem[]): MessageItem[] {
  if (nuevos.length === 0) return actuales;
  const porId = new Map(actuales.map((m) => [m.id, m]));
  for (const m of nuevos) porId.set(m.id, m);
  return [...porId.values()].sort(
    (a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
  );
}

/** Cursor para `?after=`: el `created_at` del último mensaje tal como lo mandó la API. */
export function cursorDe(mensajes: MessageItem[]): string | null {
  return mensajes.length ? mensajes[mensajes.length - 1].created_at : null;
}

function coincideConFiltros(chat: ConversationSummary, filtros: FiltroConversaciones): boolean {
  if (filtros.status && chat.status !== filtros.status) return false;
  if (filtros.connection_id && chat.connection_id !== filtros.connection_id) return false;
  if (filtros.q) {
    const texto = filtros.q.trim().toLocaleLowerCase("es");
    const nombre = (chat.customer_name ?? "").toLocaleLowerCase("es");
    const externo = (chat.external_id ?? "").toLocaleLowerCase("es");
    if (!nombre.includes(texto) && !externo.includes(texto)) return false;
  }
  return true;
}

/** Une la primera página nueva con las páginas ya cargadas y respeta los filtros activos. */
export function unirConversaciones(
  actuales: ConversationSummary[],
  nuevas: ConversationSummary[],
  filtros: FiltroConversaciones,
): ConversationSummary[] {
  const porId = new Map(actuales.map((c) => [c.id, c]));
  for (const chat of nuevas) porId.set(chat.id, chat);
  return ordenarPorLlegada([...porId.values()].filter((chat) => coincideConFiltros(chat, filtros)));
}

function claveDeFiltros(filtros: FiltroConversaciones): string {
  return `${filtros.q?.trim() ?? ""}|${filtros.status ?? ""}|${filtros.connection_id ?? ""}`;
}

type ModoCarga = "inicial" | "refresco" | "silencioso" | "mas";

/** Lista de chats con primera página en vivo, refresco manual e infinite scroll. */
export function useConversacionesEnVivo(
  api: ClienteAdmin,
  filtros: FiltroConversaciones,
  activo = true,
) {
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [pagina, setPagina] = useState(1);
  const [hayMas, setHayMas] = useState(false);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const montado = useRef(true);
  const filtrosRef = useRef(filtros);
  const paginaRef = useRef(1);
  const hayMasRef = useRef(false);
  const cargandoMasRef = useRef(false);
  const activoPrevio = useRef(activo);

  useEffect(() => {
    filtrosRef.current = filtros;
  }, [filtros]);
  useEffect(() => {
    paginaRef.current = pagina;
  }, [pagina]);
  useEffect(() => {
    hayMasRef.current = hayMas;
  }, [hayMas]);
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const cargarPagina = useCallback(
    async (paginaPedida: number, modo: ModoCarga) => {
      if (modo === "mas") {
        if (cargandoMasRef.current || !hayMasRef.current) return;
        cargandoMasRef.current = true;
        setCargandoMas(true);
      } else if (modo === "inicial") {
        setCargando(true);
      } else if (modo === "refresco") {
        setRefrescando(true);
      }

      const claveAlPedir = claveDeFiltros(filtrosRef.current);
      try {
        const paginaNueva = await listarConversaciones(api, {
          ...filtrosRef.current,
          page: paginaPedida,
        });
        if (!montado.current || claveAlPedir !== claveDeFiltros(filtrosRef.current)) return;
        setError(null);
        setTotal(paginaNueva.total);

        if (paginaPedida === 1) {
          setItems((actuales) =>
            modo === "silencioso" && paginaRef.current > 1
              ? unirConversaciones(actuales, paginaNueva.items, filtrosRef.current)
              : ordenarPorLlegada(paginaNueva.items),
          );
          setPagina(1);
          paginaRef.current = 1;
        } else {
          setItems((actuales) => unirConversaciones(actuales, paginaNueva.items, filtrosRef.current));
          setPagina(paginaNueva.page);
          paginaRef.current = paginaNueva.page;
        }
        setHayMas(paginaNueva.has_more);
        hayMasRef.current = paginaNueva.has_more;
      } catch {
        if (montado.current && claveAlPedir === claveDeFiltros(filtrosRef.current)) {
          setError("No pudimos cargar las conversaciones. Revisa tu conexión.");
        }
      } finally {
        const vigente = montado.current && claveAlPedir === claveDeFiltros(filtrosRef.current);
        if (modo === "mas") {
          cargandoMasRef.current = false;
          if (montado.current) setCargandoMas(false);
        } else if (modo === "inicial") {
          if (vigente) setCargando(false);
        } else if (modo === "refresco") {
          if (montado.current) setRefrescando(false);
        }
      }
    },
    [api],
  );

  const clave = claveDeFiltros(filtros);

  useEffect(() => {
    paginaRef.current = 1;
    hayMasRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial al cambiar los filtros
    void cargarPagina(1, "inicial");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, api]);

  usePolling(() => cargarPagina(1, "silencioso"), INTERVALO_LISTA_MS, activo && !cargando);

  useEffect(() => {
    if (activo && !activoPrevio.current) {
      void cargarPagina(1, "silencioso");
    }
    activoPrevio.current = activo;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, api]);

  const recargar = useCallback(() => cargarPagina(1, "refresco"), [cargarPagina]);
  const cargarMas = useCallback(() => cargarPagina(paginaRef.current + 1, "mas"), [cargarPagina]);

  return {
    items,
    pagina,
    hayMas,
    total,
    cargando,
    cargandoMas,
    refrescando,
    error,
    recargar,
    cargarMas,
  };
}

/** Detalle del chat que se actualiza solo: mensajes cada 4 s y metadatos cada 15 s. */
export function useDetalleEnVivo(
  api: ClienteAdmin,
  id: string,
  inicial: ConversationDetail,
  activo = true,
) {
  const [detalle, setDetalle] = useState(inicial);
  const detalleRef = useRef(inicial);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  useEffect(() => {
    detalleRef.current = detalle;
  }, [detalle]);

  const recargar = useCallback(async () => {
    const nuevo = await detalleConversacion(api, id);
    if (!montado.current) return;
    const unido: ConversationDetail = {
      ...nuevo,
      messages: unirMensajes(detalleRef.current.messages, nuevo.messages),
    };
    detalleRef.current = unido;
    setDetalle(unido);
  }, [api, id]);

  const consultarMensajes = useCallback(async () => {
    const cursor = cursorDe(detalleRef.current.messages);
    const pagina = await mensajesDesde(api, id, cursor);
    if (!montado.current) return;
    const unido: ConversationDetail = {
      ...detalleRef.current,
      messages: unirMensajes(detalleRef.current.messages, pagina.items),
    };
    detalleRef.current = unido;
    setDetalle(unido);
  }, [api, id]);

  usePolling(consultarMensajes, INTERVALO_HILO_MS, activo);
  usePolling(recargar, INTERVALO_DETALLE_MS, activo);

  return { detalle, recargar };
}
