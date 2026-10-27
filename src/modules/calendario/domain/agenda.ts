/**
 * Lógica pura de la Agenda (HU-CAL-08 sobre HU-UX-08): colores y códigos de los
 * tipos de cita, agendas visibles y forma de los eventos que devuelve
 * `/pack/calendar/events`. Los componentes y la pantalla la consumen; aquí se
 * prueba sin React.
 */

/** Paleta categórica del sistema de diseño (SPEC-29), en orden fijo. */
export const COLORES_TIPO = [
  { valor: "cat-1", nombre: "Azul" },
  { valor: "cat-2", nombre: "Dorado" },
  { valor: "cat-3", nombre: "Turquesa" },
  { valor: "cat-4", nombre: "Violeta" },
] as const;

export type ColorTipo = (typeof COLORES_TIPO)[number]["valor"];

export const CODIGO_MAX = 6;

export function esColorTipo(valor: unknown): valor is ColorTipo {
  return COLORES_TIPO.some((c) => c.valor === valor);
}

/** Número de la serie (`1…4`) del color, para `dataCat1…4` del tema. */
export function serieDeColor(color: string | null | undefined): 1 | 2 | 3 | 4 | null {
  return esColorTipo(color) ? (Number(color.slice(4)) as 1 | 2 | 3 | 4) : null;
}

/** Las 3 primeras letras o cifras del nombre en mayúsculas, como en el backend. */
export function codigoPorDefecto(nombre: string): string {
  return Array.from(nombre)
    .filter((c) => /[\p{L}\p{N}]/u.test(c))
    .slice(0, 3)
    .join("")
    .toUpperCase();
}

/** Código como lo guarda el backend: sin espacios a los lados, mayúsculas y hasta 6. */
export function normalizarCodigo(valor: string): string {
  return valor.trim().toUpperCase().slice(0, CODIGO_MAX);
}

/** Con 4 colores, desde la 5.ª agenda se repiten: la inicial del nombre las distingue. */
export function inicialDeAgenda(nombre: string): string {
  return (
    Array.from(nombre.trim().normalize("NFD").replace(/\p{M}/gu, "")).find((c) => /[\p{L}\p{N}]/u.test(c))?.toUpperCase() ??
    "?"
  );
}

export type TipoLeyenda = {
  id: string;
  name: string;
  color: string;
  codigo: string;
  /** Solo viene en `/pack/calendar/types`, no en la leyenda de `/events`. */
  duration_minutes?: number | null;
};

/** Agenda tal como llega en la leyenda de `/events` (HU-CAL-08). */
export type LeyendaAgenda = {
  id: string;
  name: string;
  color: string;
  is_default?: boolean;
  active?: boolean;
  disponible?: boolean;
};

/** Evento de `/pack/calendar/events` (citas + bloqueos). */
export type EventoAgenda = {
  id: string;
  title: string;
  start: string;
  end: string;
  kind: "appointment" | "block";
  status: string;
  source: "local" | "google";
  color: string;
  can_cancel: boolean;
  attendee_email: string;
  notes: string;
  appointment_type_id: string;
  tipo_color?: string;
  tipo_codigo?: string;
  /** Agenda del evento (HU-CAL-08); vacío en negocios sin agendas. */
  calendar_id?: string;
  calendar_color?: string;
};

/** Lo que `/events` trae además de las citas: leyenda de tipos y de agendas. */
export type DatosDeEventos = {
  events: EventoAgenda[];
  tipos: TipoLeyenda[];
  calendars: LeyendaAgenda[];
  multi_activo: boolean;
  timezone: string;
};

/** Cómo se colorea la grilla: por agenda si se ven varias, por tipo de cita si se ve una. */
export type ColorPor = "tipo" | "agenda";

/** Serie categórica de un evento, según el modo de color vigente. */
export function serieDeEvento(e: EventoAgenda, colorPor: ColorPor): 1 | 2 | 3 | 4 | null {
  if (e.kind === "block") return null;
  return serieDeColor(colorPor === "agenda" ? e.calendar_color : e.tipo_color);
}

/** Título visible de una cita: código del tipo delante, si lo tiene. */
export function tituloDeEvento(e: EventoAgenda): string {
  const titulo = e.title || "Cita";
  return e.kind === "appointment" && e.tipo_codigo ? `${e.tipo_codigo} · ${titulo}` : titulo;
}

/**
 * Agendas visibles: las guardadas por el usuario que todavía existen; sin guardado (o si ya
 * no queda ninguna) se ven todas. Una agenda nueva que el usuario no conocía se muestra.
 */
export function agendasVisibles(guardadas: string[] | null, todas: string[]): string[] {
  if (!guardadas) return todas;
  const conocidas = guardadas.filter((id) => todas.includes(id));
  return conocidas.length ? conocidas : todas;
}

/** «a, b ,, c» → ["a","b","c"] (sin repetidos, como los guarda el backend). */
export function aliasesDeTexto(texto: string): string[] {
  const vistos = new Set<string>();
  for (const parte of texto.split(",")) {
    const alias = parte.trim();
    if (alias) vistos.add(alias);
  }
  return Array.from(vistos);
}

export type Borrador = { start: string; end: string };

/** Próxima hora en punto y una hora de duración, para «Nueva cita» sin elegir un hueco. */
export function borradorProximaHora(ahora = new Date()): Borrador {
  const inicio = new Date(ahora);
  inicio.setMinutes(0, 0, 0);
  inicio.setHours(inicio.getHours() + 1);
  return { start: inicio.toISOString(), end: new Date(inicio.getTime() + 3_600_000).toISOString() };
}
