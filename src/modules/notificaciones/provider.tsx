import { ReactNode, useEffect, useRef, useState } from "react";
import { darDeBajaPushToken, registrarPushToken } from "./api";
import {
  addListener,
  addRecibidaListener,
  configurarCanal,
  configurarPrimerPlano,
  consumirRespuestaInicial,
  obtenerTokenExpo,
  solicitarPermisos,
} from "./push";
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
  /** Llegó una notificación con la app abierta: el centro refresca su contador. */
  alRecibirNotificacion?(datos: PushDatos): void;
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
  alRecibirNotificacion,
  children,
}: PushProviderProps) {
  // Se guarda también el token de sesión con el que se registró: la baja al cerrar sesión ya
  // no tiene `adminToken` y necesita el suyo para autenticarse.
  const [registrado, setRegistrado] = useState<{ token: string; tenantId: string; adminToken: string } | null>(
    null,
  );
  const [pushHabilitado, setPushHabilitado] = useState<boolean | null>(null);
  const alTocarRef = useRef(alTocarNotificacion);
  const alRecibirRef = useRef(alRecibirNotificacion);

  // Opt-out local (HU-APP-21): el usuario apaga las notificaciones en Configuración.
  // Solo un "0" explícito apaga el push: si la lectura falla (base aún no lista),
  // se asume habilitado en vez de quedar en `null` y no registrar nunca.
  useEffect(() => {
    let activo = true;
    const leer = () =>
      void leerAjuste(CLAVE_PUSH_HABILITADO)
        .then((v) => v !== "0")
        .catch(() => true)
        .then((habilitado) => {
          if (activo) {
            setPushHabilitado(habilitado);
          }
        });
    leer();
    const desuscribir = suscribirAjustes(leer);
    return () => {
      activo = false;
      desuscribir();
    };
  }, []);

  useEffect(() => {
    alTocarRef.current = alTocarNotificacion;
    alRecibirRef.current = alRecibirNotificacion;
  });

  useEffect(() => {
    void configurarCanal().catch(() => undefined);
    configurarPrimerPlano();
    const sub = addRecibidaListener((datos) => alRecibirRef.current?.((datos ?? {}) as PushDatos));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const despachar = (datos: Record<string, unknown> | undefined) => {
      if (datos && Object.keys(datos).length > 0) {
        alTocarRef.current(datos as PushDatos);
      }
    };
    // Arranque en frío: el push que abrió la app llega antes que este listener.
    despachar(consumirRespuestaInicial());
    const sub = addListener(despachar);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let activo = true;
    void (async () => {
      // Primero, baja del registro anterior si cambió el contexto.
      const anterior = registrado;
      if (anterior && (!adminToken || anterior.tenantId !== tenantId)) {
        await darDeBajaPushToken(anterior.adminToken, anterior.tenantId, anterior.token).catch(
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
        console.warn("[push] permiso de notificaciones no concedido");
        return;
      }
      // Sin Firebase (google-services.json) el SDK lanza aquí en Android: se deja en
      // el log (logcat ReactNativeJS) para que un APK sin push no falle en silencio.
      const token = await obtenerTokenExpo(projectId).catch((e: unknown) => {
        console.warn("[push] no se obtuvo el token Expo", e instanceof Error ? e.message : String(e));
        return null;
      });
      if (!token || !activo) {
        return;
      }
      await registrarPushToken(adminToken, tenantId, token, "android").catch((e: unknown) => {
        console.warn("[push] no se registró el token", e instanceof Error ? e.message : String(e));
      });
      if (activo) {
        setRegistrado({ token, tenantId, adminToken });
      }
    })();
    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- registrado solo como lectura del anterior
  }, [adminToken, tenantId, projectId, pushHabilitado]);

  return <>{children}</>;
}
