import { useEffect } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import { OverlaysActivos } from "./OverlaysActivos";
import { usePantallaActiva } from "./pantalla-activa-context";
import { TabsNavigator } from "./TabsNavigator";
import { useTrayectosOverlay } from "./trayectos-overlay-context";

/**
 * Flujo de cartera a pantalla completa (Trayecto diario / Cartera / Clientes + overlays de detalle).
 * El back físico de Android cierra primero el overlay activo y, si no hay
 * ninguno, deja que el stack vuelva a la pestaña "Carteras".
 */
export function CarteraFlujo() {
  const { pantalla, cerrar } = usePantallaActiva();
  const { contenido: trayectosAbiertos, cerrar: cerrarTrayectos } =
    useTrayectosOverlay();

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (pantalla) {
        cerrar();
        return true;
      }
      if (trayectosAbiertos) {
        cerrarTrayectos();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [pantalla, cerrar, trayectosAbiertos, cerrarTrayectos]);

  return (
    <View style={styles.fill}>
      <TabsNavigator />
      <OverlaysActivos />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
