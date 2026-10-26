import { createContext, useContext } from "react";

/**
 * Puente entre el centro de notificaciones (módulo `notificaciones`, que lo monta) y las
 * cabeceras de las pantallas (que dibujan la campana y no conocen el módulo). Sin proveedor
 * (login, campo, tests) la campana no se muestra.
 */
export interface CentroNotificaciones {
  /** Hay un centro montado: la campana se dibuja. */
  disponible: boolean;
  noLeidas: number;
  abrir(): void;
}

const SIN_CENTRO: CentroNotificaciones = { disponible: false, noLeidas: 0, abrir: () => undefined };

export const CentroNotificacionesContext = createContext<CentroNotificaciones>(SIN_CENTRO);

export function useCentroNotificaciones(): CentroNotificaciones {
  return useContext(CentroNotificacionesContext);
}
