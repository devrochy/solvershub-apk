import { StyleSheet, Text, View } from "react-native";
import { shSpace, shType } from "@core/theme/tokens";
import { Button, Icono, useKit } from "@shared/ui";
import { accionDelAviso, textoDelAviso } from "../logica";
import { useOnboarding } from "../contexto";

/**
 * Aviso fijo mientras el primer uso no esté completo (HU-APP-22): no se puede cerrar y desaparece solo
 * cuando el servidor da el recorrido por terminado. Va bajo el header del panel.
 */
export function AvisoDeOnboarding() {
  const { tonos } = useKit();
  const { recorrido, puedeTerminar, abierto, abrir } = useOnboarding();
  if (!recorrido?.avisar || !puedeTerminar || abierto) return null;
  const t = tonos.warning;
  return (
    <View
      testID="aviso-onboarding"
      accessibilityRole="summary"
      style={[
        styles.banda,
        { backgroundColor: t.bg, borderBottomColor: t.border },
      ]}
    >
      <Icono name="warning-amber" size={22} color={t.fg} />
      <Text style={[shType.label, styles.texto, { color: t.fg }]}>
        {textoDelAviso(recorrido)}
      </Text>
      <Button
        testID="aviso-onboarding-continuar"
        variant="secondary"
        size="sm"
        onPress={abrir}
      >
        {accionDelAviso(recorrido)}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  banda: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: shSpace[2],
    paddingHorizontal: shSpace[4],
    paddingVertical: shSpace[2],
    borderBottomWidth: 1,
  },
  texto: { flex: 1, minWidth: 160 },
});
