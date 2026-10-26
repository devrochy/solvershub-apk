import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import type { ClienteAdmin } from "@core/api/admin";
import {
  archivarNotificacion,
  contarNoLeidas,
  guardarPushApagado,
  leerPreferencias,
  listarNotificaciones,
  marcarLeidas,
  marcarTodasLeidas,
  silenciarPush,
} from "./feed-api";
import type { NotificacionItem, NotificacionPreferencias } from "./tipos";

/** Contador y lista abierta: cada 20 s con la app en primer plano (ADR-0167). */
export const INTERVALO_NOTIFICACIONES_MS = 20_000;

export type Pestana = "todas" | "no_leidas";

function unir(actuales: NotificacionItem[], nuevas: NotificacionItem[]): NotificacionItem[] {
  const porId = new Map(actuales.map((n) => [n.id, n]));
  for (const n of nuevas) porId.set(n.id, n);
  return [...porId.values()].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
}

/**
 * Estado del centro de notificaciones de la app: contador (siempre), lista (solo con la hoja
 * abierta), acciones con rollback y preferencias. Se monta por sesión y negocio.
 */
export function useCentro(api: ClienteAdmin, abierto: boolean) {
  const [noLeidas, setNoLeidas] = useState(0);
  const [items, setItems] = useState<NotificacionItem[]>([]);
  const [siguiente, setSiguiente] = useState<string | null>(null);
  const [cargadoPara, setCargadoPara] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);
  const [pestana, setPestana] = useState<Pestana>("todas");
  const [categoria, setCategoria] = useState<string | null>(null);
  const [conocidas, setConocidas] = useState<ReadonlySet<string>>(new Set());
  const [preferencias, setPreferencias] = useState<NotificacionPreferencias | null>(null);
  const [ahora, setAhora] = useState(() => new Date());
  const itemsRef = useRef(items);
  const filtroRef = useRef({ pestana, categoria });
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    filtroRef.current = { pestana, categoria };
  }, [pestana, categoria]);

  const claveFiltro = `${pestana}|${categoria ?? ""}`;
  const cargando = abierto && cargadoPara !== claveFiltro;

  const refrescarContador = useCallback(async () => {
    try {
      setNoLeidas(await contarNoLeidas(api));
    } catch {
      // Sin red o sin permiso: se conserva el último número.
    }
  }, [api]);

  const recargar = useCallback(
    async (unirConActuales = false) => {
      const { pestana: p, categoria: c } = filtroRef.current;
      try {
        const pagina = await listarNotificaciones(api, { soloNoLeidas: p === "no_leidas", categoria: c });
        setFallo(false);
        setAhora(new Date());
        setNoLeidas(pagina.unread_count);
        setItems((actuales) => (unirConActuales ? unir(actuales, pagina.items) : pagina.items));
        if (!unirConActuales) {
          setSiguiente(pagina.next_cursor);
          setConocidas(new Set(pagina.items.map((i) => i.id)));
        }
      } catch {
        setFallo(true);
      }
    },
    [api],
  );

  // Contador: al montar, cada 20 s con la app activa y al volver a primer plano.
  useEffect(() => {
    const inicial = setTimeout(() => void refrescarContador(), 0);
    const id = setInterval(() => {
      if (AppState.currentState === "active") void refrescarContador();
    }, INTERVALO_NOTIFICACIONES_MS);
    const sub = AppState.addEventListener("change", (estado) => {
      if (estado === "active") void refrescarContador();
    });
    return () => {
      clearTimeout(inicial);
      clearInterval(id);
      sub.remove();
    };
  }, [refrescarContador]);

  // Abierta: carga al abrir y al cambiar de filtro; refresca sin perder lo cargado.
  useEffect(() => {
    if (!abierto) return;
    let vigente = true;
    const inicial = setTimeout(() => {
      void recargar().finally(() => {
        if (vigente) setCargadoPara(claveFiltro);
      });
    }, 0);
    const id = setInterval(() => {
      if (AppState.currentState === "active") void recargar(true);
    }, INTERVALO_NOTIFICACIONES_MS);
    return () => {
      vigente = false;
      clearTimeout(inicial);
      clearInterval(id);
    };
  }, [abierto, claveFiltro, recargar]);

  const cargarMas = useCallback(async () => {
    if (!siguiente) return;
    try {
      const { pestana: p, categoria: c } = filtroRef.current;
      const pagina = await listarNotificaciones(api, { soloNoLeidas: p === "no_leidas", categoria: c, cursor: siguiente });
      setItems((actuales) => unir(actuales, pagina.items));
      setSiguiente(pagina.next_cursor);
      setNoLeidas(pagina.unread_count);
    } catch {
      // se puede reintentar con el mismo botón
    }
  }, [api, siguiente]);

  const marcarLeida = useCallback(
    async (id: string) => {
      if (itemsRef.current.find((n) => n.id === id)?.read !== false) return;
      setItems((actuales) => actuales.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setNoLeidas((n) => Math.max(0, n - 1));
      try {
        setNoLeidas(await marcarLeidas(api, [id]));
      } catch {
        setItems((actuales) => actuales.map((n) => (n.id === id ? { ...n, read: false } : n)));
        setNoLeidas((n) => n + 1);
      }
    },
    [api],
  );

  const marcarTodas = useCallback(async () => {
    const antes = { items: itemsRef.current };
    setItems((actuales) => actuales.map((n) => ({ ...n, read: true })));
    setNoLeidas(0);
    try {
      setNoLeidas(await marcarTodasLeidas(api));
      void recargar();
    } catch {
      setItems(antes.items);
      void refrescarContador();
    }
  }, [api, recargar, refrescarContador]);

  const archivar = useCallback(
    async (id: string) => {
      const previas = itemsRef.current;
      const eraNoLeida = previas.find((n) => n.id === id)?.read === false;
      setItems((actuales) => actuales.filter((n) => n.id !== id));
      if (eraNoLeida) setNoLeidas((n) => Math.max(0, n - 1));
      try {
        await archivarNotificacion(api, id);
      } catch {
        setItems(previas);
        if (eraNoLeida) setNoLeidas((n) => n + 1);
      }
    },
    [api],
  );

  const cargarPreferencias = useCallback(async () => {
    try {
      setPreferencias(await leerPreferencias(api));
    } catch {
      // se queda sin cargar: los interruptores quedan deshabilitados
    }
  }, [api]);

  const apagarPush = useCallback(
    async (apagadas: string[]) => {
      const previas = preferencias;
      setPreferencias((p) => (p ? { ...p, push_off_categories: apagadas } : p));
      try {
        setPreferencias(await guardarPushApagado(api, apagadas));
      } catch {
        setPreferencias(previas);
      }
    },
    [api, preferencias],
  );

  const silenciar = useCallback(
    async (minutos: number) => {
      try {
        setPreferencias(await silenciarPush(api, minutos));
      } catch {
        // sin cambio visible: el usuario puede reintentar
      }
    },
    [api],
  );

  return {
    noLeidas,
    items,
    siguiente,
    cargando,
    fallo,
    conocidas,
    ahora,
    pestana,
    setPestana,
    categoria,
    setCategoria,
    preferencias,
    cargarPreferencias,
    cargarMas,
    recargar,
    refrescarContador,
    marcarLeida,
    marcarTodas,
    archivar,
    apagarPush,
    silenciar,
  };
}

export type EstadoCentro = ReturnType<typeof useCentro>;
