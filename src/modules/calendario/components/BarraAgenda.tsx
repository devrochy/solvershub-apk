import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { shSpace, shType } from "@core/theme/tokens";
import { Button, useKit } from "@shared/ui";

import { inicialDeAgenda, type LeyendaAgenda, type TipoLeyenda } from "../domain/agenda";

function Muestra({ color }: { color: string | null | undefined }) {
  const { c } = useKit();
  const serie = color && /^cat-[1-4]$/.test(color) ? Number(color.slice(4)) : null;
  const fondo = serie ? [c.dataCat1, c.dataCat2, c.dataCat3, c.dataCat4][serie - 1] : c.borderStrong;
  return <View style={[styles.muestra, { backgroundColor: fondo }]} />;
}

/** Barra de la vista única: agendas (si hay varias), leyenda de tipos y acciones. */
export function BarraAgenda({
  agendas,
  visibles,
  onAlternar,
  onSolo,
  tipos,
  puedeCrear,
  onNueva,
  onAjustes,
}: {
  agendas: LeyendaAgenda[];
  visibles: string[];
  onAlternar: (id: string) => void;
  onSolo: (id: string) => void;
  tipos: TipoLeyenda[];
  puedeCrear: boolean;
  onNueva: () => void;
  onAjustes: (() => void) | null;
}) {
  const { c } = useKit();
  const hayVarias = agendas.length >= 2;
  const repetidos = agendas.length > 4;

  return (
    <View testID="barra-agenda" style={styles.contenedor}>
      {hayVarias ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {agendas.map((agenda) => {
            const prendida = visibles.includes(agenda.id);
            return (
              <View
                key={agenda.id}
                style={[styles.chip, { borderColor: prendida ? c.link : c.border, backgroundColor: c.surface }]}
              >
                <Pressable
                  testID={`agenda-chip-${agenda.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: prendida }}
                  accessibilityLabel={`${prendida ? "Ocultar" : "Mostrar"} ${agenda.name}`}
                  onPress={() => onAlternar(agenda.id)}
                  style={styles.chipPrincipal}
                >
                  <Muestra color={prendida ? agenda.color : null} />
                  {repetidos ? (
                    <Text style={[shType.caption, styles.inicial, { color: c.text }]}>
                      {inicialDeAgenda(agenda.name)}
                    </Text>
                  ) : null}
                  <Text
                    numberOfLines={1}
                    style={[
                      shType.caption,
                      {
                        color: prendida ? c.text : c.textMuted,
                        textDecorationLine: prendida ? "none" : "line-through",
                      },
                    ]}
                  >
                    {agenda.name}
                  </Text>
                  {agenda.disponible === false ? (
                    <Text style={[shType.caption, { color: c.statusWarningFg }]}>sin conexión</Text>
                  ) : null}
                </Pressable>
                <Pressable
                  testID={`agenda-solo-${agenda.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver solo ${agenda.name}`}
                  onPress={() => onSolo(agenda.id)}
                  style={[styles.solo, { borderLeftColor: c.borderSoft }]}
                >
                  <Text style={[shType.caption, { color: c.link }]}>Solo</Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      ) : null}

      {tipos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Text style={[shType.caption, { color: c.textMuted }]}>Tipos:</Text>
          {tipos.map((tipo) => (
            <View key={tipo.id} style={styles.tipo}>
              <Muestra color={tipo.color} />
              <Text style={[shType.caption, styles.codigo, { color: c.text }]}>{tipo.codigo}</Text>
              <Text style={[shType.caption, { color: c.textMuted }]}>{tipo.name}</Text>
            </View>
          ))}
          <View style={styles.tipo}>
            <View style={[styles.bloqueo, { borderColor: c.borderStrong }]} />
            <Text style={[shType.caption, { color: c.textMuted }]}>Bloqueo</Text>
          </View>
        </ScrollView>
      ) : null}

      <View style={styles.acciones}>
        {puedeCrear ? (
          <Button size="sm" onPress={onNueva} testID="agenda-nueva">
            Nueva cita
          </Button>
        ) : null}
        {onAjustes ? (
          <Button size="sm" variant="secondary" onPress={onAjustes} testID="agenda-ajustes">
            Ajustes
          </Button>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: shSpace[2] },
  chips: { alignItems: "center", gap: shSpace[2], paddingRight: shSpace[2] },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    overflow: "hidden",
  },
  chipPrincipal: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[1],
    minHeight: 40,
    paddingHorizontal: shSpace[3],
    maxWidth: 220,
  },
  solo: { borderLeftWidth: 1, paddingHorizontal: shSpace[2], minHeight: 40, justifyContent: "center" },
  muestra: { width: 10, height: 10, borderRadius: 5 },
  inicial: { fontFamily: shType.label.fontFamily, fontWeight: "700" },
  tipo: { flexDirection: "row", alignItems: "center", gap: 4 },
  codigo: { fontFamily: shType.label.fontFamily, fontWeight: "700" },
  bloqueo: { width: 20, height: 11, borderWidth: 1, borderStyle: "dashed", borderRadius: 2 },
  acciones: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[2] },
});
