import { useCallback, useRef } from "react";

/** Listas de frases (frases prohibidas, palabras de escalamiento y de baja): reglas de alta y duplicados. */

export const MAX_LARGO_FRASE = 300;

/** Para comparar: sin tildes, mayúsculas ni signos, con espacios simples. «No, gracias» = «no gracias». */
export function normalizarFrase(texto: string): string {
  return texto
    .normalize("NFKD")
    .replace(/\p{Mn}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

/**
 * Clave para decidir si dos frases son la misma: la normalizada o, si queda vacía (solo emojis o
 * símbolos), el texto recortado en minúsculas. Así «👍» y «🙏» no se toman como repetidas.
 */
export function claveDeFrase(texto: string): string {
  return normalizarFrase(texto) || texto.trim().toLowerCase();
}

/** Resultado de intentar agregar una frase: la lista nueva, o `null` si no cambia (corta, repetida o llena). */
export function agregarFrase(frases: string[], escrita: string, minLargo: number, max: number): string[] | null {
  const texto = escrita.trim();
  if (texto.length < minLargo || frases.length >= max) return null;
  const clave = claveDeFrase(texto);
  if (frases.some((f) => claveDeFrase(f) === clave)) return null;
  return [...frases, texto.slice(0, MAX_LARGO_FRASE)];
}

export type ResultadoDeCompletar = {
  /** La lista con el texto pendiente al final, o `null` si no cambia (en blanco o repetida). */
  frases: string[] | null;
  error?: string;
};

/**
 * Suma el texto pendiente a la lista con las mismas reglas que el botón Agregar. Una frase corta o
 * una lista llena no se descartan en silencio: devuelven un aviso para mostrarlo junto al campo.
 */
export function completarLista(frases: string[], pendiente: string, minLargo: number, max: number): ResultadoDeCompletar {
  const texto = pendiente.trim();
  if (!texto) return { frases: null };
  const clave = claveDeFrase(texto);
  if (frases.some((f) => claveDeFrase(f) === clave)) return { frases: null };
  if (texto.length < minLargo) {
    return {
      frases: null,
      error: `Tienes texto sin agregar («${texto}»): mínimo ${minLargo} caracteres. Complétalo y pulsa Agregar, o bórralo para guardar.`,
    };
  }
  if (frases.length >= max) {
    return { frases: null, error: `Tienes texto sin agregar («${texto}») y la lista ya llegó al máximo de ${max}. Bórralo para guardar.` };
  }
  return { frases: [...frases, texto.slice(0, MAX_LARGO_FRASE)] };
}

/** Texto escrito en una lista de frases que todavía no se agregó, con las reglas de esa lista. */
export type Pendiente = {
  texto: string;
  minLargo: number;
  max: number;
  /** Deja el campo en blanco (cuando el formulario ya sumó el texto a la lista). */
  limpiar: () => void;
};

export type CompletarTodas = {
  /** Listas que ganaron el texto pendiente, por id de la lista. */
  listas: Record<string, string[]>;
  /** Avisos de las listas cuyo texto pendiente no se puede agregar, por id de la lista. */
  errores: Record<string, string>;
  /** Deja en blanco los campos que ya se sumaron (o eran repetidos). Llamar solo si se va a guardar. */
  limpiar: () => void;
};

/**
 * Lleva la cuenta del texto escrito y no agregado en las listas de frases de un formulario, para
 * sumarlo al guardar en vez de perderlo. Cada lista se enlaza con `registrar(id)` (su `onPendiente`)
 * y al guardar se llama `completar` con la lectura de las listas actuales.
 */
export function usePendientes() {
  const pendientes = useRef(new Map<string, Pendiente>());
  const enlaces = useRef(new Map<string, (p: Pendiente | null) => void>());

  const registrar = useCallback((id: string) => {
    let enlace = enlaces.current.get(id);
    if (!enlace) {
      enlace = (p) => {
        if (p && p.texto.trim()) pendientes.current.set(id, p);
        else pendientes.current.delete(id);
      };
      enlaces.current.set(id, enlace);
    }
    return enlace;
  }, []);

  /** `leer(id)` devuelve la lista de ese id, o `undefined` si el formulario no la guarda (se ignora). */
  const completar = useCallback((leer: (id: string) => string[] | undefined): CompletarTodas => {
    const listas: Record<string, string[]> = {};
    const errores: Record<string, string> = {};
    const aLimpiar: Pendiente[] = [];
    for (const [id, p] of pendientes.current) {
      const actual = leer(id);
      if (!actual) continue;
      const r = completarLista(actual, p.texto, p.minLargo, p.max);
      if (r.error) {
        errores[id] = r.error;
        continue;
      }
      if (r.frases) listas[id] = r.frases;
      aLimpiar.push(p);
    }
    return { listas, errores, limpiar: () => aLimpiar.forEach((p) => p.limpiar()) };
  }, []);

  return { registrar, completar };
}
