import type { ClienteAdmin } from "@core/api/admin";
import { parseError } from "@core/api/auth-admin";
import { construirMultipart } from "@core/api/multipart";
import type { ArchivoAvatar } from "@core/api/perfil-admin";
import type { components } from "@core/api/schema";
import { apiV1 } from "@core/config";
import type { AdminSesion } from "@core/session/types";
import { fetchApi } from "@core/api/http";

export type ConversationSummary = components["schemas"]["ConversationSummary"];
export type ConversationDetail = components["schemas"]["ConversationDetail"];
export type ConversationConnection = components["schemas"]["ConversationConnection"];
export type MessageItem = components["schemas"]["MessageItem"];
export type MessagesSince = components["schemas"]["MessagesSince"];
export type ConversationNote = components["schemas"]["ConversationNote"];
export type ApprovedTemplate = components["schemas"]["ApprovedTemplate"];
export type ActiveEscalation = components["schemas"]["ActiveEscalation"];
export type EscalationItem = components["schemas"]["EscalationItem"];

export type LeadPerfil = components["schemas"]["LeadPerfilOut"];
export type LeadAgentOut = components["schemas"]["LeadAgentOut"];
export type LeadAgentData = components["schemas"]["LeadAgentData"];
export type LeadCampoPerfil = components["schemas"]["LeadCampoPerfil"];
export type LeadFilter = components["schemas"]["LeadFilter"];
export type LeadFact = components["schemas"]["LeadFact"];
export type LeadGeocodificacion = components["schemas"]["LeadGeocodificacion"];
export type LeadGeocodificacionInversa = components["schemas"]["LeadGeocodificacionInversa"];
export type Consentimiento = components["schemas"]["ConsentimientoOut"];
export type ConsentimientoIn = components["schemas"]["ConsentimientoIn"];
export type ConexionDeEnvio = components["schemas"]["ConexionDeEnvioOut"];
export type PlantillaDeEnvio = components["schemas"]["PlantillaDeEnvio"];
export type VistaPreviaEnvio = components["schemas"]["VistaPreviaOut"];
export type EnvioSegmento = components["schemas"]["EnvioOut"];
export type VariableDeEnvio = components["schemas"]["VariableIn"];
export type TextoDescargado = { texto: string; nombreArchivo?: string };

/**
 * Fila de Clientes. `perfil`, `agentes` y `bot_paused` llegan desde HU-UX-16 y la tanda 1A;
 * los dejamos opcionales para que la app siga funcionando contra un backend anterior.
 */
export type LeadRow = Omit<
  components["schemas"]["LeadRow"],
  "perfil" | "agentes" | "bot_paused"
> & {
  perfil?: LeadPerfil | null;
  agentes?: string[];
  bot_paused?: boolean;
  telefono?: string | null;
};

/** Campo de un pack editable desde la ficha (ADR-0149). */
export type CampoEditable = components["schemas"]["LeadEditable"];

/** Ficha del cliente (`GET /admin/leads/{id}`). */
export type FichaDelCliente = Omit<
  components["schemas"]["LeadDetail"],
  "perfil" | "agentes" | "campos_perfil" | "editables"
> & {
  perfil?: LeadPerfil | null;
  agentes?: LeadAgentData[];
  campos_perfil?: LeadCampoPerfil[];
  editables?: CampoEditable[];
};

/** Compatibilidad con el nombre anterior de los datos de la ficha. */
export type DatoDelCliente = LeadFact;

export interface PaginaConversaciones {
  items: ConversationSummary[];
  page: number;
  total: number;
  has_more: boolean;
}

export interface PaginaEscalaciones {
  items: EscalationItem[];
  page: number;
  total: number;
  has_more: boolean;
}

export interface PaginaLeads {
  items: LeadRow[];
  page: number;
  total: number;
  has_more: boolean;
  page_size?: number;
  agents?: LeadAgentOut[];
  filters?: LeadFilter[];
  columns?: { key: string; label: string }[];
}

export interface FiltroConversaciones {
  q?: string;
  status?: string;
  connection_id?: string;
  page?: number;
}

export async function listarConversaciones(
  api: ClienteAdmin,
  filtro: FiltroConversaciones = {},
): Promise<PaginaConversaciones> {
  return api.get<PaginaConversaciones>("/admin/conversations", {
    q: filtro.q,
    status: filtro.status,
    connection_id: filtro.connection_id,
    page: filtro.page,
    page_size: 20,
  });
}

export async function listarConexiones(api: ClienteAdmin): Promise<ConversationConnection[]> {
  return api.get<ConversationConnection[]>("/admin/conversations/connections");
}

export async function detalleConversacion(
  api: ClienteAdmin,
  id: string,
): Promise<ConversationDetail> {
  return api.get<ConversationDetail>(`/admin/conversations/${id}`);
}

export async function mensajesDesde(
  api: ClienteAdmin,
  id: string,
  after?: string | null,
): Promise<MessagesSince> {
  return api.get<MessagesSince>(`/admin/conversations/${id}/messages`, {
    after: after ?? undefined,
  });
}

export async function responderConversacion(
  api: ClienteAdmin,
  id: string,
  contenido: string,
): Promise<void> {
  await api.post(`/admin/conversations/${id}/messages`, { content: contenido });
}

export async function resolverConversacion(api: ClienteAdmin, id: string): Promise<void> {
  await api.post(`/admin/conversations/${id}/resolve`);
}

export async function alternarBot(api: ClienteAdmin, id: string): Promise<void> {
  await api.post(`/admin/conversations/${id}/toggle-bot`);
}

export async function tomarConversacion(api: ClienteAdmin, id: string): Promise<ActiveEscalation> {
  return api.post<ActiveEscalation>(`/admin/conversations/${id}/take`);
}

export async function devolverAlAgente(api: ClienteAdmin, id: string): Promise<void> {
  await api.post(`/admin/conversations/${id}/return-to-bot`);
}

export async function agregarNotaConversacion(
  api: ClienteAdmin,
  id: string,
  text: string,
): Promise<ConversationNote> {
  return api.post<ConversationNote>(`/admin/conversations/${id}/notes`, { text });
}

export async function listarPlantillasDeConversacion(
  api: ClienteAdmin,
  id: string,
): Promise<ApprovedTemplate[]> {
  return api.get<ApprovedTemplate[]>(`/admin/conversations/${id}/templates`);
}

export async function enviarPlantillaConversacion(
  api: ClienteAdmin,
  id: string,
  templateId: string,
  variables: Record<string, string>,
): Promise<void> {
  await api.post(`/admin/conversations/${id}/template-messages`, {
    template_id: templateId,
    variables,
  });
}

export interface FiltroEscalaciones {
  page?: number;
  reason_code?: string;
}

export async function listarEscalaciones(
  api: ClienteAdmin,
  filtro: FiltroEscalaciones = {},
): Promise<PaginaEscalaciones> {
  return api.get<PaginaEscalaciones>("/admin/escalations", {
    page: filtro.page,
    reason_code: filtro.reason_code,
    page_size: 20,
  });
}

export interface FiltroLeads {
  q?: string;
  channel?: string;
  connection_id?: string;
  /** Filtros de los packs en formato `clave:valor` (se envían como `filtro` repetido). */
  filtros?: string[];
  page?: number;
  pageSize?: number;
}

export async function listarLeads(
  api: ClienteAdmin,
  filtro: FiltroLeads = {},
): Promise<PaginaLeads> {
  return api.get<PaginaLeads>("/admin/leads", {
    q: filtro.q,
    channel: filtro.channel,
    connection_id: filtro.connection_id,
    filtro: filtro.filtros,
    page: filtro.page,
    page_size: filtro.pageSize ?? 20,
  });
}

/** Conexiones del negocio para filtrar Clientes y enviar plantillas. */
export async function listarConexionesDeConversaciones(
  api: ClienteAdmin,
): Promise<ConversationConnection[]> {
  return listarConexiones(api);
}

/** La lista filtrada en CSV (hasta 5000 filas, las más recientes). */
export async function exportarLeadsCsv(
  api: ClienteAdmin,
  filtro: FiltroLeads = {},
): Promise<TextoDescargado> {
  if (!api.getTexto) {
    throw new Error("La descarga de CSV no está disponible en esta versión.");
  }
  return api.getTexto("/admin/leads/export.csv", {
    q: filtro.q,
    channel: filtro.channel,
    connection_id: filtro.connection_id,
    filtro: filtro.filtros,
  });
}

/** Corrige el perfil canónico (identidad, contacto, ubicación y clasificación). */
export async function corregirPerfilDelCliente(
  api: ClienteAdmin,
  id: string,
  valores: Record<string, string>,
  otros: Record<string, string> = {},
): Promise<FichaDelCliente> {
  return api.patch<FichaDelCliente>(`/admin/leads/${id}/perfil`, { valores, otros });
}

/** Ubica la dirección del cliente en el mapa (HU-CRM-08). */
export async function geocodificarCliente(
  api: ClienteAdmin,
  id: string,
): Promise<LeadGeocodificacion> {
  return api.post<LeadGeocodificacion>(`/admin/leads/${id}/geocodificar`);
}

/** Propone una dirección a partir de un punto del mapa; no la guarda. */
export async function geocodificarInverso(
  api: ClienteAdmin,
  id: string,
  latitud: number,
  longitud: number,
): Promise<LeadGeocodificacionInversa> {
  return api.post<LeadGeocodificacionInversa>(`/admin/leads/${id}/geocodificar/reverso`, {
    latitud,
    longitud,
  });
}

function cabecerasDeAdmin(sesion: AdminSesion): Record<string, string> {
  const headers: Record<string, string> = { Authorization: `Bearer ${sesion.token}` };
  if (sesion.tenantId) {
    headers["X-Tenant-Id"] = sesion.tenantId;
  }
  return headers;
}

/** Sube la foto del cliente al almacenamiento del negocio y devuelve la ficha actualizada. */
export async function subirAvatarDelCliente(
  sesion: AdminSesion,
  id: string,
  archivo: ArchivoAvatar,
): Promise<FichaDelCliente> {
  const { body, boundary } = await construirMultipart({}, [{ campo: "file", ...archivo }]);
  const res = await fetchApi(apiV1(`/admin/leads/${id}/avatar`), {
    method: "POST",
    headers: {
      ...cabecerasDeAdmin(sesion),
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body: body as unknown as BodyInit,
  });
  if (!res.ok) {
    throw await parseError(res);
  }
  return (await res.json()) as FichaDelCliente;
}

/** Quita la foto del cliente. */
export async function quitarAvatarDelCliente(sesion: AdminSesion, id: string): Promise<void> {
  const res = await fetchApi(apiV1(`/admin/leads/${id}/avatar`), {
    method: "DELETE",
    headers: cabecerasDeAdmin(sesion),
  });
  if (!res.ok) {
    throw await parseError(res);
  }
}

export async function consentimientoDelCliente(
  api: ClienteAdmin,
  id: string,
): Promise<Consentimiento> {
  return api.get<Consentimiento>(`/admin/leads/${id}/consentimiento`);
}

export async function registrarConsentimiento(
  api: ClienteAdmin,
  id: string,
  datos: ConsentimientoIn,
): Promise<Consentimiento> {
  return api.post<Consentimiento>(`/admin/leads/${id}/consentimiento`, datos);
}

/** Conexiones de WhatsApp con sus plantillas de marketing aprobadas. */
export async function conexionesParaEnvio(api: ClienteAdmin): Promise<ConexionDeEnvio[]> {
  return api.get<ConexionDeEnvio[]>("/admin/leads/acciones/plantilla/conexiones");
}

export async function vistaPreviaDeEnvio(
  api: ClienteAdmin,
  cuerpo: {
    connection_id: string;
    template_id: string;
    variables?: Record<string, VariableDeEnvio>;
  },
  leadId?: string,
): Promise<VistaPreviaEnvio> {
  return api.post<VistaPreviaEnvio>(
    `/admin/leads/acciones/plantilla/vista-previa${leadId ? `?lead_id=${encodeURIComponent(leadId)}` : ""}`,
    cuerpo,
  );
}

export async function confirmarEnvio(
  api: ClienteAdmin,
  envioId: string,
  clave: string,
): Promise<EnvioSegmento> {
  return api.post<EnvioSegmento>(
    `/admin/leads/acciones/plantilla/${encodeURIComponent(envioId)}/confirmar`,
    undefined,
    { "Idempotency-Key": clave },
  );
}

export async function estadoDeEnvio(api: ClienteAdmin, envioId: string): Promise<EnvioSegmento> {
  return api.get<EnvioSegmento>(`/admin/leads/acciones/plantilla/${encodeURIComponent(envioId)}`);
}

export async function fichaDelCliente(api: ClienteAdmin, id: string): Promise<FichaDelCliente> {
  return api.get<FichaDelCliente>(`/admin/leads/${id}`);
}

/** Corrige datos del perfil: quedan como dato de una persona y el agente los usa desde ya. */
export async function corregirDatosDelCliente(
  api: ClienteAdmin,
  id: string,
  datos: Record<string, string>,
): Promise<FichaDelCliente> {
  return api.patch<FichaDelCliente>(`/admin/leads/${id}`, { datos });
}

/** Cambia campos que un pack deja editar (estado e interés del lead de venta, ADR-0149). */
export async function editarCamposDelPack(
  api: ClienteAdmin,
  id: string,
  pluginId: string,
  valores: Record<string, string>,
): Promise<FichaDelCliente> {
  return api.patch<FichaDelCliente>(`/admin/leads/${id}/pack/${encodeURIComponent(pluginId)}`, { valores });
}

/**
 * Datos del perfil para «Lo que sabemos» (ADR-0149): sin el nombre (va en el título) ni el teléfono
 * del perfil cuando es el mismo del canal, para no mostrar el mismo dato dos veces.
 */
export function datosDelPerfil(ficha: Pick<FichaDelCliente, "datos" | "telefono">): DatoDelCliente[] {
  return ficha.datos.filter(
    (d) => d.namespace === "perfil" && d.key !== "name" && !(d.key === "phone" && mismoTelefono(d.value, ficha.telefono)),
  );
}

/** Mismo número con o sin indicativo de país (`+57 300…` y `300…`). */
export function mismoTelefono(a: unknown, b: unknown): boolean {
  const digitos = (v: unknown) => String(v ?? "").replace(/\D+/g, "");
  const x = digitos(a);
  const y = digitos(b);
  if (x.length < 7 || y.length < 7) return false;
  return x.endsWith(y) || y.endsWith(x);
}

/** Pausa o reanuda el agente para este cliente en todas sus conversaciones. */
export async function alternarAgenteDelCliente(api: ClienteAdmin, id: string): Promise<boolean> {
  const res = await api.post<{ bot_paused: boolean }>(`/admin/leads/${id}/toggle-bot`);
  return res.bot_paused;
}

/** Nota del equipo sobre el cliente (HU-CRM-04). */
export interface NotaDelCliente {
  id: string;
  text: string;
  author: string;
  created_at: string;
  puede_borrar: boolean;
}

export interface EventoDelCliente {
  at: string;
  kind: string;
  title: string;
  detail?: string | null;
  link_kind?: string | null;
  link_id?: string | null;
}

export interface PaginaHistoria {
  items: EventoDelCliente[];
  next_cursor: string | null;
  partial: boolean;
}

export async function notasDelCliente(api: ClienteAdmin, id: string): Promise<NotaDelCliente[]> {
  return api.get<NotaDelCliente[]>(`/admin/leads/${id}/notes`);
}

export async function agregarNota(api: ClienteAdmin, id: string, text: string): Promise<NotaDelCliente> {
  return api.post<NotaDelCliente>(`/admin/leads/${id}/notes`, { text });
}

export async function borrarNota(api: ClienteAdmin, id: string, notaId: string): Promise<void> {
  await api.del(`/admin/leads/${id}/notes/${notaId}`);
}

export async function historiaDelCliente(api: ClienteAdmin, id: string, cursor?: string | null): Promise<PaginaHistoria> {
  return api.get<PaginaHistoria>(`/admin/leads/${id}/timeline`, { limit: 20, cursor: cursor ?? undefined });
}

export const TIPO_DE_EVENTO: Record<string, string> = {
  conversacion: "Conversación",
  escalacion: "Escalación",
  dato: "Dato",
  nota: "Nota",
  cotizacion: "Cotización",
  pedido: "Pedido",
  cita: "Cita",
};

const ORIGEN: Record<string, string> = { tool: "Asistente", agent: "Asistente", human: "Persona", import: "Importado" };

export function origenDelDato(source: string): string {
  return ORIGEN[source] ?? source;
}

const ETIQUETA: Record<string, string> = {
  name: "Nombre",
  email: "Correo",
  correo: "Correo",
  telefono: "Teléfono",
  direccion: "Dirección",
  ciudad: "Ciudad",
  barrio: "Barrio",
  documento: "Documento",
  cedula: "Cédula",
  empresa: "Empresa",
};

/** Etiqueta legible de la clave de un dato (`direccion_entrega` → «Direccion entrega»). */
export function etiquetaDelDato(clave: string): string {
  if (ETIQUETA[clave]) return ETIQUETA[clave];
  const texto = clave.replace(/[_.-]+/g, " ").trim();
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : clave;
}

export function textoDelDato(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (typeof valor === "object") return JSON.stringify(valor);
  return String(valor);
}

/** Claves que ya se muestran en la pestaña General; no se repiten en «otros datos». */
const CLAVES_DEL_PERFIL = new Set([
  "name", "nombre", "full_name", "apellido", "alias", "avatar_url", "foto",
  "phone", "telefono", "contact_phone", "pais_telefono",
  "email", "correo", "tipo_documento", "id_document", "documento", "cedula",
  "address", "direccion", "municipio", "municipality", "ciudad", "city",
  "departamento", "department", "estado", "pais", "country",
  "latitud", "lat", "latitude", "longitud", "lng", "lon", "longitude",
  "clasificacion", "clasificación", "direccion_completa", "direccion_normalizada",
  "geocodificado_en", "geocodificacion_precision", "geocodificacion_proveedor", "mapa_url",
]);

export function esClaveDelPerfil(clave: string): boolean {
  return CLAVES_DEL_PERFIL.has(clave);
}

/** Datos que el agente guardó en otros namespaces: se muestran aparte del perfil canónico. */
export function datosFueraDelPerfil(datos: DatoDelCliente[]): DatoDelCliente[] {
  return datos.filter((d) => d.namespace !== "perfil" || !esClaveDelPerfil(d.key));
}

export interface GrupoDeCampos {
  grupo: string;
  campos: LeadCampoPerfil[];
}

/** Campos editables del perfil agrupados por `group` (identidad, contacto, ubicación…). */
export function agruparCamposDelPerfil(campos: LeadCampoPerfil[] | undefined): GrupoDeCampos[] {
  const grupos = new Map<string, LeadCampoPerfil[]>();
  for (const campo of campos ?? []) {
    grupos.set(campo.group, [...(grupos.get(campo.group) ?? []), campo]);
  }
  return [...grupos.entries()].map(([grupo, camposDelGrupo]) => ({ grupo, campos: camposDelGrupo }));
}

/** Valores iniciales del formulario de perfil a partir del perfil canónico. */
export function valoresInicialesDelPerfil(perfil: LeadPerfil | null | undefined): Record<string, string> {
  if (!perfil) return {};
  return {
    name: perfil.name ?? "",
    apellido: perfil.apellido ?? "",
    alias: perfil.alias ?? "",
    phone: perfil.phone_e164 ?? perfil.phone ?? "",
    pais_telefono: perfil.pais_telefono ?? "",
    email: perfil.email ?? "",
    tipo_documento: perfil.tipo_documento ?? "",
    id_document: perfil.id_document ?? "",
    address: perfil.address ?? "",
    municipio: perfil.municipio ?? "",
    departamento: perfil.departamento ?? "",
    pais: perfil.pais ?? "",
    latitud: perfil.latitud === null || perfil.latitud === undefined ? "" : String(perfil.latitud),
    longitud: perfil.longitud === null || perfil.longitud === undefined ? "" : String(perfil.longitud),
    clasificacion: perfil.clasificacion ?? "",
  };
}

export function documentoVisible(perfil: LeadPerfil | null | undefined): string {
  if (!perfil) return "—";
  const tipo = perfil.tipo_documento ? perfil.tipo_documento.toUpperCase() : "";
  if (!perfil.id_document) return tipo || "—";
  return tipo ? `${tipo} ${perfil.id_document}` : perfil.id_document;
}

/** Editables de un pack agrupados por `plugin_id` (pestañas por agente). */
export function agruparEditablesPorPack(editables: CampoEditable[] | undefined): [string, CampoEditable[]][] {
  const grupos = new Map<string, CampoEditable[]>();
  for (const campo of editables ?? []) {
    grupos.set(campo.plugin_id, [...(grupos.get(campo.plugin_id) ?? []), campo]);
  }
  return [...grupos.entries()];
}

// ---------------- HU-APP-21 · playground del asistente ----------------

export interface TurnoPlayground {
  text: string;
  image_url?: string | null;
  escalated?: boolean;
}

export async function cargarPlayground(api: ClienteAdmin): Promise<TurnoPlayground[]> {
  const res = await api.get<{ turns: TurnoPlayground[] }>("/admin/playground");
  return res.turns;
}

export async function enviarMensajePlayground(api: ClienteAdmin, text: string): Promise<void> {
  await api.post("/admin/playground/message", { text });
}

export async function reiniciarPlayground(api: ClienteAdmin): Promise<void> {
  await api.post("/admin/playground/reset");
}
