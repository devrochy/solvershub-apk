import { cabeceraDeEquipo } from "@shared/dispositivo";
import { emitirAccesoDeEquipo, esCodigoDeEquipo } from "@shared/acceso-evento";

/**
 * Extrae el `code` de un 403 en cualquiera de los dos formatos del backend (ADR-0174):
 * el del core `{"error": {"code", "message"}}` y el heredado del pack `{"error", "code", "estado"}`.
 */
export function codigoDeError(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const raiz = body as { code?: unknown; error?: unknown };
  if (typeof raiz.code === "string") return raiz.code;
  if (raiz.error && typeof raiz.error === "object") {
    const code = (raiz.error as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return null;
}

/**
 * `fetch` del backend: añade `X-Device-Id` (también en el refresh) y, ante un 403 de equipo,
 * avisa a la raíz de la app. Es el único punto por el que sale una petición al backend.
 */
export async function fetchApi(url: string, init: RequestInit = {}): Promise<Response> {
  const equipo = await cabeceraDeEquipo();
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers as Record<string, string> | undefined), ...equipo },
  });
  if (res.status === 403) {
    try {
      const codigo = codigoDeError(await res.clone().json());
      if (esCodigoDeEquipo(codigo)) emitirAccesoDeEquipo(codigo);
    } catch {
      // Sin cuerpo JSON: es otro 403.
    }
  }
  return res;
}
