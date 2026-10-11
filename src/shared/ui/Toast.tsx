import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AccessibilityInfo, Animated, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Icono } from "./icono";
import { IconButton } from "./IconButton";
import { curva, duracion, useReduceMotion } from "./motion";
import { useKit } from "./tema";

export type ToastTone = "success" | "error";

/** Un toast de éxito se va solo a los 5 s; uno de error espera a que lo cierren. */
export const TOAST_DURACION_EXITO = 5000;

export interface ToastProps {
  tone: ToastTone;
  message: string;
  onClose?: () => void;
  testID?: string;
}

/**
 * Aviso breve (SPEC-29 §2): `success` con `role=status`, `error` con
 * `role=alert` y botón de cerrar. Entra subiendo 8 px (`dur-base`, `ease-out`),
 * sin animación con "reducir movimiento".
 */
export function Toast({ tone, message, onClose, testID }: ToastProps) {
  const { c, tonos } = useKit();
  const reducir = useReduceMotion();
  const [entrada] = useState(() => new Animated.Value(0));
  const t = tone === "success" ? tonos.success : tonos.danger;

  useEffect(() => {
    Animated.timing(entrada, {
      toValue: 1,
      duration: duracion("base", reducir),
      easing: curva("out"),
      useNativeDriver: true,
    }).start();
  }, [entrada, reducir]);

  return (
    <Animated.View
      testID={testID}
      style={[
        styles.toast,
        {
          backgroundColor: c.surface,
          borderColor: t.border,
          borderLeftColor: t.fg,
          boxShadow: c.elev2,
          opacity: entrada,
          transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
        },
      ]}
    >
      <View accessible role={tone === "success" ? "status" : "alert"} style={styles.cuerpo}>
        <Icono name={tone === "success" ? "check-circle" : "error-outline"} size={22} color={t.fg} />
        <Text style={[shType.dense, styles.mensaje, { color: c.text }]}>{message}</Text>
      </View>
      {tone === "error" && onClose ? <IconButton icon="close" label="Cerrar aviso" size="sm" onPress={onClose} /> : null}
    </Animated.View>
  );
}

interface ToastActual {
  id: number;
  tone: ToastTone;
  message: string;
}

export interface ToastApi {
  show(toast: { tone: ToastTone; message: string }): void;
  success(message: string): void;
  error(message: string): void;
  dismiss(): void;
}

const NOOP: ToastApi = {
  show: () => undefined,
  success: () => undefined,
  error: () => undefined,
  dismiss: () => undefined,
};

const ToastContext = createContext<ToastApi>(NOOP);

/** API de toasts del `ToastProvider` más cercano (no-op si no hay provider). */
export function useToast(): ToastApi {
  return useContext(ToastContext);
}

/**
 * Muestra un toast a la vez sobre el contenido, abajo y dentro del área segura.
 * El contenedor es una región viva: Android anuncia el aviso al aparecer
 * (en iOS se anuncia con `announceForAccessibility`).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [actual, setActual] = useState<ToastActual | null>(null);
  const contador = useRef(0);

  const dismiss = useCallback(() => setActual(null), []);
  const show = useCallback((toast: { tone: ToastTone; message: string }) => {
    contador.current += 1;
    setActual({ id: contador.current, ...toast });
    if (Platform.OS === "ios") {
      AccessibilityInfo.announceForAccessibility(toast.message);
    }
  }, []);

  useEffect(() => {
    if (!actual || actual.tone !== "success") return undefined;
    const timer = setTimeout(() => {
      setActual((a) => (a?.id === actual.id ? null : a));
    }, TOAST_DURACION_EXITO);
    return () => clearTimeout(timer);
  }, [actual]);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message) => show({ tone: "success", message }),
      error: (message) => show({ tone: "error", message }),
      dismiss,
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <View
        pointerEvents="box-none"
        accessibilityLiveRegion={actual?.tone === "error" ? "assertive" : "polite"}
        style={[styles.capa, { bottom: insets.bottom + shSpace[4] }]}
      >
        {actual ? (
          <Toast key={actual.id} tone={actual.tone} message={actual.message} onClose={dismiss} testID="toast" />
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  capa: { position: "absolute", left: shSpace[4], right: shSpace[4] },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[3],
    minHeight: 56,
    paddingLeft: shSpace[4],
    paddingRight: shSpace[2],
    paddingVertical: shSpace[2],
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: shRadius.md,
  },
  cuerpo: { flex: 1, flexDirection: "row", alignItems: "center", gap: shSpace[3] },
  mensaje: { flex: 1, paddingVertical: shSpace[2] },
});
