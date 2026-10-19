import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { emitirNavegacion } from "./navegacion-evento";

/**
 * Pedido de abrir una pantalla en una pestaña interna concreta (cajón del panel,
 * push, Búsqueda). `n` distingue dos pedidos seguidos a la misma pestaña: si el
 * usuario cambió de pestaña a mano y vuelve a tocar la misma entrada del cajón,
 * la pantalla tiene que volver igual.
 */
export interface SolicitudPestana {
  pestana: string;
  n: number;
}

/**
 * Estado de pestaña de una pantalla con pestañas internas. Arranca en
 * `porDefecto` y se re-sincroniza cada vez que llega una solicitud nueva
 * (`n` distinto); ignora pestañas fuera de `validas` (p. ej. sin permiso).
 * Ajusta el estado durante el render (patrón de React para derivar estado de
 * una prop), sin `useEffect`.
 */
export function usePestanaInicial<T extends string>(
  porDefecto: T,
  validas: readonly T[],
  solicitud?: SolicitudPestana,
): [T, Dispatch<SetStateAction<T>>] {
  const esValida = (p: string): p is T => (validas as readonly string[]).includes(p);
  const [pestana, setPestana] = useState<T>(() =>
    solicitud && esValida(solicitud.pestana) ? solicitud.pestana : porDefecto,
  );
  const [atendida, setAtendida] = useState<number | undefined>(solicitud?.n);

  if (solicitud && solicitud.n !== atendida) {
    setAtendida(solicitud.n);
    if (esValida(solicitud.pestana)) {
      setPestana(solicitud.pestana);
    }
  }

  return [pestana, setPestana];
}

/** Pestaña de la entrada del cajón: módulo del shell (`tab`), pestaña interna y nombre. */
export interface PestanaDeEntrada {
  tab: string;
  pestana: string;
  label: string;
}

/**
 * Entrada del cajón por la que se llegó a una pantalla (menú v2, HU-UX-11):
 * sus pestañas permitidas, sin repetir. Varias entradas comparten pantalla
 * (Equipo y Configuración; Clientes y Conversaciones) y cada una muestra solo
 * las suyas; una entrada puede tener pestañas de otra pantalla (Configuración ›
 * Mensajes fallidos), que se abren por el bus de navegación.
 */
export interface EntradaPestanas {
  id: string;
  pestanas: readonly PestanaDeEntrada[];
}

export interface PestanasDeEntrada<T extends string> {
  /** Pestaña en pantalla: siempre una de `propias`. */
  pestana: T;
  setPestana: Dispatch<SetStateAction<T>>;
  /** Pestañas de esta pantalla que la entrada muestra, en el orden de la pantalla. */
  propias: readonly T[];
  /** Pestañas de la entrada que viven en otra pantalla. */
  ajenas: readonly PestanaDeEntrada[];
}

/**
 * Pestañas de una pantalla filtradas por la entrada del cajón (`entrada`); sin
 * entrada, todas. Si la entrada cambia sin una solicitud nueva (back del
 * sistema) y la pestaña elegida ya no es de la entrada, muestra la primera.
 */
export function usePestanasDeEntrada<T extends string>(
  tab: string,
  porDefecto: T,
  todas: readonly T[],
  solicitud?: SolicitudPestana,
  entrada?: EntradaPestanas,
): PestanasDeEntrada<T> {
  const propias = useMemo(() => {
    if (!entrada) return todas;
    const filtradas = todas.filter((p) => entrada.pestanas.some((e) => e.tab === tab && e.pestana === p));
    return filtradas.length > 0 ? filtradas : todas;
  }, [tab, todas, entrada]);
  const ajenas = useMemo(() => entrada?.pestanas.filter((e) => e.tab !== tab) ?? [], [tab, entrada]);
  const [pestana, setPestana] = usePestanaInicial<T>(
    propias.includes(porDefecto) ? porDefecto : propias[0],
    propias,
    solicitud,
  );
  return { pestana: propias.includes(pestana) ? pestana : propias[0], setPestana, propias, ajenas };
}

/** Abre una pestaña de la entrada que vive en otra pantalla. */
export function abrirPestanaAjena(p: PestanaDeEntrada): void {
  emitirNavegacion({ tab: p.tab, pestana: p.pestana });
}
