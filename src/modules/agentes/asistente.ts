import type { components } from "@core/api/schema";

/**
 * Lógica pura del asistente de creación de agentes (HU-AOS-56, SPEC-39). El guion lo sirve el
 * backend (`questions` de cada plantilla, el mismo que ve el panel); aquí solo se ordenan los pasos,
 * se validan las respuestas y se arma el cuerpo de `POST /admin/agents/from-script`. Las reglas de
 * fondo siguen en la API.
 */
export type PlantillaAgente = components["schemas"]["AgentTemplate"];
export type PreguntaDeAgente = components["schemas"]["Question"];

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

/**
 * Texto de ayuda de un tipo de agente. Elegirlo ACTIVA sus habilidades (`will_enable`): ya no hay que
 * activarlas antes. Solo queda fuera un tipo que el servicio no trae (`available` falso).
 */
export function ayudaDeLaPlantilla(plantilla: PlantillaAgente): string {
  if (!plantilla.available) return "No está disponible en tu servicio por ahora.";
  const activara = plantilla.will_enable ?? [];
  return activara.length > 0
    ? `${plantilla.description} Al crearlo activaremos: ${activara.map(nombreDeHabilidad).join(", ")}.`
    : plantilla.description;
}

/** Máximo de pasos, contando elegir el tipo, el nombre, lo cargado, revisar y publicar (ADR-0171). */
export const MAX_PASOS = 10;
export const NOMBRE_MAX = 120;

export type PasoAsistente =
  | { id: "tipo"; titulo: string }
  | { id: string; titulo: string; pregunta: PreguntaDeAgente }
  | { id: "nombre"; titulo: string }
  | { id: "contenido"; titulo: string }
  | { id: "revisar"; titulo: string }
  | { id: "publicar"; titulo: string };

export interface EstadoDelAsistente {
  plantilla: string | null;
  /** `id de la pregunta` → id de la opción. */
  respuestas: Record<string, string>;
  nombre: string;
}

export const ESTADO_INICIAL: EstadoDelAsistente = { plantilla: null, respuestas: {}, nombre: "" };

const PASO_TIPO: PasoAsistente = { id: "tipo", titulo: "¿Qué quieres que haga?" };
const PASOS_FINALES: PasoAsistente[] = [
  { id: "nombre", titulo: "¿Cómo se llama?" },
  { id: "contenido", titulo: "Lo que ya tienes cargado" },
  { id: "revisar", titulo: "Revisar y crear" },
  { id: "publicar", titulo: "Dónde atiende" },
];
const RESERVADOS = new Set(["tipo", "nombre", "contenido", "revisar", "publicar"]);

/** tipo → una por pregunta del guion → nombre → contenido → revisar → publicar; nunca más de `MAX_PASOS`. */
export function pasosDelAsistente(plantilla: PlantillaAgente | null | undefined): PasoAsistente[] {
  if (!plantilla) return [PASO_TIPO];
  const preguntas = plantilla.questions
    .filter((q) => q.type === "option" && !RESERVADOS.has(q.id))
    .slice(0, MAX_PASOS - 1 - PASOS_FINALES.length)
    .map<PasoAsistente>((q) => ({ id: q.id, titulo: q.text, pregunta: q }));
  return [PASO_TIPO, ...preguntas, ...PASOS_FINALES];
}

export function respuestasPorDefecto(plantilla: PlantillaAgente): Record<string, string> {
  return Object.fromEntries(
    plantilla.questions.flatMap((q) => (q.type === "option" && q.default ? [[q.id, q.default]] : [])),
  );
}

export function elegirTipo(plantilla: PlantillaAgente): EstadoDelAsistente {
  return { plantilla: plantilla.key, respuestas: respuestasPorDefecto(plantilla), nombre: "" };
}

/** Mensaje de error del paso, o `undefined` si se puede avanzar. */
export function errorDelPaso(
  paso: PasoAsistente,
  estado: EstadoDelAsistente,
  plantilla: PlantillaAgente | null | undefined,
): string | undefined {
  if (paso.id === "tipo") {
    if (!plantilla) return "Elige qué quieres que haga tu agente.";
    if (!plantilla.available) return "Este tipo de agente no está disponible en tu servicio por ahora.";
    return undefined;
  }
  if (paso.id === "nombre") {
    return estado.nombre.trim().length > NOMBRE_MAX ? `Máximo ${NOMBRE_MAX} caracteres.` : undefined;
  }
  if ("pregunta" in paso) {
    const valor = estado.respuestas[paso.pregunta.id];
    return paso.pregunta.options.some((o) => o.id === valor) ? undefined : "Elige una de las opciones.";
  }
  return undefined;
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

/** Índice del paso al que pertenece un error de campo de la API (`id de la pregunta` o `name`). */
export function pasoDelCampo(campo: string, pasos: PasoAsistente[]): number {
  const i = pasos.findIndex((p) => p.id === campo || (campo === "name" && p.id === "nombre"));
  return i >= 0 ? i : Math.max(0, pasos.findIndex((p) => p.id === "revisar"));
}

export function textoDeRespuesta(pregunta: PreguntaDeAgente, estado: EstadoDelAsistente): string {
  return pregunta.options.find((o) => o.id === estado.respuestas[pregunta.id])?.text ?? "—";
}

export type TipoDeAgente = "coordinator" | "specialist" | "core" | "general" | string;

/** «Coordinador», «General» o «Especialista» para la lista (por la key y el tipo del agente). */
export function etiquetaDeAgente(a: { key: string; kind: string }): string {
  if (a.key === "coordinador" || a.kind === "core") return "Coordinador";
  if (a.key === "general") return "General";
  return "Especialista";
}

/** Con permiso de escritura en Ajustes y negocio v3 (o master): quien puede crear agentes. */
export function puedeCrearAgentes(sesion: { role?: string | null; permissions?: Record<string, string | null> | null }, runtime: string): boolean {
  if (sesion.role === "master") return true;
  return runtime === "v3" && sesion.permissions?.settings === "write";
}
