import { StyleSheet, View } from "react-native";
import { usePantallaActiva } from "../navigation/pantalla-activa-context";
import { OverlayDetalle } from "../navigation/OverlayDetalle";

/**
 * Envuelve el contenido de cada tab. Si hay una pantalla activa (detalle de
 * cliente/préstamo/ruta), la muestra como capa sobre el contenido del tab; el
 * CustomTabBar del Tab.Navigator queda visible debajo (B1: menú siempre
 * visible).
 */
export function ContenidoTab({ children }: { children: React.ReactNode }) {
  const { pantalla, cerrar } = usePantallaActiva();

  return (
    <View style={styles.contenedor}>
      {children}
      <OverlayDetalle pantalla={pantalla} onCerrar={cerrar} />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
});