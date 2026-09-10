import { OverlayDetalle } from "./OverlayDetalle";
import { TrayectosOverlayHost } from "./TrayectosOverlayHost";
import { usePantallaActiva } from "./pantalla-activa-context";

/**
 * Capas a pantalla completa que se montan **encima** de la capa de pestañas
 * (detalle de cliente/préstamo/ruta y overlay de trayectos). Al ser hermanas por
 * encima, su gesto de swipe no compite con el de la pestaña.
 */
export function OverlaysActivos() {
  const { pantalla, cerrar } = usePantallaActiva();
  return (
    <>
      <OverlayDetalle pantalla={pantalla} onCerrar={cerrar} />
      <TrayectosOverlayHost />
    </>
  );
}
