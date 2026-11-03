import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { Icono, useKit } from "@shared/ui";
import { textoDeValor, type OpcionDeEtapa, type ResumenDeEtapa } from "../etapas";

export interface EmbudoPorEtapasProps {
  opciones: OpcionDeEtapa[];
  resumenes: ResumenDeEtapa[];
  /** Código de la etapa elegida. */
  actual: string;
  onElegir: (etapa: string) => void;
}

/**
 * Etapas del embudo como pestañas deslizables con su cantidad (HU-CRM-24). La etapa elegida muestra
 * debajo la suma del valor estimado. En el celular no se arrastra: la etapa de un cliente se cambia con
 * la hoja de la tarjeta (HU-CRM-19). El color nunca va solo: cada pestaña lleva icono, nombre y cantidad.
 */
export function EmbudoPorEtapas({ opciones, resumenes, actual, onElegir }: EmbudoPorEtapasProps) {
  const { c, relleno } = useKit();
  const elegida = resumenes.find((r) => r.value === actual);
  const suma = elegida?.suma ?? 0;

  return (
    <View style={styles.contenedor}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        accessibilityLabel="Etapas del embudo"
        contentContainerStyle={styles.pestanas}
      >
        {opciones.map((o) => {
          const activa = o.value === actual;
          const cantidad = resumenes.find((r) => r.value === o.value)?.cantidad;
          return (
            <Pressable
              key={o.value}
              testID={`embudo-etapa-${o.value}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: activa }}
              accessibilityLabel={
                typeof cantidad === "number"
                  ? `${o.label}, ${cantidad} ${cantidad === 1 ? "cliente" : "clientes"}`
                  : o.label
              }
              onPress={() => onElegir(o.value)}
              hitSlop={4}
              style={[
                styles.pestana,
                {
                  borderColor: activa ? relleno.primario : c.controlBorder,
                  backgroundColor: activa ? relleno.primario : c.surface,
                },
              ]}
            >
              <Icono name={o.icon} size={16} color={activa ? relleno.sobrePrimario : c.textMuted} />
              <Text style={[shType.label, { color: activa ? relleno.sobrePrimario : c.text }]}>{o.label}</Text>
              {typeof cantidad === "number" ? (
                <Text style={[shType.caption, { color: activa ? relleno.sobrePrimario : c.textMuted }]}>
                  {cantidad}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
      {suma > 0 ? (
        <Text testID="embudo-suma" style={[shType.caption, { color: c.textMuted }]}>
          {textoDeValor(suma)} en {elegida?.label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: shSpace[1] },
  pestanas: { flexDirection: "row", gap: shSpace[2], paddingVertical: shSpace[1] },
  pestana: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[1],
    minHeight: shDensity.controlLg,
    borderWidth: 1,
    borderRadius: shRadius.pill,
    paddingHorizontal: shSpace[3],
  },
});
