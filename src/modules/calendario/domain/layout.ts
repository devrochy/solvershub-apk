/**
 * Cálculo de la línea del día (HU-CAL-08): hora visible, alto y reparto lateral de
 * citas solapadas. Lógica pura para probar la geometría sin montar la pantalla.
 */

import type { EventoAgenda } from "./agenda";
import { minutosDelDia } from "./zona";

/** Alto de una hora en la línea del día (dp). */
export const ALTO_HORA = 64;
/** Duración mínima de una cita al redimensionar (min). */
export const MINUTOS_MINIMOS = 15;
/** Paso del arrastre y del redimensionado (min). */
export const PASO_MINUTOS = 15;

export type RangoDia = { inicio: number; fin: number };

export interface VistaEvento {
  evento: EventoAgenda;
  /** Minutos desde la medianoche local, recortados al día. */
  inicio: number;
  fin: number;
  top: number;
  height: number;
  /** 0…1 dentro del ancho disponible (citas solapadas). */
  izquierda: number;
  ancho: number;
}

export interface VistaDia {
  citas: VistaEvento[];
  bloques: VistaEvento[];
}

const clamp = (valor: number, min: number, max: number) => Math.min(max, Math.max(min, valor));

/** Minutos del día en que empieza y termina un evento (fin puede pasar de 1440). */
function extremos(e: EventoAgenda, zona: string): { inicio: number; fin: number } {
  const inicio = minutosDelDia(e.start, zona);
  const duracion = Math.max(
    0,
    Math.round((new Date(e.end).getTime() - new Date(e.start).getTime()) / 60_000),
  );
  return { inicio, fin: inicio + duracion };
}

/**
 * Rango visible: 06:00–22:00 por defecto, ampliado a la hora completa anterior y
 * posterior de los eventos que se salgan.
 */
export function rangoDelDia(eventos: EventoAgenda[], zona: string, minimo = 360, maximo = 1320): RangoDia {
  let inicio = minimo;
  let fin = maximo;
  for (const evento of eventos) {
    const { inicio: ini, fin: f } = extremos(evento, zona);
    inicio = Math.min(inicio, Math.floor(ini / 60) * 60);
    fin = Math.max(fin, Math.ceil(f / 60) * 60);
  }
  return { inicio: clamp(inicio, 0, 1440), fin: clamp(fin, 0, 1440) };
}

export function snapMinutos(minutos: number, paso = PASO_MINUTOS): number {
  return Math.round(minutos / paso) * paso;
}

/**
 * Mueve un rango conservando la duración y sin salirse del día visible.
 * Devuelve minutos desde la medianoche local.
 */
export function moverRango(
  inicio: number,
  fin: number,
  delta: number,
  rango: RangoDia,
): { inicio: number; fin: number } {
  const duracion = Math.max(MINUTOS_MINIMOS, fin - inicio);
  const nuevoInicio = clamp(snapMinutos(inicio + delta), rango.inicio, rango.fin - duracion);
  return { inicio: nuevoInicio, fin: nuevoInicio + duracion };
}

/** Cambia el fin sin bajar de la duración mínima ni salir del día visible. */
export function redimensionarRango(
  inicio: number,
  fin: number,
  delta: number,
  rango: RangoDia,
): { inicio: number; fin: number } {
  const nuevoFin = clamp(snapMinutos(fin + delta), inicio + MINUTOS_MINIMOS, rango.fin);
  return { inicio, fin: nuevoFin };
}

function posicion(
  evento: EventoAgenda,
  zona: string,
  rango: RangoDia,
  altoHora: number,
): VistaEvento | null {
  const { inicio, fin } = extremos(evento, zona);
  const recortadoInicio = clamp(inicio, rango.inicio, rango.fin);
  const recortadoFin = clamp(fin, rango.inicio, rango.fin);
  if (recortadoFin <= recortadoInicio) return null;
  const factor = altoHora / 60;
  return {
    evento,
    inicio: recortadoInicio,
    fin: recortadoFin,
    top: (recortadoInicio - rango.inicio) * factor,
    height: Math.max(18, (recortadoFin - recortadoInicio) * factor - 2),
    izquierda: 0,
    ancho: 1,
  };
}

/** Reparte en columnas un grupo de citas que se solapan. */
function repartirColumnas(citas: VistaEvento[]): VistaEvento[] {
  const orden = [...citas].sort((a, b) => a.inicio - b.inicio || a.fin - b.fin);
  const salida: VistaEvento[] = [];
  let grupo: VistaEvento[] = [];
  let finGrupo = -1;

  const cerrar = () => {
    if (grupo.length === 0) return;
    const fines: number[] = [];
    const conColumna = grupo.map((cita) => {
      let columna = fines.findIndex((fin) => fin <= cita.inicio);
      if (columna === -1) {
        columna = fines.length;
        fines.push(cita.fin);
      } else {
        fines[columna] = cita.fin;
      }
      return { cita, columna };
    });
    const total = Math.max(1, fines.length);
    for (const { cita, columna } of conColumna) {
      salida.push({ ...cita, izquierda: columna / total, ancho: 1 / total });
    }
    grupo = [];
    finGrupo = -1;
  };

  for (const cita of orden) {
    if (grupo.length > 0 && cita.inicio >= finGrupo) cerrar();
    grupo.push(cita);
    finGrupo = Math.max(finGrupo, cita.fin);
  }
  cerrar();
  return salida;
}

/**
 * Eventos de un día ya posicionados. Los bloqueos van a todo el ancho y detrás;
 * las citas se reparten en columnas cuando se solapan.
 */
export function vistaDelDia(
  eventos: EventoAgenda[],
  zona: string,
  rango: RangoDia,
  altoHora = ALTO_HORA,
): VistaDia {
  const citas: VistaEvento[] = [];
  const bloques: VistaEvento[] = [];
  for (const evento of eventos) {
    const pos = posicion(evento, zona, rango, altoHora);
    if (!pos) continue;
    if (evento.kind === "block") bloques.push(pos);
    else citas.push(pos);
  }
  return { citas: repartirColumnas(citas), bloques };
}
