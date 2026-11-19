import { StyleSheet, Text, View } from "react-native";
import { shSpace, shType } from "@core/theme/tokens";
import { textoDeCambios } from "../ruta-de-lanzamiento";
import { Button } from "./Button";
import { Icono } from "./icono";
import { useKit } from "./tema";

export const TEXTO_RECOMENDADO = "Todo viene con lo recomendado por SolversHub";

/**
 * Línea de lo recomendado de una estación (HU-APP-23, mismo texto que el panel): dice que todo llegó preelegido
 * y, si el dueño cambió algo, cuántos cambios lleva y ofrece «Usar lo recomendado». Los cambios los cuenta
 * `cambiosFrenteARecomendado`; volver a lo recomendado lo hace quien la usa con `onUsar`.
 */
export function BarraRecomendado({ cambios, onUsar, testID }: { cambios: number; onUsar: () => void; testID?: string }) {
  const { tonos, c } = useKit();
  const conCambios = cambios > 0;
  return (
    <View style={styles.fila} testID={testID}>
      <View style={styles.texto} accessible accessibilityLiveRegion="polite">
        <Icono name="check" size={18} color={tonos.success.fg} />
        <Text style={[shType.label, styles.flex, { color: tonos.success.fg }]}>
          {TEXTO_RECOMENDADO}
          {conCambios ? <Text style={[shType.dense, { color: c.text }]}> · {textoDeCambios(cambios)}</Text> : null}
        </Text>
      </View>
      {conCambios ? (
        <Button
          variant="secondary"
          size="sm"
          iconLeft="restart-alt"
          onPress={onUsar}
          testID={testID ? `${testID}-usar` : undefined}
        >
          Usar lo recomendado
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { gap: shSpace[2] },
  texto: { flexDirection: "row", alignItems: "center", gap: shSpace[2] },
  flex: { flexShrink: 1 },
});
