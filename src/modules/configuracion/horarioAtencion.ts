/**
 * Franjas del horario de atención de Ajustes (`business_ranges` de la identidad).
 *
 * El índice del día es el del backend (ADR-0051, `within_business_hours`): 0=lunes … 6=domingo,
 * el criterio de `datetime.weekday()` de Python. No es el de `Date.getDay()` (0=domingo): con ese,
 * un horario cargado como «lunes» lo aplicaba el bot el martes.
 */
export const DIAS_FRANJA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

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
