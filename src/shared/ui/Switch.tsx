import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { Icono } from "./icono";
import { useKit } from "./tema";

export interface SwitchProps {
  /** Texto del interruptor: también es su nombre accesible. */
  label: string;
  value: boolean;
  onValueChange?: (value: boolean) => void;
  /** Línea secundaria bajo el label; va al `accessibilityHint`. */
  description?: string;
  disabled?: boolean;
  /** Solo la pista, para una barra de acciones (la etiqueta sigue siendo el nombre accesible). */
  compact?: boolean;
  testID?: string;
}

const ESCALA_MAXIMA = 1.6;
const PISTA = { ancho: 52, alto: 32 };
const BOLA = 24;
const MARGEN = 2;

/**
 * Interruptor del kit (SPEC-29 §2, mismos nombres que el panel). Toda la fila
 * (label a la izquierda, pista a la derecha) es el blanco táctil, de al menos
 * 48 dp. El estado no depende del color: la bola se corre al extremo y lleva
 * una palomita (encendido) o una equis (apagado). Lo lee el lector de pantalla
 * como `switch` con `checked`.
 */
export function Switch({
  label,
  value,
  onValueChange,
  description,
  disabled = false,
  compact = false,
  testID,
}: SwitchProps) {
  const { c, relleno, ripple } = useKit();

  const pista = disabled ? c.surface2 : value ? relleno.primario : c.surface2;
  const borde = disabled ? c.controlBorder : value ? relleno.primario : c.controlBorder;
  const bola = disabled ? c.controlBorder : value ? relleno.sobrePrimario : c.controlBorder;
  const tinta = disabled ? c.surface2 : value ? relleno.primario : c.surface;

  const pistaVisual = (
    <View
      testID={testID ? `${testID}-pista` : undefined}
      style={[
        styles.pista,
        { backgroundColor: pista, borderColor: borde, justifyContent: "center", alignItems: value ? "flex-end" : "flex-start" },
      ]}
    >
      <View style={[styles.bola, { backgroundColor: bola }]}>
        <Icono name={value ? "check" : "close"} size={16} color={tinta} />
      </View>
    </View>
  );

  if (compact) {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityHint={description}
        accessibilityState={{ checked: value, disabled }}
        disabled={disabled}
        onPress={() => onValueChange?.(!value)}
        android_ripple={{ color: ripple.superficie, borderless: true }}
        style={({ pressed }) => [styles.compacto, pressed && Platform.OS === "ios" && styles.presionadoIos]}
      >
        {pistaVisual}
      </Pressable>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange?.(!value)}
      android_ripple={{ color: ripple.superficie }}
      style={({ pressed }) => [styles.fila, pressed && Platform.OS === "ios" && styles.presionadoIos]}
    >
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
      {pistaVisual}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: shSpace[3],
    minHeight: shDensity.controlLg,
    paddingVertical: shSpace[1],
  },
  textos: { flex: 1, gap: 2 },
  pista: {
    width: PISTA.ancho,
    height: PISTA.alto,
    borderRadius: shRadius.pill,
    borderWidth: 2,
    paddingHorizontal: MARGEN,
  },
  bola: {
    width: BOLA - 2 * MARGEN,
    height: BOLA - 2 * MARGEN,
    borderRadius: shRadius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  compacto: {
    minWidth: shDensity.controlLg,
    minHeight: shDensity.controlLg,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: shRadius.pill,
  },
  presionadoIos: { opacity: 0.7 },
});
