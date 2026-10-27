import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { Button, Field, Icono, useKit } from "@shared/ui";

function formatear(valor: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(valor);
}

/**
 * Fecha y hora con el selector nativo. En Android son dos diálogos (fecha y
 * hora); en iOS, un spinner dentro del formulario. El `Date` que se maneja es
 * "hora de pared" del negocio: sus componentes locales son los que el dueño ve.
 */
export function SelectorFechaHora({
  label,
  valor,
  onChange,
  hint,
  required = false,
  testID,
}: {
  label: string;
  valor: Date;
  onChange: (valor: Date) => void;
  hint?: string;
  required?: boolean;
  testID?: string;
}) {
  const { c } = useKit();
  const [abierto, setAbierto] = useState(false);

  function abrir() {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: valor,
        mode: "date",
        is24Hour: true,
        onChange: (evento, fecha) => {
          if (evento.type !== "set" || !fecha) return;
          DateTimePickerAndroid.open({
            value: valor,
            mode: "time",
            is24Hour: true,
            onChange: (eventoHora, hora) => {
              if (eventoHora.type !== "set" || !hora) return;
              const siguiente = new Date(fecha);
              siguiente.setHours(hora.getHours(), hora.getMinutes(), 0, 0);
              onChange(siguiente);
            },
          });
        },
      });
      return;
    }
    setAbierto((v) => !v);
  }

  return (
    <Field label={label} hint={hint} required={required}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatear(valor)}`}
        accessibilityHint={hint}
        onPress={abrir}
        style={[
          styles.campo,
          { borderColor: c.controlBorder, backgroundColor: c.surface },
        ]}
      >
        <Icono name="event" size={20} color={c.textMuted} />
        <Text
          style={[shType.body, styles.texto, { color: c.text }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {formatear(valor)}
        </Text>
        <Icono name="expand-more" size={20} color={c.textMuted} />
      </Pressable>

      {abierto && Platform.OS === "ios" ? (
        <View style={[styles.ios, { borderColor: c.border, backgroundColor: c.surface2 }]}>
          <DateTimePicker
            testID={testID ? `${testID}-picker` : undefined}
            value={valor}
            mode="datetime"
            display="spinner"
            locale="es-CO"
            onChange={(_, fecha) => {
              if (fecha) onChange(fecha);
            }}
          />
          <Button variant="secondary" size="sm" onPress={() => setAbierto(false)}>
            Listo
          </Button>
        </View>
      ) : null}
    </Field>
  );
}

const styles = StyleSheet.create({
  campo: {
    minHeight: shDensity.controlLg,
    borderWidth: 1,
    borderRadius: shRadius.sm,
    paddingHorizontal: shSpace[3],
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[2],
  },
  texto: { flex: 1, paddingVertical: shSpace[2] },
  ios: {
    borderWidth: 1,
    borderRadius: shRadius.sm,
    padding: shSpace[2],
    gap: shSpace[2],
    alignItems: "flex-end",
  },
});
