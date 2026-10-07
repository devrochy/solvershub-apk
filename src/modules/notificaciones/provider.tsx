import { ReactNode, useEffect, useRef, useState } from "react";
import { darDeBajaPushToken, registrarPushToken } from "./api";
import { addListener, configurarCanal, obtenerTokenExpo, solicitarPermisos } from "./push";
import { CLAVE_PUSH_HABILITADO, leerAjuste, suscribirAjustes } from "@data/ajustes";

export interface PushDatos {
  type?: string;
  tenantId?: string;
  [clave: string]: unknown;
}

export interface PushProviderProps {
  /** Sesión admin; null = sin sesión (no se registra ni se recibe nada). */
  adminToken: string | null;
  tenantId: string | null;
  projectId: string;
  /** El usuario tocó la notificación: la composición decide la navegación. */
  alTocarNotificacion(datos: PushDatos): void;
  children: ReactNode;
}

/**
 * Registro y recepción de push de la app oficial (HU-APP-05).
 *
 * - Con sesión: pide permiso, obtiene el token Expo y lo registra en el backend
 *   (POST /api/v1/me/push-token). Si cambia el negocio activo, se da de baja el
 *   registro anterior y se crea el nuevo.
 * - Sin sesión (logout): da de baja el último token registrado.
 * - Al tocar una notificación, delega el `data` al compositor (deep link).
 */
export function PushProvider({
  adminToken,
  tenantId,
  projectId,
  alTocarNotificacion,
  children,
}: PushProviderProps) {
  const [registrado, setRegistrado] = useState<{ token: string; tenantId: string } | null>(
    null,
  );
  const [pushHabilitado, setPushHabilitado] = useState<boolean | null>(null);
  const alTocarRef = useRef(alTocarNotificacion);

  // Opt-out local (HU-APP-21): el usuario apaga las notificaciones en Configuración.
  useEffect(() => {
    let activo = true;
    void leerAjuste(CLAVE_PUSH_HABILITADO)
      .then((v) => {
        if (activo) {
          setPushHabilitado(v !== "0");
        }
      })
      .catch(() => undefined);
    return suscribirAjustes(() => {
      void leerAjuste(CLAVE_PUSH_HABILITADO)
        .then((v) => {
          if (activo) {
            setPushHabilitado(v !== "0");
          }
        })
        .catch(() => undefined);
    });
  }, []);

  useEffect(() => {
    alTocarRef.current = alTocarNotificacion;
  });

  useEffect(() => {
    void configurarCanal().catch(() => undefined);
  }, []);

  useEffect(() => {
    const sub = addListener((datos) => {
      if (datos && Object.keys(datos).length > 0) {
        alTocarRef.current(datos as PushDatos);
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let activo = true;
    void (async () => {
      // Primero, baja del registro anterior si cambió el contexto.
      const anterior = registrado;
      if (anterior && (!adminToken || anterior.tenantId !== tenantId)) {
        await darDeBajaPushToken(adminToken ?? "", anterior.tenantId, anterior.token).catch(
          () => undefined,
        );
        if (activo) {
          setRegistrado(null);
        }
      }
      if (!adminToken || !tenantId || pushHabilitado === false) {
        return;
      }
      if (pushHabilitado === null) {
        return;
      }
      const permitido = await solicitarPermisos().catch(() => false);
      if (!permitido) {
        return;
      }
      const token = await obtenerTokenExpo(projectId).catch(() => null);
      if (!token || !activo) {
        return;
      }
      await registrarPushToken(adminToken, tenantId, token, "android").catch(() => undefined);
      if (activo) {
        setRegistrado({ token, tenantId });
      }
    })();
    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- registrado solo como lectura del anterior
  }, [adminToken, tenantId, projectId, pushHabilitado]);

  return <>{children}</>;
}
