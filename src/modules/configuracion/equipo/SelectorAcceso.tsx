import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { Icono, useKit } from "@shared/ui";
import { ACCESOS, type Acceso } from "./dominio";

/**
 * Selector de acceso de una sección del equipo: tres estados excluyentes
 * (`Sin acceso`, `Ver`, `Editar`). Cada opción mide 48 dp y se anuncia como
 * radio; el estado no depende solo del color (la elegida lleva check y peso).
 */
export function SelectorAcceso({
  label,
  valor,
  onChange,
  disabled = false,
  testID,
}: {
  label: string;
  valor: Acceso;
  onChange: (valor: Acceso) => void;
  disabled?: boolean;
  testID?: string;
}) {
  const { c, relleno, ripple } = useKit();

  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={styles.grupo}
    >
      {ACCESOS.map((opcion) => {
        const elegida = opcion.valor === valor;
        return (
          <Pressable
            key={opcion.valor}
            testID={testID ? `${testID}-${opcion.valor}` : undefined}
            accessibilityRole="radio"
            accessibilityLabel={opcion.label}
            accessibilityState={{ selected: elegida, checked: elegida, disabled }}
            disabled={disabled}
            onPress={() => onChange(opcion.valor)}
            android_ripple={{ color: ripple.superficie }}
            style={({ pressed }) => [
              styles.opcion,
              {
                backgroundColor: elegida ? relleno.primario : c.surface2,
                borderColor: elegida ? relleno.primario : c.controlBorder,
              },
              pressed && Platform.OS === "ios" && styles.presionado,
            ]}
          >
            {elegida ? (
              <Icono name="check" size={14} color={relleno.sobrePrimario} />
            ) : null}
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.6}
              style={[
                shType.caption,
                styles.texto,
                { color: elegida ? relleno.sobrePrimario : c.textMuted },
              ]}
            >
              {opcion.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: {
    flexDirection: "row",
    gap: shSpace[1],
  },
  opcion: {
    flex: 1,
    minHeight: shDensity.controlLg,
    borderWidth: 1,
    borderRadius: shRadius.sm,
    paddingHorizontal: shSpace[1],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  texto: { fontFamily: shType.label.fontFamily },
  presionado: { opacity: 0.8 },
});
