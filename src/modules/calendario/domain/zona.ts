/**
 * Zona horaria de la agenda (HU-CAL-08). El backend devuelve los eventos en UTC y
 * la zona del negocio; la grilla y las hojas hablan en hora local del negocio.
 * Se usa `Intl` (Hermes y Node lo traen) para no agregar una librería de fechas.
 */

const FORMATOS = new Map<string, Intl.DateTimeFormat>();

function formateador(zona: string): Intl.DateTimeFormat {
  let f = FORMATOS.get(zona);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone: zona,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      weekday: "short",
    });
    FORMATOS.set(zona, f);
  }
  return f;
}

export interface PartesEnZona {
  anio: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  /** Clave `YYYY-MM-DD` de la fecha local del negocio. */
  clave: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function claveDe(anio: number, mes: number, dia: number): string {
  return `${anio}-${pad(mes)}-${pad(dia)}`;
}

/** Fecha/hora de un instante (Date o ISO) en la zona del negocio. */
export function partesEnZona(valor: Date | string, zona: string): PartesEnZona {
  const fecha = typeof valor === "string" ? new Date(valor) : valor;
  const partes = formateador(zona).formatToParts(fecha);
  const valorDe = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "0";
  const anio = Number(valorDe("year"));
  const mes = Number(valorDe("month"));
  const dia = Number(valorDe("day"));
  const hora = Number(valorDe("hour"));
  const minuto = Number(valorDe("minute"));
  return { anio, mes, dia, hora, minuto, clave: claveDe(anio, mes, dia) };
}

/** `YYYY-MM-DD` de la fecha local del negocio. */
export function claveDia(valor: Date | string, zona: string): string {
  return partesEnZona(valor, zona).clave;
}

/** `HH:MM` de la hora local del negocio. */
export function horaDe(valor: Date | string, zona: string): string {
  const p = partesEnZona(valor, zona);
  return `${pad(p.hora)}:${pad(p.minuto)}`;
}

/** Minutos desde la medianoche local del negocio. */
export function minutosDelDia(valor: Date | string, zona: string): number {
  const p = partesEnZona(valor, zona);
  return p.hora * 60 + p.minuto;
}

export function hoyEnZona(zona: string, ahora = new Date()): string {
  return claveDia(ahora, zona);
}

/** Lunes de la semana de una clave `YYYY-MM-DD`. */
export function inicioDeSemana(clave: string): string {
  const [anio, mes, dia] = clave.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  const desplazamiento = (fecha.getUTCDay() + 6) % 7;
  fecha.setUTCDate(fecha.getUTCDate() - desplazamiento);
  return claveDe(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, fecha.getUTCDate());
}

export function sumarDias(clave: string, dias: number): string {
  const [anio, mes, dia] = clave.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return claveDe(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, fecha.getUTCDate());
}

export interface DiaDeSemana {
  clave: string;
  anio: number;
  mes: number;
  dia: number;
  /** 0 = domingo … 6 = sábado. */
  diaSemana: number;
}

export function diasDeSemana(inicio: string): DiaDeSemana[] {
  return Array.from({ length: 7 }, (_, i) => {
    const clave = sumarDias(inicio, i);
    const [anio, mes, dia] = clave.split("-").map(Number);
    const diaSemana = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
    return { clave, anio, mes, dia, diaSemana };
  });
}

const NOMBRES_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

export function nombreDiaCorto(diaSemana: number): string {
  return NOMBRES_CORTOS[diaSemana] ?? "";
}

/** «octubre de 2026» (o «octubre 2026») para el encabezado de la tira. */
export function mesYAnio(clave: string): string {
  const [anio, mes] = clave.split("-").map(Number);
  const texto = new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(anio, mes - 1, 1)));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Fecha larga para la hoja: «lun 27 oct». */
export function fechaCorta(clave: string): string {
  const [anio, mes, dia] = clave.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(fecha);
}

/**
 * Offset (ms) entre la hora de pared de `zona` en el instante `ts` y UTC.
 * Se calcula con `Intl` para respetar el horario de verano.
 */
function offsetMs(ts: number, zona: string): number {
  const redondeado = Math.floor(ts / 60_000) * 60_000;
  const p = partesEnZona(new Date(redondeado), zona);
  const comoUtc = Date.UTC(p.anio, p.mes - 1, p.dia, p.hora, p.minuto);
  return comoUtc - redondeado;
}

/**
 * Hora de pared del negocio (`anio/mes/dia/hora/minuto`) → ISO UTC.
 * Dos pasadas para resolver el cambio de horario de verano.
 */
export function aUtcDesdeZona(
  anio: number,
  mes: number,
  dia: number,
  hora: number,
  minuto: number,
  zona: string,
): string {
  const objetivo = Date.UTC(anio, mes - 1, dia, hora, minuto);
  let ts = objetivo;
  for (let i = 0; i < 2; i += 1) {
    ts = objetivo - offsetMs(ts, zona);
  }
  return new Date(ts).toISOString();
}

/** `HH:MM` → minutos. */
export function horaAMinutos(hora: string): number {
  const [h = "0", m = "0"] = hora.split(":");
  return Number(h) * 60 + Number(m);
}

export function minutosAHora(minutos: number): string {
  const normal = ((minutos % 1440) + 1440) % 1440;
  return `${pad(Math.floor(normal / 60))}:${pad(normal % 60)}`;
}

/**
 * `Date` con componentes locales del dispositivo iguales a la hora de pared del
 * negocio: es lo que recibe el selector nativo, que trabaja en hora del sistema.
 */
export function fechaDePared(partes: Pick<PartesEnZona, "anio" | "mes" | "dia" | "hora" | "minuto">): Date {
  return new Date(partes.anio, partes.mes - 1, partes.dia, partes.hora, partes.minuto, 0, 0);
}

/** Componentes de un `Date` del selector, que representan la hora de pared del negocio. */
export function partesDePared(fecha: Date): { anio: number; mes: number; dia: number; hora: number; minuto: number } {
  return {
    anio: fecha.getFullYear(),
    mes: fecha.getMonth() + 1,
    dia: fecha.getDate(),
    hora: fecha.getHours(),
    minuto: fecha.getMinutes(),
  };
}

/** ISO UTC a partir de la hora de pared de un `Date` del selector. */
export function isoDePared(fecha: Date, zona: string): string {
  const p = partesDePared(fecha);
  return aUtcDesdeZona(p.anio, p.mes, p.dia, p.hora, p.minuto, zona);
}

/** Duración en minutos entre dos ISO. */
export function duracionMinutos(inicio: string, fin: string): number {
  return Math.max(0, Math.round((new Date(fin).getTime() - new Date(inicio).getTime()) / 60_000));
}
