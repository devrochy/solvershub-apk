import type { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { shRadius, shSpace } from "@core/theme/tokens";
import { useKit } from "./tema";

export interface CardProps {
  children: ReactNode;
  /** Toda la tarjeta es el blanco táctil cuando hay `onPress`. */
  onPress?: () => void;
  /** Barra de acento a la izquierda (estado o clasificación). */
  accentColor?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Tarjeta del kit (SPEC-29 §2): superficie, borde, radio y elevación del tema,
 * con una barra de acento opcional. Si recibe `onPress` se comporta como botón
 * y conserva el ripple de Android; las acciones internas siguen siendo
 * controles independientes.
 */
export function Card({
  children,
  onPress,
  accentColor,
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
}: CardProps) {
  const { c, ripple } = useKit();
  const base = [
    styles.tarjeta,
    {
      backgroundColor: c.surface,
      borderColor: c.border,
      borderLeftColor: accentColor ?? c.border,
      borderLeftWidth: accentColor ? 4 : 1,
      boxShadow: c.elev1,
    },
    style,
  ];

  if (!onPress) {
    return (
      <View testID={testID} style={base}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      android_ripple={{ color: ripple.superficie }}
      style={({ pressed }) => [base, pressed && Platform.OS === "ios" && styles.presionadoIos]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    borderWidth: 1,
    borderRadius: shRadius.md,
    borderCurve: "continuous",
    padding: shSpace[4],
    gap: shSpace[2],
    overflow: "hidden",
  },
  presionadoIos: { opacity: 0.85 },
});
