import type { components } from "@core/api/schema";
import {
  ESTACIONES_DE_NUEVO_AGENTE,
  nombreSugeridoDelTipo,
  tipoDeLaPlantilla,
  type EstacionDeLaRuta,
} from "@shared/ruta-de-lanzamiento";

/**
 * Lógica pura de Nuevo agente en 5 estaciones (HU-APP-23, SPEC-49; la misma ruta que el panel, HU-AOS-86):
 * 1 Tipo · 2 Habilidades · 3 Datos del cliente · 4 Datos para probar · 5 Revisar y publicar. El guion lo sirve el
 * backend (`questions` de cada plantilla) y va dentro de la estación 1, ya respondido con lo recomendado
 * (`Question.default`). Al salir de la 1 nace el borrador (`from-script`); las estaciones 2 a 4 escriben sobre él.
 */
/** La plantilla de un tipo de agente: lo que traía `agent-templates` (retirada), sin lo que suma el manifiesto. */
export type PlantillaAgente = Omit<
  components["schemas"]["AgentType"],
  "mandatory_skills" | "transversal_skills" | "customer_data_operations" | "default_flow_sections"
>;
export type PreguntaDeAgente = components["schemas"]["Question"];
export type AgenteDelNegocio = Pick<components["schemas"]["AgentOverviewItem"], "id" | "key" | "name" | "status" | "virtual">;

/** Nombre visible de las habilidades que una plantilla activa al crear el agente (el mismo del panel). */
const HABILIDADES: Record<string, string> = {
  pack_calendar: "Calendario",
  pack_cobranza: "Cobranza",
  pack_commerce: "Comercio",
  pack_subscriptions: "Suscripciones",
};

export function nombreDeHabilidad(id: string): string {
  return HABILIDADES[id] ?? id.replace(/^pack_/, "");
}

/** Las 5 estaciones fijas de Nuevo agente. */
export const ESTACIONES = ESTACIONES_DE_NUEVO_AGENTE;
export type IdDeEstacion = Extract<EstacionDeLaRuta, "tipo" | "habilidades" | "datos-cliente" | "datos-probar" | "revisar">;

export const NOMBRE_MAX = 120;

export interface EstadoDelAsistente {
  plantilla: string | null;
  /** `id de la pregunta` → id de la opción. */
  respuestas: Record<string, string>;
  nombre: string;
}

export const ESTADO_INICIAL: EstadoDelAsistente = { plantilla: null, respuestas: {}, nombre: "" };

/** Ids del guion que no son preguntas de opción (los toma la propia ruta). */
const PROPIOS = new Set(["tipo", "nombre", "contenido", "revisar", "datos", "cargado", "probar", "publicar"]);

/** Las preguntas de opción del guion que van en la estación 1 («Su guion»). */
export function preguntasDelGuion(plantilla: PlantillaAgente | null | undefined): PreguntaDeAgente[] {
  return (plantilla?.questions ?? []).filter((q) => q.type === "option" && !PROPIOS.has(q.id));
}

export function respuestasPorDefecto(plantilla: PlantillaAgente): Record<string, string> {
  return Object.fromEntries(
    plantilla.questions.flatMap((q) => (q.type === "option" && q.default ? [[q.id, q.default]] : [])),
  );
}

/** El nombre sugerido de una plantilla: el primero del tipo («Tomás» en Agenda) o, si no es uno de los 4, su nombre. */
export function nombreSugeridoDe(plantilla: PlantillaAgente): string {
  const tipo = tipoDeLaPlantilla(plantilla.key);
  return tipo ? nombreSugeridoDelTipo(tipo) : plantilla.name;
}

/** Estado al elegir un tipo: sus respuestas por defecto y su nombre sugerido. */
export function elegirTipo(plantilla: PlantillaAgente): EstadoDelAsistente {
  return { plantilla: plantilla.key, respuestas: respuestasPorDefecto(plantilla), nombre: nombreSugeridoDe(plantilla) };
}

/**
 * Cambia de tipo. El nombre sigue al tipo mientras el dueño no lo haya cambiado (vacío o el sugerido del tipo
 * anterior); lo escrito por él se respeta.
 */
export function cambiarTipo(
  estado: EstadoDelAsistente,
  anterior: PlantillaAgente | null,
  elegida: PlantillaAgente,
): EstadoDelAsistente {
  const nombre = estado.nombre.trim();
  const tocado = nombre !== "" && (!anterior || nombre !== nombreSugeridoDe(anterior));
  return { ...elegirTipo(elegida), nombre: tocado ? estado.nombre : nombreSugeridoDe(elegida) };
}

// ------------------------------------------------------------------ tipo ocupado (D-SPEC-49-3)

/** El agente que ya ocupa el tipo de la plantilla: activo (se edita) o archivado (se desarchiva). */
export type Ocupado = { id: string; nombre: string; archivado: boolean };

/**
 * El agente que ya tiene la `key` de la plantilla, o `null`. La regla del backend (`_agente_por_key`) cuenta todo
 * agente no borrado, archivado incluido; los virtuales no son agentes del negocio. Si hay uno activo y otro
 * archivado, manda el activo. `propio` es el borrador de esta misma ruta: no se ocupa a sí mismo.
 */
export function ocupadoDe(plantillaKey: string, agentes: readonly AgenteDelNegocio[], propio?: string | null): Ocupado | null {
  const delTipo = agentes.filter((a) => a.key === plantillaKey && !a.virtual && a.id && a.id !== propio);
  const elegido = delTipo.find((a) => a.status !== "archived") ?? delTipo[0];
  if (!elegido?.id) return null;
  return { id: elegido.id, nombre: elegido.name.trim() || plantillaKey, archivado: elegido.status === "archived" };
}

/** El texto de la tarjeta ocupada (el mismo del 409 `key_taken` del backend). */
export function textoDeOcupado(nombreDelTipo: string, archivado: boolean): string {
  return archivado
    ? `Ya tienes un agente «${nombreDelTipo}», pero está archivado.`
    : `Ya tienes un agente «${nombreDelTipo}»: edítalo en vez de crear otro.`;
}

/** Una plantilla se puede elegir si está en el servicio y nadie más ocupa su tipo. */
export function sePuedeElegir(plantilla: PlantillaAgente, agentes: readonly AgenteDelNegocio[], propio?: string | null): boolean {
  return plantilla.available && ocupadoDe(plantilla.key, agentes, propio) === null;
}

/** El tipo recomendado: el primero libre y disponible, en el orden de la API. `null` si no queda ninguno. */
export function primerTipoLibre(
  plantillas: readonly PlantillaAgente[],
  agentes: readonly AgenteDelNegocio[],
  propio?: string | null,
): PlantillaAgente | null {
  return plantillas.find((p) => sePuedeElegir(p, agentes, propio)) ?? null;
}

/** Estado recomendado de la estación 1: el tipo libre, su guion por defecto y su nombre sugerido. */
export function estadoRecomendado(
  plantillas: readonly PlantillaAgente[],
  agentes: readonly AgenteDelNegocio[],
  propio?: string | null,
): EstadoDelAsistente {
  const libre = primerTipoLibre(plantillas, agentes, propio);
  return libre ? elegirTipo(libre) : ESTADO_INICIAL;
}

/** Lo que se compara con lo recomendado en la estación 1: el tipo, el nombre y cada respuesta del guion. */
export function valoresDeLaEstacion1(estado: EstadoDelAsistente): Record<string, string | null> {
  return { tipo: estado.plantilla, nombre: estado.nombre.trim(), ...estado.respuestas };
}

/**
 * Texto de ayuda de un tipo de agente. Elegirlo ACTIVA sus habilidades (`will_enable`); solo queda fuera un tipo
 * que el servicio no trae (`available` falso).
 */
export function ayudaDeLaPlantilla(plantilla: PlantillaAgente): string {
  if (!plantilla.available) return "No está en tu servicio por ahora. Pídelo a SolversHub.";
  return plantilla.description;
}

/** Mensaje de error de la estación 1, o `undefined` si se puede crear. */
export function errorDeLaEstacion1(estado: EstadoDelAsistente, plantilla: PlantillaAgente | null | undefined): string | undefined {
  if (!plantilla) return "Elige qué quieres que haga tu agente.";
  if (!plantilla.available) return "Este tipo de agente no está disponible en tu servicio por ahora.";
  const nombre = estado.nombre.trim();
  if (!nombre) return "Ponle un nombre para seguir";
  if (nombre.length > NOMBRE_MAX) return `Usa máximo ${NOMBRE_MAX} caracteres.`;
  const sinRespuesta = preguntasDelGuion(plantilla).find((q) => !q.options.some((o) => o.id === estado.respuestas[q.id]));
  return sinRespuesta ? `Elige una opción en «${sinRespuesta.text}».` : undefined;
}

/** Cuerpo de `POST /admin/agents/from-script`: solo respuestas de preguntas que el guion tiene. */
export function cuerpoDeCreacion(
  estado: EstadoDelAsistente,
  plantilla: PlantillaAgente,
): { template_key: string; answers: Record<string, string>; name?: string } {
  const conocidas = new Set(plantilla.questions.map((q) => q.id));
  const answers = Object.fromEntries(Object.entries(estado.respuestas).filter(([id]) => conocidas.has(id)));
  const name = estado.nombre.trim();
  return { template_key: plantilla.key, answers, ...(name ? { name } : {}) };
}

export function textoDeRespuesta(pregunta: PreguntaDeAgente, estado: EstadoDelAsistente): string {
  return pregunta.options.find((o) => o.id === estado.respuestas[pregunta.id])?.text ?? "—";
}

// ------------------------------------------------------------------ retomar sin duplicar

/** Lo que se recuerda del borrador de Nuevo agente para retomarlo por su `agent_id`. */
export type BorradorDeNuevoAgente = { agentId: string; estacion: number };

export const claveDeNuevoAgente = (negocioId: string | null) => `sh-nuevo-agente:${negocioId ?? "sin-negocio"}`;

/** Lee el borrador guardado; `null` si no hay o está dañado. */
export function leerBorradorDeNuevoAgente(crudo: string | null): BorradorDeNuevoAgente | null {
  if (!crudo) return null;
  try {
    const b = JSON.parse(crudo) as Partial<BorradorDeNuevoAgente>;
    if (typeof b.agentId !== "string" || !b.agentId) return null;
    const estacion = typeof b.estacion === "number" ? Math.min(Math.max(Math.trunc(b.estacion), 2), 5) : 2;
    return { agentId: b.agentId, estacion };
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ lista de agentes

export type TipoDeAgente = "coordinator" | "specialist" | "core" | string;

/** «Coordinador» o «Especialista» para la lista (por la key y el tipo del agente; ya no hay General, ADR-0192). */
export function etiquetaDeAgente(a: { key: string; kind: string }): string {
  if (a.key === "coordinador" || a.kind === "core") return "Coordinador";
  return "Especialista";
}

/** Con permiso de escritura en Ajustes (o master): quien puede crear agentes. Todo negocio corre en el Agent OS (ADR-0191). */
export function puedeCrearAgentes(sesion: { role?: string | null; permissions?: Record<string, string | null> | null }): boolean {
  return sesion.role === "master" || sesion.permissions?.settings === "write";
}

type CuotaDeAgentes = { used: number; limit: number | null; allowed: boolean } | null | undefined;

/**
 * Aviso para no abrir el asistente cuando el plan ya tiene todos sus agentes publicados.
 * `null` si hay cupo, si el plan no limita o si el billing no respondió.
 */
export function avisoDeTopeDeAgentes(cuota: CuotaDeAgentes): string | null {
  if (!cuota || cuota.allowed || cuota.limit === null) return null;
  const permitidos = cuota.limit === 1 ? "1 agente publicado" : `${cuota.limit} agentes publicados`;
  return `Tu plan permite ${permitidos} y ya tienes ${cuota.used}. Mejora tu plan para crear otro agente.`;
}
