import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Button, Icono, RadioGroup, Sheet, useKit } from "@shared/ui";
import { MOTIVO } from "../presentacion";

/** Filtro por motivo de la escalación, como el select del panel. */
export function FiltrosEscalaciones({
  motivo,
  onChange,
}: {
  motivo?: string;
  onChange: (motivo?: string) => void;
}) {
  const { c } = useKit();
  const [abierto, setAbierto] = useState(false);
  const etiqueta = motivo ? MOTIVO[motivo] ?? motivo : "Todos los motivos";

  return (
    <View style={styles.contenedor}>
      <Pressable
        testID="filtro-motivo"
        accessibilityRole="button"
        accessibilityLabel={`Motivo: ${etiqueta}`}
        onPress={() => setAbierto(true)}
        style={[
          styles.chip,
          {
            borderColor: motivo ? c.link : c.border,
            backgroundColor: motivo ? c.surfaceRaised : c.surface,
          },
        ]}
      >
        <Icono name="filter-list" size={16} color={motivo ? c.link : c.textMuted} />
        <Text style={[shType.caption, styles.texto, { color: motivo ? c.link : c.textMuted }]} numberOfLines={1}>
          {etiqueta}
        </Text>
      </Pressable>

      {motivo ? (
        <Button variant="link" size="sm" iconLeft="filter-alt-off" onPress={() => onChange(undefined)} testID="escalaciones-filtros-limpiar">
          Limpiar
        </Button>
      ) : null}

      <Sheet
        visible={abierto}
        onClose={() => setAbierto(false)}
        title="Filtrar por motivo"
        description="Muestra solo las escalaciones con ese motivo."
        testID="sheet-motivos"
      >
        <RadioGroup
          label="Motivo"
          value={motivo ?? ""}
          options={[
            { value: "", label: "Todos los motivos" },
            ...Object.entries(MOTIVO).map(([value, label]) => ({ value, label })),
          ]}
          onValueChange={(valor) => {
            onChange(valor || undefined);
            setAbierto(false);
          }}
          testID="motivo"
        />
        <Button variant="secondary" fullWidth onPress={() => setAbierto(false)}>
          Cerrar
        </Button>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flexDirection: "row", alignItems: "center", gap: shSpace[2], marginBottom: shSpace[2] },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[1],
    maxWidth: "75%",
    minHeight: 36,
    borderWidth: 1,
    borderRadius: shRadius.pill,
    paddingHorizontal: shSpace[3],
  },
  texto: { flexShrink: 1 },
});
