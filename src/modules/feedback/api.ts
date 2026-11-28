import { AdminApiError, errorDeRespuesta, type ClienteAdmin } from "@core/api/admin";
import { fetchApi } from "@core/api/http";
import { construirMultipart, type ArchivoMultipart } from "@core/api/multipart";
import type { components } from "@core/api/schema";
import { apiV1 } from "@core/config";
import type { AdminSesion } from "@core/session/types";

/**
 * Reportes de clientes (SPEC-54, HU-FB-07): la misma API `/api/v1/feedback` que usa el panel.
 * El envío es multipart con `Idempotency-Key` (la APK reintenta en redes móviles); el resto va
 * por el cliente admin.
 */
export type FeedbackCatalogo = components["schemas"]["FeedbackCatalogo"];
export type FeedbackReporte = components["schemas"]["FeedbackReporte"];
export type FeedbackResumen = components["schemas"]["FeedbackReporteResumen"];
export type FeedbackPagina = components["schemas"]["FeedbackPagina"];
export type FeedbackAdjunto = components["schemas"]["FeedbackAdjunto"];
export type TipoReporte = FeedbackReporte["tipo"];
export type EstadoReporte = FeedbackReporte["estado"];
export type AlcanceReportes = "mios" | "negocio";

export interface DatosDelReporte {
  tipo: TipoReporte;
  area: string;
  titulo: string;
  descripcion: string;
}

export type ImagenAdjunta = Pick<ArchivoMultipart, "uri" | "name" | "type">;

export interface EnvioRespondido {
  reporte: FeedbackReporte;
  /** 200: la clave ya se había usado y el backend devolvió el reporte original. */
  replay: boolean;
}

/** Catálogo del formulario. `null` = reportes apagados en este entorno (404): no se muestra la entrada. */
export async function leerCatalogo(api: ClienteAdmin): Promise<FeedbackCatalogo | null> {
  try {
    return await api.get<FeedbackCatalogo>("/feedback/catalogo");
  } catch (e) {
    if (e instanceof AdminApiError && e.status === 404) return null;
    throw e;
  }
}

export function listarReportes(
  api: ClienteAdmin,
  filtro: { alcance: AlcanceReportes; estado?: EstadoReporte | null; cursor?: string | null },
): Promise<FeedbackPagina> {
  return api.get<FeedbackPagina>("/feedback/reports", {
    alcance: filtro.alcance,
    estado: filtro.estado ?? undefined,
    cursor: filtro.cursor ?? undefined,
  });
}

export function leerReporte(api: ClienteAdmin, id: string): Promise<FeedbackReporte> {
  return api.get<FeedbackReporte>(`/feedback/reports/${encodeURIComponent(id)}`);
}

/** Error del envío con el `Retry-After` (segundos) de un 429 o 503. */
export class EnvioError extends AdminApiError {
  constructor(
    base: AdminApiError,
    public readonly reintentarEnSeg: number | null,
  ) {
    super(base.status, base.code, base.message, base.fields, base.details);
    this.name = "EnvioError";
  }
}

function segundosDe(valor: string | null): number | null {
  if (!valor) return null;
  const n = Number(valor);
  return Number.isFinite(n) && n >= 0 ? Math.ceil(n) : null;
}

/**
 * `POST /feedback/reports`. Si la red se cae, el error sale tal cual (TypeError de fetch) y el
 * llamador reintenta con la MISMA clave; 201 y 200 (replay) son ambos un envío exitoso.
 */
export async function enviarReporte(
  sesion: AdminSesion,
  datos: DatosDelReporte,
  imagenes: ImagenAdjunta[],
  idempotencyKey: string,
): Promise<EnvioRespondido> {
  const { body, boundary } = await construirMultipart(
    { tipo: datos.tipo, area: datos.area, titulo: datos.titulo, descripcion: datos.descripcion },
    imagenes.map((imagen) => ({ campo: "adjuntos", ...imagen })),
  );
  const headers: Record<string, string> = {
    Authorization: `Bearer ${sesion.token}`,
    "Content-Type": `multipart/form-data; boundary=${boundary}`,
    "Idempotency-Key": idempotencyKey,
  };
  if (sesion.tenantId) headers["X-Tenant-Id"] = sesion.tenantId;
  const res = await fetchApi(apiV1("/feedback/reports"), {
    method: "POST",
    headers,
    body: body as unknown as BodyInit,
  });
  if (!res.ok) {
    throw new EnvioError(await errorDeRespuesta(res), segundosDe(res.headers.get("retry-after")));
  }
  return { reporte: (await res.json()) as FeedbackReporte, replay: res.status === 200 };
}
