import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { useField } from "./Field";
import { Icono } from "./icono";
import { useKit } from "./tema";

export interface CheckboxProps {
  /** Texto de la casilla: también es su nombre accesible. */
  label: string;
  /** `"indeterminate"` para la selección parcial (algunos hijos marcados). */
  checked: boolean | "indeterminate";
  onCheckedChange?: (checked: boolean) => void;
  /** Línea secundaria bajo el label; va al `accessibilityHint`. */
  description?: string;
  disabled?: boolean;
  /** Borde de peligro; dentro de un `Field` con `error` se activa solo. */
  invalid?: boolean;
  testID?: string;
}

const ESCALA_MAXIMA = 1.6;
const LADO = 24;

/**
 * Casilla con etiqueta (SPEC-29 §2, mismos nombres que el panel). Toda la fila
 * es el blanco táctil (alto mínimo 48 dp). El estado se ve por la forma —palomita
 * o guion dentro de la casilla relleno— además del color, y lo lee el lector de
 * pantalla como `checked` (`mixed` si es parcial).
 */
export function Checkbox({
  label,
  checked,
  onCheckedChange,
  description,
  disabled = false,
  invalid,
  testID,
}: CheckboxProps) {
  const { c, relleno, ripple } = useKit();
  const campo = useField();
  const esInvalido = invalid ?? campo?.invalid ?? false;
  const marcada = checked !== false;
  const parcial = checked === "indeterminate";
  const ayuda = description ?? campo?.descripcion;

  const borde = disabled ? c.controlBorder : esInvalido ? c.statusDangerFg : marcada ? relleno.primario : c.controlBorder;
  const fondo = disabled ? c.surface2 : marcada ? relleno.primario : c.surface;
  const tinta = disabled ? c.textSoft : relleno.sobrePrimario;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityHint={ayuda}
      accessibilityState={{ checked: parcial ? "mixed" : checked, disabled }}
      disabled={disabled}
      onPress={() => onCheckedChange?.(!(checked === true))}
      android_ripple={{ color: ripple.superficie }}
      style={({ pressed }) => [styles.fila, pressed && Platform.OS === "ios" && styles.presionadoIos]}
    >
      <View
        testID={testID ? `${testID}-caja` : undefined}
        style={[styles.caja, { backgroundColor: fondo, borderColor: borde }]}
      >
        {marcada ? <Icono name={parcial ? "remove" : "check"} size={18} color={tinta} /> : null}
      </View>
      <View style={styles.textos}>
        <Text
          style={[shType.body, { color: disabled ? c.textSoft : c.text }]}
          maxFontSizeMultiplier={ESCALA_MAXIMA}
        >
          {label}
        </Text>
        {description ? (
          <Text style={[shType.caption, { color: c.textMuted }]} maxFontSizeMultiplier={ESCALA_MAXIMA}>
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[3],
    minHeight: shDensity.controlLg,
    paddingVertical: shSpace[2],
  },
  caja: {
    width: LADO,
    height: LADO,
    borderRadius: shRadius.sm,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  textos: { flex: 1, gap: 2 },
  presionadoIos: { opacity: 0.7 },
});
