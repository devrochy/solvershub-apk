import { useEffect, useState } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import { SeleccionRutaScreen } from "../screens/SeleccionRutaScreen";
import { OverlaysActivos } from "./OverlaysActivos";
import { usePantallaActiva } from "./pantalla-activa-context";
import { TabsNavigator } from "./TabsNavigator";
import { useTrayectosOverlay } from "./trayectos-overlay-context";
import { VentanaCerrarConSwipe } from "./VentanaCerrarConSwipe";

/**
 * Pantalla raíz del cobrador. `SeleccionRuta` queda **montada siempre como
 * base** y la capa de pestañas se renderiza **encima** en un
 * `VentanaCerrarConSwipe`: al deslizar las pestañas hacia la derecha se desliza
 * la capa y se revela `SeleccionRuta` en vivo (igual que el detalle del cliente
 * revela la lista de clientes). Los overlays a pantalla completa (detalle y
 * trayectos) se montan como hermanos por encima de la capa de pestañas.
 *
 * El back físico de Android cierra primero el overlay activo, luego la capa de
 * pestañas (revelando `SeleccionRuta`).
 */
export function InicioCobrador() {
  const [tabsAbiertas, setTabsAbiertas] = useState(false);
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
      if (tabsAbiertas) {
        setTabsAbiertas(false);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [pantalla, cerrar, trayectosAbiertos, cerrarTrayectos, tabsAbiertas]);

  return (
    <View style={styles.fill}>
      <SeleccionRutaScreen onRutaSeleccionada={() => setTabsAbiertas(true)} />
      {tabsAbiertas ? (
        <VentanaCerrarConSwipe
          testID="tabs-capa"
          style={styles.capaTabs}
          onCerrar={() => setTabsAbiertas(false)}
        >
          <TabsNavigator />
        </VentanaCerrarConSwipe>
      ) : null}
      <OverlaysActivos />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  capaTabs: { ...StyleSheet.absoluteFill },
});
