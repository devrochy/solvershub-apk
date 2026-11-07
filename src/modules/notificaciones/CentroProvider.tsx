import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CentroNotificacionesContext,
  SIN_CENTRO,
  type CentroNotificaciones,
} from "@core/notificaciones/centro-context";
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
  const clave = sesion?.token && sesion.tenantId ? `${sesion.adminId}:${sesion.tenantId}` : null;
  const [publicado, setPublicado] = useState<{ clave: string; valor: CentroNotificaciones } | null>(null);
  // `children` es toda la app: siempre cuelga de la misma envoltura y en la misma posición, para
  // que iniciar o cerrar sesión no la vuelva a montar (apk#220). El estado del centro vive en un
  // hermano con clave (al cambiar de negocio arranca limpio) y publica aquí su valor.
  const valor = clave && publicado?.clave === clave ? publicado.valor : SIN_CENTRO;
  return (
    <CentroNotificacionesContext.Provider value={valor}>
      {children}
      {clave ? (
        <CentroActivo
          key={clave}
          clave={clave}
          refrescarRef={refrescarRef}
          publicar={(v) => setPublicado({ clave, valor: v })}
        />
      ) : null}
    </CentroNotificacionesContext.Provider>
  );
}

function CentroActivo({
  refrescarRef,
  publicar,
}: {
  clave: string;
  refrescarRef?: { current: (() => void) | null };
  publicar: (valor: CentroNotificaciones) => void;
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
  useEffect(() => {
    publicar(valor);
    // `publicar` cambia en cada render del padre; solo importa el valor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  return <CentroSheet visible={abierto} onClose={() => setAbierto(false)} n={n} onAbrirNotificacion={alAbrirNotificacion} />;
}
