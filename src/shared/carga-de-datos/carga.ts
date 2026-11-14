import type { ClienteAdmin } from "@core/api/admin";
import { parseError } from "@core/api/auth-admin";
import { fetchApi } from "@core/api/http";
import { construirMultipart } from "@core/api/multipart";
import type { components } from "@core/api/schema";
import { apiV1 } from "@core/config";
import type { AdminSesion } from "@core/session/types";
import type { ArchivoDeFoto } from "@shared/media/preparar-foto-producto";

/**
 * Carga de datos al crear un agente en la app (SPEC-45, HU-AOS-73): el mismo contrato que el panel. Generar datos
 * de prueba solo existe en test (fuera responde 404) y las fotos se cotizan antes y se cobran una sola vez. La
 * precarga vive en la app: cada foto vuelve como una fila que el dueño corrige, y al confirmar la API la valida
 * otra vez. El CSV se importa desde el panel web.
 */
export type EstadoDatosDePrueba = components["schemas"]["EstadoDatosDePrueba"];
export type LoteGenerado = components["schemas"]["LoteGenerado"];
export type EstadoImportacion = components["schemas"]["EstadoImportacion"];
export type PlantillaImportacion = components["schemas"]["PlantillaImportacionOut"];
export type CotizacionFotos = components["schemas"]["CotizacionFotos"];
export type FilaDeFoto = components["schemas"]["FilaDeFoto"];
export type VistaPrevia = components["schemas"]["VistaPreviaImportacion"];
export type ImportacionHecha = components["schemas"]["ImportacionHecha"];
export type RegistrosDePrueba = components["schemas"]["RegistrosDePrueba"];
export type RegistroDePrueba = components["schemas"]["RegistroDePrueba"];

/** Columna interna de la foto: la llena la API y no se edita como texto. */
export const COLUMNA_FOTO = "imagen";
/** Fotos por tanda: con más, la cotización deja de ser legible y la espera se alarga. */
export const MAX_FOTOS = 30;

/** Una fila de la precarga: lo que se confirmará, más la miniatura y lo que propuso la IA. */
export interface FilaEditable {
  fila: number;
  valores: Record<string, string>;
  inferidas: string[];
  imagenUrl?: string | null;
}

/** Columnas que el dueño ve y edita, en el orden de la plantilla (sin la interna de la foto). */
export function columnasVisibles(plantilla: Pick<PlantillaImportacion, "columnas">): string[] {
  return plantilla.columnas.map((c) => c.nombre).filter((n) => n !== COLUMNA_FOTO);
}

export function filaDesdeFoto(f: FilaDeFoto, numero: number): FilaEditable {
  const valores = { ...(f.valores as Record<string, string>) };
  return {
    fila: numero,
    valores,
    inferidas: Object.keys(valores).filter((c) => c !== COLUMNA_FOTO && valores[c]),
    imagenUrl: f.image_url,
  };
}

export function editarCelda(filas: FilaEditable[], fila: number, columna: string, valor: string): FilaEditable[] {
  return filas.map((f) =>
    f.fila === fila
      ? { ...f, valores: { ...f.valores, [columna]: valor }, inferidas: f.inferidas.filter((c) => c !== columna) }
      : f,
  );
}

export function quitarFila(filas: FilaEditable[], fila: number): FilaEditable[] {
  return filas.filter((f) => f.fila !== fila);
}

export function siguienteNumero(filas: FilaEditable[]): number {
  return filas.reduce((n, f) => Math.max(n, f.fila), 1) + 1;
}

export function erroresDeLaFila(v: Pick<VistaPrevia, "errores"> | null, fila: number): { columna: string | null; mensaje: string }[] {
  return (v?.errores ?? []).filter((e) => e.fila === fila).map((e) => ({ columna: e.columna ?? null, mensaje: e.mensaje }));
}

function creditos(n: number): string {
  return `${n} ${n === 1 ? "crédito" : "créditos"}`;
}

export function textoDeCotizacion(c: CotizacionFotos): string {
  const que = `Reconocer ${c.fotos} ${c.fotos === 1 ? "foto" : "fotos"} cuesta ${creditos(c.creditos)}`;
  const llave = c.llave_propia ? " (usas tu propia llave de visión: solo se cobra el uso de la plataforma)" : "";
  if (c.limite === null || c.limite === undefined) return `${que}${llave}.`;
  const disponible = c.disponible ?? Math.max(0, c.limite - c.usado);
  return `${que}${llave}. Te quedan ${creditos(disponible)} este mes.`;
}

/** Lo cargado en producción (sin la API de registros, que es solo de test): sale de las filas confirmadas. */
export function registrosDesdeFilas(filas: FilaEditable[]): RegistroDePrueba[] {
  return filas
    .filter((f) => (f.valores.nombre ?? "").trim())
    .map((f) => ({
      tipo: "producto",
      nombre: f.valores.nombre.trim(),
      detalle: [f.valores.precio, f.valores.categoria].filter((x) => x && x.trim()).join(" · ") || null,
      origen: "importacion",
    }));
}

/** Frases para probar el agente con lo cargado (como mucho 4, sin repetir). */
export function sugerenciasDePrueba(registros: Pick<RegistroDePrueba, "tipo" | "nombre">[]): string[] {
  const frases: string[] = [];
  const de = (tipo: string) => registros.filter((r) => r.tipo === tipo).map((r) => r.nombre);
  const [p1, p2] = de("producto");
  if (p1) frases.push(`¿Tienen ${p1}?`);
  if (p2) frases.push(`¿Cuánto cuesta ${p2}?`);
  if (p1 && !p2) frases.push(`¿Cuánto cuesta ${p1}?`);
  const [t1] = de("tipo");
  if (t1) frases.push(`Quiero agendar ${t1} para mañana`);
  const [c1] = de("cliente");
  if (c1) frases.push(`Hola, soy ${c1}. ¿Cuánto debo?`);
  const [pl] = de("plan");
  if (pl) frases.push(`¿Qué incluye el plan ${pl}?`);
  return [...new Set(frases)].slice(0, 4);
}

/** «3 productos y 1 categoría» a partir de los conteos de un lote. */
export function conteoLegible(conteos: Record<string, number>): string {
  const tipos: [string, string, string][] = [
    ["producto", "producto", "productos"],
    ["categoria", "categoría", "categorías"],
    ["tipo", "tipo de cita", "tipos de cita"],
    ["cita", "cita", "citas"],
    ["cartera", "cartera", "carteras"],
    ["cliente", "cliente", "clientes"],
    ["prestamo", "préstamo", "préstamos"],
  ];
  const partes = tipos
    .filter(([k]) => (conteos[k] ?? 0) > 0)
    .map(([k, uno, varios]) => `${conteos[k]} ${conteos[k] === 1 ? uno : varios}`);
  if (partes.length === 0) return "sin registros nuevos";
  return partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

/** Lo que una opción no existe aquí (404 fuera de test) se trata como «no disponible», no como error. */
async function opcional<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch {
    return null;
  }
}

export function cargarEstadoDePrueba(api: ClienteAdmin, agentId: string): Promise<EstadoDatosDePrueba | null> {
  return opcional(api.get<EstadoDatosDePrueba>(`/admin/agents/${agentId}/datos-de-prueba`));
}

export function cargarEstadoDeImportacion(api: ClienteAdmin, agentId: string): Promise<EstadoImportacion | null> {
  return opcional(api.get<EstadoImportacion>(`/admin/agents/${agentId}/importar-datos`));
}

export function generarDatosDePrueba(api: ClienteAdmin, agentId: string): Promise<LoteGenerado> {
  return api.post<LoteGenerado>(`/admin/agents/${agentId}/datos-de-prueba`);
}

export function cargarRegistros(api: ClienteAdmin, agentId: string): Promise<RegistrosDePrueba | null> {
  return opcional(api.get<RegistrosDePrueba>(`/admin/agents/${agentId}/datos-de-prueba/registros`));
}

export function cotizarFotos(api: ClienteAdmin, agentId: string, fotos: number): Promise<CotizacionFotos> {
  return api.get<CotizacionFotos>(`/admin/agents/${agentId}/importar-datos/fotos/cotizacion`, { fotos });
}

function cuerpoDePrecarga(filas: FilaEditable[], soloValidas: boolean) {
  return { filas: filas.map((f) => ({ fila: f.fila, valores: f.valores })), solo_validas: soloValidas };
}

export function validarPrecarga(api: ClienteAdmin, agentId: string, filas: FilaEditable[]): Promise<VistaPrevia> {
  return api.post<VistaPrevia>(`/admin/agents/${agentId}/importar-datos/filas/validar`, cuerpoDePrecarga(filas, false));
}

export function confirmarPrecarga(
  api: ClienteAdmin,
  agentId: string,
  filas: FilaEditable[],
  soloValidas: boolean,
): Promise<ImportacionHecha> {
  return api.post<ImportacionHecha>(`/admin/agents/${agentId}/importar-datos/filas`, cuerpoDePrecarga(filas, soloValidas));
}

/** Error de una foto: `code` permite distinguir el crédito agotado (`plan_limit_creditos`). */
export class ErrorDeFoto extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ErrorDeFoto";
  }
}

/** Una foto → una fila propuesta. Multipart a mano: el fetch de Expo no acepta las partes de React Native. */
export async function subirFoto(sesion: AdminSesion, agentId: string, foto: ArchivoDeFoto): Promise<FilaDeFoto> {
  const { body, boundary } = await construirMultipart({}, [{ campo: "archivo", ...foto }]);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${sesion.token}`,
    "Content-Type": `multipart/form-data; boundary=${boundary}`,
  };
  if (sesion.tenantId) headers["X-Tenant-Id"] = sesion.tenantId;
  const res = await fetchApi(apiV1(`/admin/agents/${agentId}/importar-datos/fotos`), {
    method: "POST",
    headers,
    body: body as unknown as BodyInit,
  });
  if (!res.ok) {
    const e = await parseError(res);
    throw new ErrorDeFoto(e.code, e.message);
  }
  return (await res.json()) as FilaDeFoto;
}
