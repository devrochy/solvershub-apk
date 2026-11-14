import { apiV1 } from "@core/config";
import { idDelEquipo } from "@shared/dispositivo";
import { parseError } from "./auth-admin";
import { fetchApi } from "./http";

/** Qué dice el negocio de este equipo (`POST /access/device-session`, ADR-0174). */
export interface EstadoDelEquipo {
  estado: "activo" | "pendiente" | "bloqueado" | "none";
  permitido: boolean;
  politica: "abierto" | "restringido" | "plataforma";
  requiereVinculacion: boolean;
}

/** Backend sin la ruta (404) o sin id de equipo (web): política abierta, la app sigue. */
export const EQUIPO_ABIERTO: EstadoDelEquipo = {
  estado: "none",
  permitido: true,
  politica: "abierto",
  requiereVinculacion: false,
};

/**
 * Registra o consulta este equipo en el negocio activo. Lo usa la app al elegir negocio, al
 * reanudar y como sondeo mientras el equipo espera aprobación. El 404 de un backend viejo se
 * trata como abierto; cualquier otro fallo se propaga (el llamador decide si reintenta).
 */
export async function consultarEquipo(token: string, tenantId: string): Promise<EstadoDelEquipo> {
  const equipo = await idDelEquipo();
  if (!equipo.id) return EQUIPO_ABIERTO;
  const res = await fetchApi(apiV1("/access/device-session"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Tenant-Id": tenantId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ deviceId: equipo.id, label: equipo.label, plataforma: equipo.plataforma }),
  });
  if (res.status === 404) return EQUIPO_ABIERTO;
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as EstadoDelEquipo;
}
