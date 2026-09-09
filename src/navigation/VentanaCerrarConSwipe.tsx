import { Animated, StyleProp, ViewStyle } from "react-native";
import { ReactNode, useState } from "react";
import { crearPanResponderCerrar } from "./swipe-cerrar";

export interface VentanaCerrarConSwipeProps {
  onCerrar(): void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  /** If false, se llama onCerrar sin animar la salida (p. ej. navegación nativa). Default: true. */
  animarSalida?: boolean;
}

/**
 * Envuelve una ventana (tab, overlay, modal propio) con el gesto de cerrar
 * deslizando de izquierda a derecha. Con `animarSalida=true` desliza la ventana
 * hacia fuera de pantalla antes de cerrar, dejando ver la ventana que hay debajo.
 */
export function VentanaCerrarConSwipe({
  onCerrar,
  testID,
  style,
  children,
  animarSalida = true,
}: VentanaCerrarConSwipeProps) {
  const [translateX] = useState(() => new Animated.Value(0));
  const [responder] = useState(() =>
    crearPanResponderCerrar({ onCerrar, translateX, animarSalida }),
  );

  return (
    <Animated.View
      testID={testID}
      style={[style, { transform: [{ translateX }] }]}
      {...responder.panHandlers}
    >
      {children}
    </Animated.View>
  );
}