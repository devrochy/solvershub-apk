import { StyleSheet, View } from "react-native";
import { ClienteScreen } from "../screens/ClienteScreen";
import { RutaDetalleScreen } from "../screens/RutaDetalleScreen";
import type { PantallaActiva } from "./pantalla-activa-context";

export interface OverlayDetalleProps {
  pantalla?: PantallaActiva | null;
  onCerrar(): void;
}

/**
 * B1: renderiza la pantalla de detalle (cliente/préstamo/ruta) como una capa
 * sobre el contenido del tab. Vive dentro de cada screen del Tab, así que el
 * CustomTabBar (que se renderiza fuera del área de contenido) queda siempre
 * visible. El propio screen de detalle muestra su header con el back.
 */
export function OverlayDetalle({ pantalla, onCerrar }: OverlayDetalleProps) {
  if (!pantalla) {
    return null;
  }

  switch (pantalla.tipo) {
    case "cliente":
      return (
        <View style={styles.capa}>
          <ClienteScreen
            rutaId={pantalla.rutaId}
            clienteId={pantalla.clienteId}
            nombre={pantalla.nombre}
            latitud={pantalla.latitud}
            longitud={pantalla.longitud}
            latitudDomicilio={pantalla.latitudDomicilio}
            longitudDomicilio={pantalla.longitudDomicilio}
            prestamoAutoSeleccionado={pantalla.prestamoAutoSeleccionado}
            onCerrar={onCerrar}
          />
        </View>
      );
    case "ruta":
      return (
        <View style={styles.capa}>
          <RutaDetalleScreen
            rutaId={pantalla.rutaId}
            rutaNombre={pantalla.rutaNombre}
            onCerrar={onCerrar}
          />
        </View>
      );
    // "prestamo" no tiene vista propia en el overlay (código muerto hoy: nadie
    // abre {tipo:"prestamo"}). Se devuelve null sin llamar onCerrar para no
    // ejecutar side-effects en el render; si se habilitara el tipo, deberá
    // añadirse aquí su case.
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  capa: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#f8fafc",
  },
});