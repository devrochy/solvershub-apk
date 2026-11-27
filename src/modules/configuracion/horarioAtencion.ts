/**
 * Franjas del horario de atención de Ajustes (`business_ranges` de la identidad).
 *
 * El índice del día es el del backend (ADR-0051, `within_business_hours`): 0=lunes … 6=domingo,
 * el criterio de `datetime.weekday()` de Python. No es el de `Date.getDay()` (0=domingo): con ese,
 * un horario cargado como «lunes» lo aplicaba el bot el martes.
 */
export const DIAS_FRANJA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

export type Franja = { day: number; from: string; to: string };

/** Nombres largos para los mensajes de error («el cierre del miércoles…»). */
const DIAS_LARGOS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"] as const;

function aMinutos(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const horas = Number(m[1]);
  const minutos = Number(m[2]);
  if (horas > 23 || minutos > 59) return null;
  return horas * 60 + minutos;
}

export type ErrorFranja = { day: number; message: string };

/**
 * Errores que el formulario debe bloquear antes de guardar: cierre antes de la apertura y
 * franjas que se cruzan dentro del mismo día. El índice es el del backend (0 = lunes).
 */
export function erroresDeFranjas(rangos: unknown): ErrorFranja[] {
  const porDia = new Map<number, { from: string; to: string }[]>();
  for (const r of Array.isArray(rangos) ? rangos : []) {
    if (!r || typeof r !== "object") continue;
    const day = Number((r as { day?: unknown }).day);
    const from = String((r as { from?: unknown }).from ?? "");
    const to = String((r as { to?: unknown }).to ?? "");
    if (!Number.isInteger(day) || day < 0 || day > 6) continue;
    porDia.set(day, [...(porDia.get(day) ?? []), { from, to }]);
  }

  const errores: ErrorFranja[] = [];
  for (const [day, franjas] of [...porDia].sort(([a], [b]) => a - b)) {
    const ordenadas = [...franjas].sort((a, b) => (aMinutos(a.from) ?? 0) - (aMinutos(b.from) ?? 0));
    for (const f of ordenadas) {
      const desde = aMinutos(f.from);
      const hasta = aMinutos(f.to);
      if (desde === null || hasta === null || hasta <= desde) {
        errores.push({
          day,
          message: `El cierre del ${DIAS_LARGOS[day]} debe ser después de la apertura.`,
        });
        break;
      }
    }
    if (errores.some((e) => e.day === day)) continue;
    for (let i = 1; i < ordenadas.length; i++) {
      const anterior = aMinutos(ordenadas[i - 1].to);
      const siguiente = aMinutos(ordenadas[i].from);
      if (anterior !== null && siguiente !== null && siguiente < anterior) {
        errores.push({
          day,
          message: `Las franjas del ${DIAS_LARGOS[day]} se cruzan. Ajusta la hora de cierre o la de apertura.`,
        });
        break;
      }
    }
  }
  return errores;
}

/** Leyenda de los índices: «0 Lun · 1 Mar · … · 6 Dom». */
export const leyendaDias = (): string => DIAS_FRANJA.map((dia, i) => `${i} ${dia}`).join(" · ");

/** Franjas a texto editable, una por línea: «día HH:MM-HH:MM». */
export const aRangosTexto = (rangos: Record<string, unknown>[]): string =>
  rangos.map((r) => `${r.day} ${r.from}-${r.to}`).join("\n");

/** Texto editable a franjas. Ignora las líneas que no tienen la forma «día HH:MM-HH:MM». */
export const textoARangos = (texto: string): Record<string, unknown>[] => {
  const out: Record<string, unknown>[] = [];
  for (const linea of texto.split("\n")) {
    const m = /^([0-6])\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/.exec(linea.trim());
    if (m) out.push({ day: Number(m[1]), from: m[2], to: m[3] });
  }
  return out;
};
