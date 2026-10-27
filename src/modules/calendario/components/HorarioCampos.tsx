import { StyleSheet, Switch, Text, View } from "react-native";
import { shSpace, shType } from "@core/theme/tokens";
import { TextField, useKit } from "@shared/ui";

import { DIAS_SEMANA, partirRango, type Horario } from "../domain/horario";

/** Editor de los 7 días (apertura, cierre y cerrado). No guarda; lo usa quien lo monta. */
export function HorarioCampos({
  horas,
  onChange,
  disabled = false,
  idBase = "horario",
}: {
  horas: Horario;
  onChange: (horas: Horario) => void;
  disabled?: boolean;
  idBase?: string;
}) {
  const { c } = useKit();

  function cambiar(dia: string, inicio: string, fin: string) {
    onChange({ ...horas, [dia]: inicio || fin ? `${inicio}-${fin}` : "" });
  }

  return (
    <View style={styles.contenedor}>
      {DIAS_SEMANA.map((dia) => {
        const valor = horas[dia.key] ?? "";
        const { inicio, fin } = partirRango(valor);
        const cerrado = !valor;
        return (
          <View key={dia.key} style={[styles.fila, { borderColor: c.border }]}>
            <Text style={[shType.label, styles.dia, { color: c.text }]}>{dia.label}</Text>
            <View style={styles.campos}>
              <TextField
                testID={`${idBase}-inicio-${dia.key}`}
                value={inicio}
                onChangeText={(texto) => cambiar(dia.key, texto, fin || "18:00")}
                placeholder="08:00"
                keyboardType="numbers-and-punctuation"
                disabled={cerrado || disabled}
                style={styles.campo}
                accessibilityLabel={`${dia.label}, abre`}
              />
              <Text style={{ color: c.textMuted }}>–</Text>
              <TextField
                testID={`${idBase}-fin-${dia.key}`}
                value={fin}
                onChangeText={(texto) => cambiar(dia.key, inicio || "08:00", texto)}
                placeholder="18:00"
                keyboardType="numbers-and-punctuation"
                disabled={cerrado || disabled}
                style={styles.campo}
                accessibilityLabel={`${dia.label}, cierra`}
              />
            </View>
            <View style={styles.cerrado}>
              <Text style={[shType.caption, { color: c.textMuted }]}>Cerrado</Text>
              <Switch
                testID={`${idBase}-cerrado-${dia.key}`}
                value={cerrado}
                disabled={disabled}
                onValueChange={(valorCerrado) =>
                  onChange({ ...horas, [dia.key]: valorCerrado ? "" : "08:00-18:00" })
                }
                trackColor={{ true: c.link, false: c.controlBorder }}
                thumbColor={c.surface}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: shSpace[2] },
  fila: { borderWidth: 1, borderRadius: 10, padding: shSpace[3], gap: shSpace[2] },
  dia: { fontFamily: shType.block.fontFamily },
  campos: { flexDirection: "row", alignItems: "center", gap: shSpace[2] },
  campo: { flex: 1, textAlign: "center" },
  cerrado: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: shSpace[2] },
});
