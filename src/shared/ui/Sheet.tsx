import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { IconButton } from "./IconButton";
import { curva, duracion, useReduceMotion } from "./motion";
import { useKit } from "./tema";

export interface SheetProps {
  visible: boolean;
  /** Se llama con el botón cerrar, el back de Android, el fondo o el gesto hacia abajo. */
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  /** Acciones fijas al pie (la CTA queda en la zona del pulgar). */
  footer?: ReactNode;
  closeLabel?: string;
  testID?: string;
}

/** Desplazamiento (dp) o velocidad con que el gesto hacia abajo cierra la hoja. */
const UMBRAL_CIERRE = 80;
const VELOCIDAD_CIERRE = 1;

/**
 * Hoja modal inferior (SPEC-29 §2, organismo `Sheet`) sobre `Modal` de RN: asa
 * visible, título como encabezado, botón cerrar accesible de 48 dp y cierre con
 * el back de Android (`onRequestClose`). El asa y el encabezado se arrastran
 * hacia abajo para cerrar (PanResponder, sin gesture-handler). Entra deslizando
 * con `dur-slow` y `ease-emphasized`, sin animación con "reducir movimiento".
 */
export function Sheet({
  visible,
  onClose,
  title,
  description,
  children,
  footer,
  closeLabel = "Cerrar",
  testID,
}: SheetProps) {
  const { c } = useKit();
  const insets = useSafeAreaInsets();
  const reducir = useReduceMotion();
  const [entrada] = useState(() => new Animated.Value(0));
  const [arrastre] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!visible) {
      entrada.setValue(0);
      arrastre.setValue(0);
      return;
    }
    Animated.timing(entrada, {
      toValue: 1,
      duration: duracion("slow", reducir),
      easing: curva("emphasized"),
      useNativeDriver: true,
    }).start();
  }, [visible, reducir, entrada, arrastre]);

  const gesto = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => arrastre.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_, g) => {
          if (g.dy > UMBRAL_CIERRE || g.vy > VELOCIDAD_CIERRE) {
            onClose();
          } else {
            Animated.timing(arrastre, {
              toValue: 0,
              duration: duracion("fast", reducir),
              easing: curva("out"),
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [arrastre, onClose, reducir],
  );

  const desplazamiento = Animated.add(
    entrada.interpolate({ inputRange: [0, 1], outputRange: [shSpace[12], 0] }),
    arrastre,
  );

  return (
    <Modal
      testID={testID ? `${testID}-modal` : undefined}
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView style={styles.raiz} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay, opacity: entrada }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessible={false}
            importantForAccessibility="no"
          />
        </Animated.View>
        <Animated.View
          testID={testID}
          accessibilityViewIsModal
          style={[
            styles.hoja,
            {
              backgroundColor: c.surface,
              borderColor: c.border,
              boxShadow: c.elev3,
              paddingBottom: insets.bottom + shSpace[4],
              opacity: entrada,
              transform: [{ translateY: desplazamiento }],
            },
          ]}
        >
          <View {...gesto.panHandlers}>
            <View
              testID="sheet-asa"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[styles.asa, { backgroundColor: c.controlBorder }]}
            />
            <View style={styles.encabezado}>
              <View style={styles.titulos}>
                <Text accessibilityRole="header" style={[shType.block, { color: c.text }]}>
                  {title}
                </Text>
                {description ? (
                  <Text style={[shType.dense, { color: c.textMuted }]}>{description}</Text>
                ) : null}
              </View>
              <IconButton icon="close" label={closeLabel} onPress={onClose} testID={testID ? `${testID}-cerrar` : undefined} />
            </View>
          </View>
          <ScrollView
            style={styles.cuerpoScroll}
            contentContainerStyle={styles.cuerpo}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {footer ? <View style={[styles.pie, { borderTopColor: c.borderSoft }]}>{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, justifyContent: "flex-end" },
  hoja: {
    maxHeight: "90%",
    borderTopLeftRadius: shRadius.lg,
    borderTopRightRadius: shRadius.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  asa: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: shRadius.pill,
    marginTop: shSpace[2],
  },
  encabezado: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: shSpace[2],
    paddingLeft: shSpace[4],
    paddingRight: shSpace[1],
    paddingTop: shSpace[2],
  },
  titulos: { flex: 1, gap: shSpace[1], paddingTop: shSpace[3] },
  cuerpoScroll: { flexShrink: 1 },
  cuerpo: { padding: shSpace[4], gap: shSpace[3] },
  pie: {
    flexDirection: "row",
    gap: shSpace[3],
    paddingHorizontal: shSpace[4],
    paddingTop: shSpace[3],
    borderTopWidth: 1,
  },
});
