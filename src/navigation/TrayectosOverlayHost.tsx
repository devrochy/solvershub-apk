import { StyleSheet } from "react-native";
import { TrayectosLista } from "../components/TrayectosLista";
import { useTrayectosOverlay } from "./trayectos-overlay-context";
import { VentanaCerrarConSwipe } from "./VentanaCerrarConSwipe";

/**
 * Capa del overlay de trayectos. Se monta como hermana por encima de la capa de
 * pestañas (no dentro del tab) para que su gesto de swipe no compita con el de
 * la pestaña: al deslizar se revela «cobros del día» que queda debajo.
 */
export function TrayectosOverlayHost() {
  const { contenido, cerrar } = useTrayectosOverlay();
  if (!contenido) {
    return null;
  }
  return (
    <VentanaCerrarConSwipe
      testID="trayectos-overlay"
      style={styles.capa}
      onCerrar={cerrar}
    >
      <TrayectosLista
        clientes={contenido.clientes}
        trayectos={contenido.trayectos}
      />
    </VentanaCerrarConSwipe>
  );
}

const styles = StyleSheet.create({
  capa: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#f8fafc",
  },
});
