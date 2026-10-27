/** Días y horas en que el asistente puede agendar (config `business_hours`). */

export const DIAS_SEMANA = [
  { key: "mon", label: "Lunes" },
  { key: "tue", label: "Martes" },
  { key: "wed", label: "Miércoles" },
  { key: "thu", label: "Jueves" },
  { key: "fri", label: "Viernes" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
] as const;

export type Horario = Record<string, string>;

/** Acepta el JSON guardado (string) o el objeto ya parseado; ignora lo que no sea `HH:MM-HH:MM`. */
export function parsearHorario(raw: unknown): Horario {
  let data: unknown = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw || "{}");
    } catch {
      data = {};
    }
  }
  const salida: Horario = {};
  if (data && typeof data === "object") {
    for (const [clave, valor] of Object.entries(data as Record<string, unknown>)) {
      if (typeof valor === "string") {
        salida[clave] = valor;
      }
    }
  }
  return salida;
}

/** Solo los días con rango, como lo guarda el backend. */
export function serializarHorario(horario: Horario): string {
  const limpio: Horario = {};
  for (const [clave, valor] of Object.entries(horario)) {
    if (valor && valor.trim()) {
      limpio[clave] = valor.trim();
    }
  }
  return JSON.stringify(limpio);
}

export function partirRango(valor: string): { inicio: string; fin: string } {
  const [inicio = "", fin = ""] = (valor || "").split("-");
  return { inicio, fin };
}

/** `HH:MM` válido en 24 h (00:00–23:59). */
export function horaValida(valor: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(valor.trim());
}

/** Rango completo de un día, o `null` si está cerrado o mal formado. */
export function rangoValido(valor: string): boolean {
  const { inicio, fin } = partirRango(valor);
  return horaValida(inicio) && horaValida(fin) && inicio < fin;
}
