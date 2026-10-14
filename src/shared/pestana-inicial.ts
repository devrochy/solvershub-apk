import { useState, type Dispatch, type SetStateAction } from "react";

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
