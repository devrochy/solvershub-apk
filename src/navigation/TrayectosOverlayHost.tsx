import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { TrayectosLista } from "../components/TrayectosLista";
import { useTrayectosOverlay } from "./trayectos-overlay-context";
import { VentanaCerrarConSwipe } from "./VentanaCerrarConSwipe";
import { useTheme } from "@core/theme/theme-context";
import type { ColoresTema } from "@core/theme/theme";

/**
 * Capa del overlay de trayectos. Se monta como hermana por encima de la capa de
 * pestañas (no dentro del tab) para que su gesto de swipe no compita con el de
 * la pestaña: al deslizar se revela «cobros del día» que queda debajo.
 */
export function TrayectosOverlayHost() {
  const { contenido, cerrar } = useTrayectosOverlay();
  const { colores } = useTheme();
  const styles = useMemo(() => crearEstilos(colores), [colores]);
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

function crearEstilos(c: ColoresTema) {
  return StyleSheet.create({
    capa: {
      ...StyleSheet.absoluteFill,
      backgroundColor: c.fondo,
    },
  });
}
