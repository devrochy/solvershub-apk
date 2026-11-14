import { Platform, Pressable, StyleSheet, Text } from "react-native";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { Icono, useKit } from "@shared/ui";

export interface BotonDelBotProps {
  activo: boolean;
  onToggle: () => void;
  nombre: string;
  /** Mientras se guarda, se muestra el estado actual sin permitir otro toque. */
  pendiente?: boolean;
  disabled?: boolean;
  testID?: string;
}

/**
 * Estado del agente de un cliente como interruptor compacto (SPEC-29 §2).
 * La fila completa es el blanco táctil de 48 dp; el estado no va solo en color:
 * cambia el icono y el texto. Se anuncia como `switch`.
 */
export function BotonDelBot({
  activo,
  onToggle,
  nombre,
  pendiente = false,
  disabled = false,
  testID,
}: BotonDelBotProps) {
  const { tonos, ripple } = useKit();
  const inactivo = disabled || pendiente;
  const tono = activo ? tonos.success : tonos.danger;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={activo ? `Pausar el agente para ${nombre}` : `Activar el agente para ${nombre}`}
      accessibilityState={{ checked: activo, disabled: inactivo, busy: pendiente }}
      disabled={inactivo}
      onPress={onToggle}
      android_ripple={{ color: ripple.superficie }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: tono.bg, borderColor: tono.border, opacity: inactivo ? 0.7 : 1 },
        pressed && Platform.OS === "ios" && styles.presionado,
      ]}
    >
      <Icono name={activo ? "smart-toy" : "pause-circle-filled"} size={16} color={tono.fg} />
      <Text style={[shType.caption, styles.texto, { color: tono.fg }]} maxFontSizeMultiplier={1.6}>
        {pendiente ? "Guardando…" : activo ? "Bot activo" : "Bot pausado"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: shSpace[1],
    minHeight: shDensity.controlMd,
    borderWidth: 1,
    borderRadius: shRadius.pill,
    paddingHorizontal: shSpace[3],
  },
  texto: { fontFamily: shType.label.fontFamily },
  presionado: { opacity: 0.75 },
});
