import { useEffect, useState } from "react";
import { crearClienteAdmin } from "@core/api/admin";
import { useAdminSession } from "@core/session/admin-session-context";
import type { AdminSesion } from "@core/session/types";
import { leerCatalogo, type FeedbackCatalogo } from "./api";

export type EstadoCatalogo =
  | { estado: "cargando" }
  | { estado: "listo"; catalogo: FeedbackCatalogo }
  /** 404: reportes apagados (`FEEDBACK_ENABLED`); la entrada del menú no se muestra. */
  | { estado: "apagado" }
  | { estado: "error" };

/** Un pedido por negocio y sesión: el cajón y las pantallas comparten la misma respuesta. */
const cache = new Map<string, Promise<FeedbackCatalogo | null>>();

function claveDe(sesion: AdminSesion): string {
  return `${sesion.adminId}:${sesion.tenantId ?? ""}`;
}

export function pedirCatalogo(sesion: AdminSesion): Promise<FeedbackCatalogo | null> {
  const clave = claveDe(sesion);
  let pedido = cache.get(clave);
  if (!pedido) {
    pedido = leerCatalogo(crearClienteAdmin(sesion));
    // Un fallo de red no se queda en caché: el próximo montaje vuelve a pedir.
    pedido.catch(() => cache.delete(clave));
    cache.set(clave, pedido);
  }
  return pedido;
}

/** Solo para tests. */
export function olvidarCatalogos(): void {
  cache.clear();
}

export function useCatalogoFeedback(): EstadoCatalogo {
  const { sesion } = useAdminSession();
  const [estado, setEstado] = useState<EstadoCatalogo>({ estado: "cargando" });
  useEffect(() => {
    if (!sesion?.tenantId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sin negocio activo no hay reportes
      setEstado({ estado: "apagado" });
      return;
    }
    let vivo = true;
    setEstado({ estado: "cargando" });
    pedirCatalogo(sesion)
      .then((catalogo) => {
        if (vivo) setEstado(catalogo ? { estado: "listo", catalogo } : { estado: "apagado" });
      })
      .catch(() => {
        if (vivo) setEstado({ estado: "error" });
      });
    return () => {
      vivo = false;
    };
    // La sesión cambia de objeto al refrescar el perfil; solo importa quién y en qué negocio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion?.adminId, sesion?.tenantId]);
  return estado;
}

/** Etiqueta de un área del catálogo (o la clave si el catálogo no la trae). */
export function etiquetaDeArea(catalogo: FeedbackCatalogo | null, area: string): string {
  return catalogo?.areas.find((a) => a.clave === area)?.etiqueta ?? area;
}

/** ¿Ve el filtro «Del negocio»? Owner o master; el tester solo cuenta en test y, si no, el 403 cae a «Míos». */
export function puedeVerDelNegocio(sesion: Pick<AdminSesion, "role" | "tenantRole"> | null): boolean {
  if (!sesion) return false;
  return sesion.role === "master" || sesion.tenantRole === "owner";
}
