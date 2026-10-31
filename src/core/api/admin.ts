import { apiV1 } from "@core/config";
import type { AdminSesion } from "@core/session/types";
import { fetchApi } from "./http";

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

export type ParametroApi = string | number | boolean | (string | number)[] | null | undefined;

export interface TextoDescargado {
  texto: string;
  nombreArchivo?: string;
}

export interface ClienteAdmin {
  get<T>(path: string, params?: Record<string, ParametroApi>): Promise<T>;
  /** Respuesta de texto plano (CSV) con el nombre sugerido por el servidor. */
  getTexto?(path: string, params?: Record<string, ParametroApi>): Promise<TextoDescargado>;
  post<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T>;
  put<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  del<T>(path: string, body?: unknown): Promise<T>;
}

function conQuery(path: string, params?: Record<string, ParametroApi>): string {
  if (!params) {
    return path;
  }
  const pares = Object.entries(params).flatMap(([k, v]) => {
    if (v === undefined || v === null) return [];
    const valores = Array.isArray(v) ? v : [v];
    return valores.map((valor) => `${encodeURIComponent(k)}=${encodeURIComponent(String(valor))}`);
  });
  return pares.length > 0 ? `${path}?${pares.join("&")}` : path;
}

function cabecerasDe(sesion: AdminSesion | null, extra?: Record<string, string>, conCuerpo = false): Record<string, string> {
  if (!sesion) {
    throw new AdminApiError(401, "sin_sesion", "Sesión requerida.");
  }
  const headers: Record<string, string> = { Authorization: `Bearer ${sesion.token}`, ...extra };
  if (sesion.tenantId) {
    headers["X-Tenant-Id"] = sesion.tenantId;
  }
  if (conCuerpo) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

function nombreDesdeCabecera(res: Response): string | undefined {
  const disposicion = res.headers.get("content-disposition") ?? "";
  const coincidencia = /filename="?([^";]+)"?/i.exec(disposicion);
  return coincidencia?.[1];
}

async function pedirTexto(
  sesion: AdminSesion | null,
  path: string,
): Promise<TextoDescargado> {
  const res = await fetchApi(apiV1(path), { method: "GET", headers: cabecerasDe(sesion) });
  if (!res.ok) {
    throw await errorDeRespuesta(res);
  }
  return { texto: await res.text(), nombreArchivo: nombreDesdeCabecera(res) };
}

async function errorDeRespuesta(res: Response): Promise<AdminApiError> {
  let code = String(res.status);
  let message = "Ocurrió un error. Intenta de nuevo.";
  let fields: Record<string, string> | undefined;
  try {
    const data = (await res.json()) as {
      error?: string | { code?: string; message?: string; fields?: Record<string, unknown> };
      code?: string;
    };
    // Dos formatos (ADR-0174): del core `{error: {code, message}}` y del pack `{error: "texto", code}`.
    const anidado = typeof data.error === "object" ? data.error : undefined;
    code = anidado?.code ?? data.code ?? code;
    message = anidado?.message ?? (typeof data.error === "string" ? data.error : undefined) ?? message;
    const campos = Object.entries(anidado?.fields ?? {}).filter(
      (par): par is [string, string] => typeof par[1] === "string",
    );
    if (campos.length > 0) fields = Object.fromEntries(campos);
  } catch {
    // sin cuerpo JSON
  }
  return new AdminApiError(res.status, code, message, fields);
}

async function pedir<T>(
  sesion: AdminSesion | null,
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const headers = cabecerasDe(sesion, extraHeaders, body !== undefined);
  const res = await fetchApi(apiV1(path), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw await errorDeRespuesta(res);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export function crearClienteAdmin(sesion: AdminSesion | null): ClienteAdmin {
  return {
    get: (path, params) => pedir(sesion, "GET", conQuery(path, params)),
    getTexto: (path, params) => pedirTexto(sesion, conQuery(path, params)),
    post: (path, body, headers) => pedir(sesion, "POST", path, body, headers),
    put: (path, body) => pedir(sesion, "PUT", path, body),
    patch: (path, body) => pedir(sesion, "PATCH", path, body),
    del: (path, body) => pedir(sesion, "DELETE", path, body),
  };
}
