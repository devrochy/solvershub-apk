import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { ReactNode } from "react";
import { crearClienteAdmin } from "@core/api/admin";
import { useAdminSession } from "@core/session/admin-session-context";
import { inicializarBase } from "./bootstrap";
import { sincronizarTodo } from "./sync-global";

/**
 * Sincronizador global (ADR-0097, HU-APP-15): al haber sesión admin y
 * conexión, recorre todas las entidades offline-first y despacha las
 * escrituras pendientes. Se dispara al montar y cada vez que la red vuelve.
 * Un fallo nunca rompe la app (se registra y se reintenta en el próximo
 * evento de red).
 */
export function SincronizadorProvider({ children }: { children: ReactNode }) {
  const { sesion } = useAdminSession();
  const cliente = useMemo(() => crearClienteAdmin(sesion), [sesion]);
  const [online, setOnline] = useState(true);
  const ejecutando = useRef(false);

  const sincronizar = useCallback(async () => {
    if (ejecutando.current || !sesion) {
      return;
    }
    try {
      const estado = await NetInfo.fetch();
      if (estado.isConnected === false) {
        return;
      }
      const db = await inicializarBase();
      if (!db) {
        return;
      }
      ejecutando.current = true;
      try {
        await sincronizarTodo(db, cliente);
      } finally {
        ejecutando.current = false;
      }
    } catch {
      // sin conexión o error de apertura: se reintenta en el próximo evento
    }
  }, [sesion, cliente]);

  useEffect(() => {
    const sub = NetInfo.addEventListener((estado) => {
      setOnline(estado.isConnected !== false);
    });
    return () => sub();
  }, []);

  useEffect(() => {
    if (online) {
      void sincronizar();
    }
  }, [online, sincronizar]);

  return <>{children}</>;
}
