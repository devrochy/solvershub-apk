import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { shDensity, shSpace, shType } from "@core/theme/tokens";
import { useField } from "./Field";
import { Icono, type IconName } from "./icono";
import { useKit } from "./tema";

export interface RadioOption {
  value: string;
  label: string;
  /** Línea secundaria bajo el label; va al `accessibilityHint`. */
  description?: string;
  /** Icono opcional a la izquierda (p. ej. el canal de una conexión). */
  icono?: IconName;
  iconColor?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  /** Nombre accesible del grupo (la pregunta que se responde). */
  label: string;
  options: RadioOption[];
  /** Valor elegido; `undefined` o uno que no esté en `options` = ninguno. */
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  /** Borde de peligro; dentro de un `Field` con `error` se activa solo. */
  invalid?: boolean;
  /** Cada opción recibe `${testID}-${value}`. */
  testID?: string;
}

const ESCALA_MAXIMA = 1.6;
const LADO = 24;
const PUNTO = 12;

/**
 * Grupo de opciones excluyentes (SPEC-29 §2, mismos nombres que el panel).
 * Cada fila mide al menos 48 dp. La opción elegida se distingue por el punto
 * interior, no solo por el color, y el lector de pantalla la anuncia como
 * `radio` seleccionado dentro de un `radiogroup`.
 */
export function RadioGroup({
  label,
  options,
  value,
  onValueChange,
  disabled = false,
  invalid,
  testID,
}: RadioGroupProps) {
  const { c, relleno, ripple } = useKit();
  const campo = useField();
  const esInvalido = invalid ?? campo?.invalid ?? false;

  return (
    <View testID={testID} accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.grupo}>
      {options.map((opcion) => {
        const elegida = opcion.value === value;
        const inactiva = disabled || Boolean(opcion.disabled);
        const borde = inactiva
          ? c.controlBorder
          : esInvalido
            ? c.statusDangerFg
            : elegida
              ? relleno.primario
              : c.controlBorder;
        return (
          <Pressable
            key={opcion.value}
            testID={testID ? `${testID}-${opcion.value}` : undefined}
            accessibilityRole="radio"
            accessibilityLabel={opcion.label}
            accessibilityHint={opcion.description}
            accessibilityState={{ selected: elegida, checked: elegida, disabled: inactiva }}
            disabled={inactiva}
            onPress={() => onValueChange?.(opcion.value)}
            android_ripple={{ color: ripple.superficie }}
            style={({ pressed }) => [styles.fila, pressed && Platform.OS === "ios" && styles.presionadoIos]}
          >
            <View style={[styles.aro, { backgroundColor: inactiva ? c.surface2 : c.surface, borderColor: borde }]}>
              {elegida ? (
                <View
                  testID={testID ? `${testID}-${opcion.value}-punto` : undefined}
                  style={[styles.punto, { backgroundColor: inactiva ? c.textSoft : relleno.primario }]}
                />
              ) : null}
            </View>
            {opcion.icono ? (
              <Icono name={opcion.icono} size={20} color={opcion.iconColor ?? c.textSoft} />
            ) : null}
            <View style={styles.textos}>
              <Text
                style={[shType.body, { color: inactiva ? c.textSoft : c.text }]}
                maxFontSizeMultiplier={ESCALA_MAXIMA}
              >
                {opcion.label}
              </Text>
              {opcion.description ? (
                <Text style={[shType.caption, { color: c.textMuted }]} maxFontSizeMultiplier={ESCALA_MAXIMA}>
                  {opcion.description}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: { gap: 0 },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[3],
    minHeight: shDensity.controlLg,
    paddingVertical: shSpace[2],
  },
  aro: {
    width: LADO,
    height: LADO,
    borderRadius: LADO / 2,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  punto: { width: PUNTO, height: PUNTO, borderRadius: PUNTO / 2 },
  textos: { flex: 1, gap: 2 },
  presionadoIos: { opacity: 0.7 },
});
