import type { components } from "@core/api/schema";
import { aRangosTexto, textoARangos } from "./horarioAtencion";
import { leerNumero } from "./numeros";

/**
 * Catálogo de opciones de Configuración (SPEC-37, ADR-0166): etiquetas, ayudas, valores y rangos
 * los sirve el backend (`GET /admin/settings/catalog`), los mismos que ve el panel. Este módulo
 * solo los consulta y los presenta; no guarda listas de valores.
 */
export type CatalogoConfig = components["schemas"]["Catalogo"];
export type OpcionConfig = components["schemas"]["Opcion"];
export type ValorPosibleConfig = components["schemas"]["ValorPosible"];

/** Lo que edita la pantalla: cada tipo de opción tiene su forma de borrador. */
export type EstadoCampo = string | boolean | string[];
export type EstadoIdentidad = Record<string, EstadoCampo>;

/** Secciones de Identidad, en el orden en que se muestran. */
export const GRUPOS_IDENTIDAD: { id: OpcionConfig["grupo"]; titulo: string }[] = [
  { id: "identidad", titulo: "El negocio" },
  { id: "voz", titulo: "Cómo habla" },
  { id: "respuesta", titulo: "Cómo responde" },
  { id: "calidad", titulo: "Calidad de las respuestas" },
  { id: "escalamiento", titulo: "Pasar con una persona" },
  { id: "horario", titulo: "Horario de atención" },
];

/** Tienen su propia pantalla o se unifican: no se pintan con el control genérico. */
const SIN_CONTROL_GENERICO = new Set(["palabras_de_baja", "business_tz"]);

export function opcionesDelGrupo(
  catalogo: CatalogoConfig,
  grupo: OpcionConfig["grupo"],
  valores: Record<string, unknown>,
): OpcionConfig[] {
  return catalogo.opciones.filter(
    (o) => o.grupo === grupo && !SIN_CONTROL_GENERICO.has(o.clave) && o.clave in valores,
  );
}

/** «Natural · espera 15 s»: la etiqueta con su nota, nunca el identificador crudo. */
export const etiquetaDeValor = (v: ValorPosibleConfig): string =>
  v.nota ? `${v.etiqueta} · ${v.nota}` : v.etiqueta;

/** Si el valor guardado ya no está en la lista (fila antigua), se conserva visible. */
export function valoresConActual(opcion: OpcionConfig, actual: string): ValorPosibleConfig[] {
  const valores = opcion.valores ?? [];
  if (!actual || valores.some((v) => v.valor === actual)) return valores;
  return [...valores, { valor: actual, etiqueta: actual, nota: "valor actual" }];
}

/** «Entre 1 y 10 puntos.», o vacío si la opción no es numérica. */
export function rangoTexto(opcion: OpcionConfig): string {
  if (opcion.minimo == null || opcion.maximo == null) return "";
  const unidad = opcion.unidad ? ` ${opcion.unidad}` : "";
  return `Entre ${opcion.minimo} y ${opcion.maximo}${unidad}.`;
}

/** Ayuda de un campo: qué cambia, el ejemplo si lo hay y el rango si es numérico. */
export function ayudaDeOpcion(opcion: OpcionConfig): string {
  const partes = [opcion.explicacion.trim()];
  if (opcion.ejemplo) partes.push(`Ejemplo: ${opcion.ejemplo.trim().replace(/\.+$/, "")}.`);
  const rango = rangoTexto(opcion);
  if (rango) partes.push(rango);
  return partes.filter(Boolean).join(" ");
}

/** Mensaje de rango fuera de lo permitido, o `null` si el valor es válido. */
export function errorDeRango(opcion: OpcionConfig, valor: number): string | null {
  if (opcion.minimo == null || opcion.maximo == null) return null;
  if (!Number.isFinite(valor) || valor < opcion.minimo || valor > opcion.maximo) {
    return `«${opcion.etiqueta}» debe estar entre ${opcion.minimo} y ${opcion.maximo}.`;
  }
  return null;
}

function cumple(condicion: "no_vacia" | "verdadera" | "igual", esperado: string | null | undefined, valor: unknown): boolean {
  if (condicion === "verdadera") return valor === true;
  if (condicion === "igual") return String(valor) === esperado;
  if (Array.isArray(valor)) return valor.length > 0;
  return typeof valor === "string" ? valor.trim() !== "" : valor != null;
}

/** ¿La opción tiene efecto con los valores actuales? Si no, trae el motivo para mostrarlo. */
export function dependencia(
  opcion: OpcionConfig,
  valores: Record<string, unknown>,
): { activa: boolean; motivo: string; de: string } {
  const dep = opcion.depende_de;
  if (!dep) return { activa: true, motivo: "", de: "" };
  const activa = cumple(dep.condicion, dep.valor, valores[dep.clave]);
  return { activa, motivo: activa ? "" : dep.motivo, de: dep.clave };
}

/** Valor de la API → borrador editable. */
export function aEstado(opcion: OpcionConfig, valor: unknown): EstadoCampo {
  switch (opcion.tipo) {
    case "booleano":
      return valor === true;
    case "elegir_varias":
      return Array.isArray(valor) ? (valor as string[]) : [];
    case "lista_de_textos":
      return Array.isArray(valor) ? (valor as string[]).filter((x) => typeof x === "string") : [];
    case "franjas":
      return aRangosTexto(Array.isArray(valor) ? (valor as Record<string, unknown>[]) : []);
    default:
      return valor == null ? "" : String(valor);
  }
}

/** Borrador editable → valor para la API. */
export function deEstado(opcion: OpcionConfig, estado: EstadoCampo): unknown {
  switch (opcion.tipo) {
    case "entero":
    case "decimal":
      return typeof estado === "string" ? (leerNumero(estado) ?? Number.NaN) : Number.NaN;
    case "lista_de_textos":
      return Array.isArray(estado) ? estado : [];
    case "franjas":
      return typeof estado === "string" ? textoARangos(estado) : [];
    default:
      return estado;
  }
}

/** Borradores de Identidad a partir de lo guardado, solo de las claves que el catálogo pinta. */
export function estadoInicial(catalogo: CatalogoConfig, identidad: Record<string, unknown>): EstadoIdentidad {
  const estado: EstadoIdentidad = {};
  for (const grupo of GRUPOS_IDENTIDAD) {
    for (const opcion of opcionesDelGrupo(catalogo, grupo.id, identidad)) {
      estado[opcion.clave] = aEstado(opcion, identidad[opcion.clave]);
    }
  }
  return estado;
}

/** Valores de la API de los borradores (para dependencias y para el cuerpo del PUT). */
export function valoresDeEstado(catalogo: CatalogoConfig, estado: EstadoIdentidad): Record<string, unknown> {
  const valores: Record<string, unknown> = {};
  for (const opcion of catalogo.opciones) {
    if (opcion.clave in estado) valores[opcion.clave] = deEstado(opcion, estado[opcion.clave]);
  }
  return valores;
}

/** Errores de rango de los campos numéricos; `{clave: mensaje}`, vacío si todo está bien. */
export function erroresDeRango(catalogo: CatalogoConfig, estado: EstadoIdentidad): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const opcion of catalogo.opciones) {
    if ((opcion.tipo !== "entero" && opcion.tipo !== "decimal") || !(opcion.clave in estado)) continue;
    const valor = deEstado(opcion, estado[opcion.clave]) as number;
    const error = Number.isNaN(valor) ? `«${opcion.etiqueta}» necesita un número.` : errorDeRango(opcion, valor);
    if (error) errores[opcion.clave] = error;
  }
  return errores;
}
