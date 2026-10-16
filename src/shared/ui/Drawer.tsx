import { useEffect, useState, type ReactNode } from "react";
import {
  Animated,
  BackHandler,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { shRadius, shSpace } from "@core/theme/tokens";
import { curva, duracion, useReduceMotion } from "./motion";
import { useKit } from "./tema";

export interface DrawerProps {
  abierto: boolean;
  onCerrar: () => void;
  children: ReactNode;
  /** Ancho del panel en dp. */
  ancho?: number;
  /** testID del panel (el que recibe `pointerEvents` y los estilos). */
  testID?: string;
  /** testID del fondo que cierra al tocarlo. */
  testIDFondo?: string;
  /** Nombre accesible del fondo (TalkBack lo anuncia como botón). */
  etiquetaCerrar?: string;
  /** Estilos extra del panel (se aplican después de los del kit). */
  style?: StyleProp<ViewStyle>;
  /**
   * Si es `true`, el botón atrás del sistema cierra el cajón mientras está
   * abierto. Apagado por defecto: el campo maneja su propio `BackHandler`.
   */
  cerrarConBack?: boolean;
}

const ANCHO_DEFECTO = 288;
/** Aire entre la barra de estado y la marca (el mismo que tenía el menú de campo). */
const AIRE_SUPERIOR = 20;

/**
 * Cajón lateral (menú hamburguesa): panel que se desliza desde la izquierda
 * sobre un fondo que cierra al tocarlo. Es la base del menú de campo
 * (`navigation/MenuLateral`) y del cajón del panel en la app (HU-DS-11, D-34).
 *
 * Sin dependencias nativas: `Animated` con `useNativeDriver` y `Pressable`.
 * Respeta el área segura arriba y abajo y "reducir movimiento" (0 ms).
 */
export function Drawer({
  abierto,
  onCerrar,
  children,
  ancho = ANCHO_DEFECTO,
  testID,
  testIDFondo,
  etiquetaCerrar = "Cerrar menú",
  style,
  cerrarConBack = false,
}: DrawerProps) {
  const { c } = useKit();
  const insets = useSafeAreaInsets();
  const reducir = useReduceMotion();
  const [progreso] = useState(() => new Animated.Value(abierto ? 1 : 0));

  useEffect(() => {
    Animated.timing(progreso, {
      toValue: abierto ? 1 : 0,
      duration: duracion("slow", reducir),
      easing: curva("out"),
      useNativeDriver: true,
    }).start();
  }, [abierto, progreso, reducir]);

  useEffect(() => {
    if (!cerrarConBack || !abierto) return undefined;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onCerrar();
      return true;
    });
    return () => sub.remove();
  }, [cerrarConBack, abierto, onCerrar]);

  const translateX = progreso.interpolate({ inputRange: [0, 1], outputRange: [-ancho, 0] });
  const opacidad = progreso.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <Animated.View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        pointerEvents={abierto ? "auto" : "none"}
        style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay, opacity: opacidad }]}
      >
        <Pressable
          testID={testIDFondo}
          accessibilityRole="button"
          accessibilityLabel={etiquetaCerrar}
          style={StyleSheet.absoluteFill}
          onPress={onCerrar}
        />
      </Animated.View>

      <Animated.View
        testID={testID}
        pointerEvents={abierto ? "auto" : "none"}
        style={[
          styles.panel,
          {
            width: ancho,
            backgroundColor: c.surface,
            borderColor: c.border,
            boxShadow: c.elev3,
            paddingTop: insets.top + AIRE_SUPERIOR,
            paddingBottom: insets.bottom,
            transform: [{ translateX }],
          },
          style,
        ]}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    paddingHorizontal: shSpace[4],
    borderTopRightRadius: shRadius.lg,
    borderBottomRightRadius: shRadius.lg,
    borderRightWidth: 1,
    borderCurve: "continuous",
  },
});
