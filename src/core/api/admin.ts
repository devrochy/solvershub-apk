import { apiV1 } from "@core/config";
import type { AdminSesion } from "@core/session/types";

/**
 * Cliente HTTP autenticado de la API admin `/api/v1` (ADR-0076/0077): agrega
 * `Bearer` + `X-Tenant-Id` de la sesión y normaliza los errores
 * `{"error": {"code","message"}}`. Todos los módulos del panel lo usan.
 */
export class AdminApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    /** Errores por campo (`{campo: mensaje}`) de un 422, para marcarlos junto a cada control. */
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

export interface ClienteAdmin {
  get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  put<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  del<T>(path: string, body?: unknown): Promise<T>;
}

function conQuery(path: string, params?: Record<string, string | number | undefined>): string {
  if (!params) {
    return path;
  }
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return query ? `${path}?${query}` : path;
}

async function pedir<T>(
  sesion: AdminSesion | null,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  if (!sesion) {
    throw new AdminApiError(401, "sin_sesion", "Sesión requerida.");
  }
  const headers: Record<string, string> = { Authorization: `Bearer ${sesion.token}` };
  if (sesion.tenantId) {
    headers["X-Tenant-Id"] = sesion.tenantId;
  }
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(apiV1(path), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let code = String(res.status);
    let message = "Ocurrió un error. Intenta de nuevo.";
    let fields: Record<string, string> | undefined;
    try {
      const data = (await res.json()) as {
        error?: { code?: string; message?: string; fields?: Record<string, unknown> };
      };
      code = data.error?.code ?? code;
      message = data.error?.message ?? message;
      const campos = Object.entries(data.error?.fields ?? {}).filter(
        (par): par is [string, string] => typeof par[1] === "string",
      );
      if (campos.length > 0) fields = Object.fromEntries(campos);
    } catch {
      // sin cuerpo JSON
    }
    throw new AdminApiError(res.status, code, message, fields);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export function crearClienteAdmin(sesion: AdminSesion | null): ClienteAdmin {
  return {
    get: (path, params) => pedir(sesion, "GET", conQuery(path, params)),
    post: (path, body) => pedir(sesion, "POST", path, body),
    put: (path, body) => pedir(sesion, "PUT", path, body),
    patch: (path, body) => pedir(sesion, "PATCH", path, body),
    del: (path, body) => pedir(sesion, "DELETE", path, body),
  };
}
