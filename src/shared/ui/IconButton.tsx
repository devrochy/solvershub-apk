import { Platform, Pressable, StyleSheet } from "react-native";
import { shDensity, shRadius } from "@core/theme/tokens";
import { Icono, type IconName } from "./icono";
import { useKit } from "./tema";

export type IconButtonTone = "neutral" | "accent" | "danger" | "inverse";
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps {
  icon: IconName;
  /** Nombre accesible OBLIGATORIO: en la app no hay tooltips. */
  label: string;
  onPress?: () => void;
  tone?: IconButtonTone;
  size?: IconButtonSize;
  disabled?: boolean;
  selected?: boolean;
  accessibilityHint?: string;
  testID?: string;
}

const ICONO: Record<IconButtonSize, number> = { sm: 20, md: 24, lg: 28 };

/**
 * Botón de solo ícono. El área táctil es siempre de 48 × 48 dp aunque el
 * ícono sea chico; `label` es el nombre que anuncia TalkBack.
 */
export function IconButton({
  icon,
  label,
  onPress,
  tone = "neutral",
  size = "md",
  disabled = false,
  selected,
  accessibilityHint,
  testID,
}: IconButtonProps) {
  const { c, ripple, relleno } = useKit();
  const color = disabled
    ? c.textSoft
    : tone === "accent"
      ? c.link
      : tone === "danger"
        ? c.statusDangerFg
        : tone === "inverse"
          ? relleno.sobrePrimario
          : c.text;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{
        color: tone === "inverse" ? ripple.relleno : ripple.superficie,
        borderless: true,
        radius: shDensity.controlLg / 2,
      }}
      style={({ pressed }) => [
        styles.base,
        selected && { backgroundColor: c.surfaceRaised },
        pressed && Platform.OS === "ios" && styles.presionadoIos,
      ]}
    >
      <Icono name={icon} size={ICONO[size]} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: shDensity.controlLg,
    minHeight: shDensity.controlLg,
    borderRadius: shRadius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  presionadoIos: { opacity: 0.7 },
});
