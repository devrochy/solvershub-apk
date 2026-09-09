import { BackHandler, StyleSheet, View } from "react-native";
import { useEffect } from "react";
import { usePantallaActiva } from "../navigation/pantalla-activa-context";
import { OverlayDetalle } from "../navigation/OverlayDetalle";
import { VentanaCerrarConSwipe } from "./VentanaCerrarConSwipe";

/**
 * Envuelve el contenido de cada tab. Si hay una pantalla activa (detalle de
 * cliente/préstamo/ruta), la muestra como capa sobre el contenido del tab; el
 * CustomTabBar del Tab.Navigator queda visible debajo (B1: menú siempre
 * visible). El back físico de Android cierra el detalle antes que la app.
 *
 * El contenido del tab (pestaña Ruta, Día o Clientes) se cierra deslizando de
 * izquierda a derecha (swipe-back global): al superar el umbral se llama
 * `onCerrar` para volver a `SeleccionRuta`; la transición de vuelta la hace la
 * navegación nativa (`animarSalida=false`), que muestra la pantalla destino.
 * Los overlays (OverlayDetalle) tienen su propio gesto y se deslizan revelando
 * el tab que hay debajo.
 */
export function ContenidoTab({
  children,
  onCerrar,
}: {
  children: React.ReactNode;
  /** Se invoca al superar el umbral del swipe-back en la pestaña. */
  onCerrar?: () => void;
}) {
  const { pantalla, cerrar } = usePantallaActiva();

  useEffect(() => {
    if (!pantalla) {
      return undefined;
    }
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      cerrar();
      return true;
    });
    return () => sub.remove();
  }, [pantalla, cerrar]);

  return (
    <View style={styles.contenedor}>
      <VentanaCerrarConSwipe
        testID="contenido-tab"
        style={styles.contenedor}
        onCerrar={onCerrar ?? (() => undefined)}
        animarSalida={false}
      >
        {children}
      </VentanaCerrarConSwipe>
      <OverlayDetalle pantalla={pantalla} onCerrar={cerrar} />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
});