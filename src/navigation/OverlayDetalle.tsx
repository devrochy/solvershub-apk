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
    // "prestamo" aún no tiene vista propia en el overlay; se cierra para no
    // dejar la capa activa sin contenido.
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  capa: { flex: 1, backgroundColor: "#f8fafc" },
});