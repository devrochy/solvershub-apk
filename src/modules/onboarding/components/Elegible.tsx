import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { Icono, useKit, type IconName } from "@shared/ui";

export interface ElegibleProps {
  titulo: string;
  ayuda?: string;
  icono?: IconName;
  elegido: boolean;
  onPress: () => void;
  /** `radio` para una sola opción, `checkbox` para varias. */
  rol?: "radio" | "checkbox";
  testID?: string;
}

/**
 * Tarjeta seleccionable del asistente de primer uso: toda la tarjeta es el blanco táctil (≥ 48 dp).
 * Lo elegido se ve por el borde, el fondo y la palomita —no solo por el color— y el lector de
 * pantalla lo anuncia con su rol y estado.
 */
export function Elegible({
  titulo,
  ayuda,
  icono,
  elegido,
  onPress,
  rol = "radio",
  testID,
}: ElegibleProps) {
  const { c, relleno, ripple, tonos } = useKit();
  return (
    <Pressable
      testID={testID}
      accessibilityRole={rol}
      accessibilityLabel={titulo}
      accessibilityHint={ayuda}
      accessibilityState={{ selected: elegido, checked: elegido }}
      onPress={onPress}
      android_ripple={{ color: ripple.superficie }}
      style={({ pressed }) => [
        styles.tarjeta,
        {
          borderColor: elegido ? relleno.primario : c.controlBorder,
          backgroundColor: elegido ? tonos.accent.bg : c.surface,
        },
        pressed && Platform.OS === "ios" && styles.presionada,
      ]}
    >
      {icono ? (
        <Icono name={icono} size={24} color={elegido ? c.link : c.textMuted} />
      ) : null}
      <View style={styles.textos}>
        <Text style={[shType.label, { color: c.text }]}>{titulo}</Text>
        {ayuda ? (
          <Text style={[shType.caption, { color: c.textMuted }]}>{ayuda}</Text>
        ) : null}
      </View>
      {elegido ? <Icono name="check-circle" size={22} color={c.link} /> : null}
    </Pressable>
  );
}

/** Variante compacta (chip) para elecciones cortas: horas, días, motivos y frases. */
export function Chip({
  titulo,
  elegido,
  onPress,
  rol = "checkbox",
  testID,
}: {
  titulo: string;
  elegido: boolean;
  onPress: () => void;
  rol?: "radio" | "checkbox" | "button";
  testID?: string;
}) {
  const { c, relleno, ripple, tonos } = useKit();
  return (
    <Pressable
      testID={testID}
      accessibilityRole={rol}
      accessibilityLabel={titulo}
      accessibilityState={rol === "button" ? undefined : { selected: elegido, checked: elegido }}
      onPress={onPress}
      android_ripple={{ color: ripple.superficie }}
      style={[
        styles.chip,
        {
          borderColor: elegido ? relleno.primario : c.controlBorder,
          backgroundColor: elegido ? tonos.accent.bg : c.surface,
        },
      ]}
    >
      {elegido ? <Icono name="check" size={18} color={c.link} /> : null}
      <Text style={[shType.label, { color: c.text }]}>{titulo}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[3],
    minHeight: shDensity.controlLg + shSpace[2],
    padding: shSpace[3],
    borderWidth: 2,
    borderRadius: shRadius.md,
  },
  presionada: { opacity: 0.85 },
  textos: { flex: 1, gap: shSpace[1] },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[1],
    minHeight: shDensity.controlLg,
    paddingHorizontal: shSpace[3],
    borderWidth: 2,
    borderRadius: shRadius.pill,
  },
});
