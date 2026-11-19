import { StyleSheet, Text, View } from "react-native";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Button } from "./Button";
import { Icono } from "./icono";
import { useKit } from "./tema";

export type EstacionResumida = { id: string; titulo: string; resumen: string };

/**
 * «Revisar y publicar» (estación 5, HU-APP-23, tableros `rb5`/`rn5`): las estaciones ya hechas, cada una con lo
 * que quedó y «Editar», que vuelve a ella sin perder nada. El ✓ va con la palabra «hecha» para el lector.
 */
export function ResumenDeEstaciones({
  estaciones,
  onEditar,
  testID = "resumen-estaciones",
}: {
  estaciones: readonly EstacionResumida[];
  onEditar: (id: string) => void;
  testID?: string;
}) {
  const { c, escenario } = useKit();
  return (
    <View style={styles.lista} accessibilityLabel="Lo que ya está listo" testID={testID}>
      {estaciones.map((e) => (
        <View key={e.id} style={[styles.fila, { borderColor: c.border, backgroundColor: c.surface }]}>
          <View style={[styles.check, { backgroundColor: escenario.acento }]} importantForAccessibility="no-hide-descendants">
            <Icono name="check" size={14} color={escenario.sobreAcento} />
          </View>
          <View style={styles.texto} accessible accessibilityLabel={`${e.titulo} (hecha): ${e.resumen}`}>
            <Text style={[shType.label, { color: c.text }]}>{e.titulo}</Text>
            {e.resumen ? <Text style={[shType.caption, { color: c.textMuted }]}>{e.resumen}</Text> : null}
          </View>
          <Button variant="ghost" size="sm" onPress={() => onEditar(e.id)} testID={`${testID}-editar-${e.id}`} accessibilityHint={`Editar ${e.titulo}`}>
            Editar
          </Button>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { gap: shSpace[2] },
  fila: { flexDirection: "row", alignItems: "center", gap: shSpace[3], padding: shSpace[3], borderWidth: 1, borderRadius: shRadius.md },
  check: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  texto: { flex: 1, gap: shSpace[1] },
});
