import { useSyncExternalStore } from "react";

import type { DestinoMenu } from "./menu-panel";

/**
 * Pantalla activa del panel (HU-BILL-15): el shell la registra en cada navegación para que
 * piezas fuera de `MenuPanelProvider` (la hoja de notificaciones) puedan saber si el usuario
 * está en Consumo y plan y ocultar el recordatorio de upgrade.
 */
let actual: DestinoMenu | null = null;
const oyentes = new Set<() => void>();

export function registrarPantallaActiva(destino: DestinoMenu | null): void {
  actual = destino;
  oyentes.forEach((notificar) => notificar());
}

export function usePantallaActiva(): DestinoMenu | null {
  return useSyncExternalStore(
    (notificar) => {
      oyentes.add(notificar);
      return () => {
        oyentes.delete(notificar);
      };
    },
    () => actual,
    () => null,
  );
}

/** ¿La pantalla activa es Consumo y plan? Allí no se recuerda mejorar el plan. */
export function esPantallaDePlan(destino: DestinoMenu | null): boolean {
  return destino?.modulo === "negocio";
}
