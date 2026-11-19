/**
 * Lógica pura de la «Ruta de lanzamiento» en la APK (HU-APP-23, SPEC-49): las 5 estaciones de la bienvenida y
 * de Nuevo agente, la comparación con lo recomendado («N cambios» y «Usar lo recomendado») y el nombre sugerido
 * con sus ideas. Es el mismo contrato que `lib/ruta-de-lanzamiento.ts` del panel. Vive en `shared` porque la
 * usan los módulos `onboarding` y `agentes`, que no se importan entre sí (ADR-APP-01).
 */

/** Los cuatro tipos de agente de la ruta (las plantillas `ventas`, `agenda`, `cobranza` y `suscripciones`). */
export type TipoDeNegocio = "ventas" | "agenda" | "cobranza" | "suscripciones";

const TIPOS = new Set<TipoDeNegocio>(["ventas", "agenda", "cobranza", "suscripciones"]);

/** El tipo de una plantilla, o `null` si no es uno de los cuatro. */
export function tipoDeLaPlantilla(key: string | null | undefined): TipoDeNegocio | null {
  return key && TIPOS.has(key as TipoDeNegocio) ? (key as TipoDeNegocio) : null;
}

/** Las estaciones de las dos rutas. «tipo» (Nuevo agente) y «negocio» (bienvenida) son la estación 1. */
export type EstacionDeLaRuta = "negocio" | "tipo" | "habilidades" | "datos-cliente" | "datos-probar" | "revisar";

export type Estacion = { id: EstacionDeLaRuta; titulo: string };

const COMUNES: readonly Estacion[] = [
  { id: "habilidades", titulo: "Habilidades" },
  { id: "datos-cliente", titulo: "Datos del cliente" },
  { id: "datos-probar", titulo: "Datos para probar" },
  { id: "revisar", titulo: "Revisar y publicar" },
];

/** Bienvenida: 1 Tu negocio · 2 Habilidades · 3 Datos del cliente · 4 Datos para probar · 5 Revisar y publicar. */
export const ESTACIONES_DE_LA_BIENVENIDA: readonly Estacion[] = [{ id: "negocio", titulo: "Tu negocio" }, ...COMUNES];

/** Nuevo agente: 1 Tipo · 2 Habilidades · 3 Datos del cliente · 4 Datos para probar · 5 Revisar y publicar. */
export const ESTACIONES_DE_NUEVO_AGENTE: readonly Estacion[] = [{ id: "tipo", titulo: "Tipo" }, ...COMUNES];

export const TOTAL_ESTACIONES = 5;

/** El número de la estación (1 a 5), igual en las dos rutas. */
export function numeroDeEstacion(estacion: EstacionDeLaRuta): number {
  return estacion === "negocio" || estacion === "tipo" ? 1 : COMUNES.findIndex((e) => e.id === estacion) + 2;
}

/** El nombre visible de la estación («Tu negocio», «Datos del cliente»…). */
export function tituloDeEstacion(estacion: EstacionDeLaRuta): string {
  return [...ESTACIONES_DE_LA_BIENVENIDA, ...ESTACIONES_DE_NUEVO_AGENTE].find((e) => e.id === estacion)?.titulo ?? "";
}

/** «Paso 2 de 5 · Habilidades», el texto de la mini ruta. */
export function textoDeLaRuta(estacion: EstacionDeLaRuta): string {
  return `Paso ${numeroDeEstacion(estacion)} de ${TOTAL_ESTACIONES} · ${tituloDeEstacion(estacion)}`;
}

/** «Guardar y seguir: Datos del cliente», el botón que deja la estación y pasa a la siguiente. */
export function textoDeGuardarYSeguir(estacion: EstacionDeLaRuta): string {
  const siguiente = COMUNES[numeroDeEstacion(estacion) - 1];
  return siguiente ? `Guardar y seguir: ${siguiente.titulo}` : "Guardar y seguir";
}

// ---------------------------------------------------------------------------------- recomendado

/** Lo que se compara en una estación: un valor por opción (radio, interruptor o varias a la vez). */
export type ValoresDeEstacion = Readonly<Record<string, string | number | boolean | null | readonly string[]>>;

/**
 * Las opciones que el dueño cambió frente a lo recomendado, en el orden de `recomendado`. Las listas se comparan
 * como conjuntos (el orden no cuenta) y una clave que falta en `actual` no cuenta como cambio.
 */
export function cambiosFrenteARecomendado(actual: ValoresDeEstacion, recomendado: ValoresDeEstacion): string[] {
  return Object.keys(recomendado).filter((clave) => {
    if (!(clave in actual)) return false;
    return !iguales(actual[clave], recomendado[clave]);
  });
}

function iguales(a: ValoresDeEstacion[string], b: ValoresDeEstacion[string]): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    const sa = new Set(a);
    const sb = new Set(b);
    return sa.size === sb.size && [...sa].every((x) => sb.has(x));
  }
  return a === b;
}

/** «1 cambio», «2 cambios». */
export function textoDeCambios(cuantos: number): string {
  return cuantos === 1 ? "1 cambio" : `${cuantos} cambios`;
}

// --------------------------------------------------------------------------------- nombre

export const NOMBRE_AGENTE_MAX = 60;

/** El nombre sugerido de la bienvenida para cualquier tipo (decisión del dueño, D-SPEC-49-6). */
export const NOMBRE_SUGERIDO_DE_LA_BIENVENIDA = "Laura";

/** Nombres por tipo para Nuevo agente: el primero es el sugerido («Tomás» en Agenda, como en `rn1`). */
const NOMBRES_DE_NUEVO_AGENTE: Record<TipoDeNegocio, readonly string[]> = {
  ventas: ["Laura", "Sofía", "Mateo"],
  agenda: ["Tomás", "Sofía", "Mateo"],
  cobranza: ["Clara", "Nico", "Sofía"],
  suscripciones: ["Alma", "Leo", "Sofía"],
};

/** Nombres que no suenan a persona: no se ofrecen como idea. */
const FUNCIONES = new Set(["Agenda", "Cobros", "Planes"]);

export function nombreSugeridoDelTipo(tipo: TipoDeNegocio): string {
  return NOMBRES_DE_NUEVO_AGENTE[tipo][0];
}

/** Ideas de nombre: el sugerido primero y luego las del tipo, sin repetir ni nombres de función. Hasta `cuantas`. */
export function ideasDeNombre(
  sugerido: string,
  tipo: TipoDeNegocio | null,
  cuantas = 3,
  otras: readonly string[] = [],
): string[] {
  const delTipo = tipo ? [...NOMBRES_DE_NUEVO_AGENTE[tipo], ...otras] : [...otras];
  const todas = [sugerido, ...delTipo].map((n) => n.trim()).filter((n) => n && !FUNCIONES.has(n));
  return [...new Set(todas)].slice(0, cuantas);
}

export const TEXTO_SIN_NOMBRE = "Ponle un nombre para seguir";

/** El error del nombre del agente, o `null` si sirve. Sin nombre no se puede avanzar. */
export function errorDelNombre(nombre: string, max = NOMBRE_AGENTE_MAX): string | null {
  const limpio = nombre.trim();
  if (!limpio) return TEXTO_SIN_NOMBRE;
  if (limpio.length > max) return `Usa máximo ${max} caracteres.`;
  return null;
}

/** La inicial que va en el círculo de una idea de nombre. */
export function inicialDe(nombre: string): string {
  return nombre.trim().charAt(0).toLocaleUpperCase("es-CO");
}

/** Las dos primeras letras para la píldora del agente («TO» de Tomás). */
export function siglasDe(nombre: string): string {
  return nombre.trim().slice(0, 2).toLocaleUpperCase("es-CO");
}
