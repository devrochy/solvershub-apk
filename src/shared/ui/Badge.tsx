import { StyleSheet, Text, View } from "react-native";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Icono, type IconName } from "./icono";
import { useKit, type TonoEstado } from "./tema";

export type BadgeSize = "sm" | "md";

interface BadgeBase {
  label: string;
  size?: BadgeSize;
  testID?: string;
}

/** Neutral o de énfasis: el ícono es opcional. */
interface BadgeLibre extends BadgeBase {
  tone?: "neutral" | "accent";
  icon?: IconName;
}

/** De estado: el ícono es OBLIGATORIO, el color nunca va solo (SPEC-29 §2). */
interface BadgeDeEstado extends BadgeBase {
  tone: TonoEstado;
  icon: IconName;
}

export type BadgeProps = BadgeLibre | BadgeDeEstado;

const ESCALA_MAXIMA = 1.6;

/** Etiqueta corta de estado o categoría (`tone` igual que en el panel). */
export function Badge({ label, size = "sm", tone = "neutral", icon, testID }: BadgeProps) {
  const { tonos } = useKit();
  const t = tonos[tone];
  const texto = size === "sm" ? styles.textoSm : styles.textoMd;

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[
        styles.base,
        size === "md" && styles.md,
        { backgroundColor: t.bg, borderColor: t.border },
      ]}
    >
      {icon ? <Icono name={icon} size={size === "sm" ? 14 : 16} color={t.fg} /> : null}
      <Text style={[texto, { color: t.fg }]} maxFontSizeMultiplier={ESCALA_MAXIMA}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: shSpace[1],
    borderWidth: 1,
    borderRadius: shRadius.sm,
    paddingHorizontal: shSpace[2],
    paddingVertical: 2,
  },
  md: { paddingHorizontal: shSpace[3], paddingVertical: shSpace[1] },
  textoSm: { ...shType.caption, fontFamily: shType.label.fontFamily },
  textoMd: shType.label,
});
