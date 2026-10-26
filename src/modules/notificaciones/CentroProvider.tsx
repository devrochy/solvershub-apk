import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { CentroNotificacionesContext } from "@core/notificaciones/centro-context";
import { useAdminSession } from "@core/session/admin-session-context";
import { useAdminApi } from "@core/session/use-admin-api";
import { emitirNavegacion } from "@shared/navegacion-evento";
import { CentroSheet } from "./CentroSheet";
import { destinoDeNotificacion } from "./deep-link";
import type { NotificacionItem } from "./tipos";
import { useCentro } from "./use-centro";

/**
 * Monta el centro de notificaciones (ADR-0167) para la sesión de panel: el contador de la
 * campana, la hoja animada y la navegación al tocar una notificación. Sin sesión de negocio
 * no hay centro y la campana no se dibuja. `refrescarRef` lo usa el push recibido en primer
 * plano para actualizar el contador al instante.
 */
export function CentroNotificacionesProvider({
  children,
  refrescarRef,
}: {
  children: ReactNode;
  refrescarRef?: { current: (() => void) | null };
}) {
  const { sesion } = useAdminSession();
  if (!sesion?.token || !sesion.tenantId) {
    return <>{children}</>;
  }
  // La clave es el negocio: al cambiarlo el estado arranca limpio.
  return (
    <CentroActivo key={`${sesion.adminId}:${sesion.tenantId}`} refrescarRef={refrescarRef}>
      {children}
    </CentroActivo>
  );
}

function CentroActivo({
  children,
  refrescarRef,
}: {
  children: ReactNode;
  refrescarRef?: { current: (() => void) | null };
}) {
  const api = useAdminApi();
  const [abierto, setAbierto] = useState(false);
  const n = useCentro(api, abierto);
  const refrescar = n.refrescarContador;
  const recargar = n.recargar;

  // El push recibido en primer plano llama a esta función desde fuera del árbol.
  useEffect(() => {
    if (!refrescarRef) return;
    refrescarRef.current = () => {
      void refrescar();
      if (abierto) void recargar(true);
    };
    return () => {
      refrescarRef.current = null;
    };
  }, [refrescarRef, refrescar, recargar, abierto]);

  const abrir = useCallback(() => setAbierto(true), []);
  const alAbrirNotificacion = useCallback(
    (item: NotificacionItem) => {
      void n.marcarLeida(item.id);
      setAbierto(false);
      const destino = destinoDeNotificacion(item.target);
      if (destino) emitirNavegacion(destino);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `marcarLeida` es estable por `api`
    [n.marcarLeida],
  );

  const valor = useMemo(() => ({ disponible: true, noLeidas: n.noLeidas, abrir }), [n.noLeidas, abrir]);

  return (
    <CentroNotificacionesContext.Provider value={valor}>
      {children}
      <CentroSheet visible={abierto} onClose={() => setAbierto(false)} n={n} onAbrirNotificacion={alAbrirNotificacion} />
    </CentroNotificacionesContext.Provider>
  );
}
