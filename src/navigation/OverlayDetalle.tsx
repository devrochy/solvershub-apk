import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { ClienteScreen } from "../screens/ClienteScreen";
import { CarteraDetalleScreen } from "../screens/CarteraDetalleScreen";
import type { PantallaActiva } from "./pantalla-activa-context";
import { VentanaCerrarConSwipe } from "./VentanaCerrarConSwipe";
import { useTheme } from "../theme/theme-context";
import type { ColoresTema } from "../theme/theme";

export interface OverlayDetalleProps {
  pantalla?: PantallaActiva | null;
  onCerrar(): void;
}

/**
 * B1: renderiza la pantalla de detalle (cliente/préstamo/cartera) como una capa
 * sobre el contenido del tab. Vive dentro de cada screen del Tab, así que el
 * CustomTabBar (que se renderiza fuera del área de contenido) queda siempre
 * visible.
 *
 * La capa se cierra deslizando de izquierda a derecha: al superar el umbral se
 * anima la salida (translateX hacia fuera de pantalla) revelando el tab que hay
 * debajo, y al completar se llama `onCerrar`. El back físico de Android lo
 * gestiona ContenidoTab (cierra la pantalla activa antes que la app), por eso
 * el detalle ya no muestra su propio botón atrás.
 */
export function OverlayDetalle({ pantalla, onCerrar }: OverlayDetalleProps) {
  const { colores } = useTheme();
  const styles = useMemo(() => crearEstilos(colores), [colores]);
  if (!pantalla) {
    return null;
  }

  switch (pantalla.tipo) {
    case "cliente":
      return (
        <VentanaCerrarConSwipe testID="overlay-detalle" style={styles.capa} onCerrar={onCerrar}>
          <ClienteScreen
            carteraId={pantalla.carteraId}
            clienteId={pantalla.clienteId}
            nombre={pantalla.nombre}
            latitud={pantalla.latitud}
            longitud={pantalla.longitud}
            latitudDomicilio={pantalla.latitudDomicilio}
            longitudDomicilio={pantalla.longitudDomicilio}
            prestamoAutoSeleccionado={pantalla.prestamoAutoSeleccionado}
          />
        </VentanaCerrarConSwipe>
      );
    case "cartera":
      return (
        <VentanaCerrarConSwipe testID="overlay-detalle" style={styles.capa} onCerrar={onCerrar}>
          <CarteraDetalleScreen
            carteraId={pantalla.carteraId}
            carteraNombre={pantalla.carteraNombre}
            onCerrar={onCerrar}
          />
        </VentanaCerrarConSwipe>
      );
    // "prestamo" no tiene vista propia en el overlay (código muerto hoy: nadie
    // abre {tipo:"prestamo"}). Se devuelve null sin llamar onCerrar para no
    // ejecutar side-effects en el render; si se habilitara el tipo, deberá
    // añadirse aquí su case.
    default:
      return null;
  }
}

function crearEstilos(c: ColoresTema) {
  return StyleSheet.create({
    capa: {
      ...StyleSheet.absoluteFill,
      backgroundColor: c.fondo,
    },
  });
}