import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { shDensity, shSpace } from "@core/theme/tokens";
import { Icono, TextField, useKit } from "@shared/ui";

/** Caja para responder como persona, con el botón de enviar en la zona del pulgar. */
export function Composer({
  valor,
  onChange,
  onEnviar,
  enviando = false,
}: {
  valor: string;
  onChange: (texto: string) => void;
  onEnviar: () => void;
  enviando?: boolean;
}) {
  const { c, relleno } = useKit();
  const inactivo = enviando || !valor.trim();

  return (
    <View style={styles.contenedor}>
      <TextField
        testID="detalle-respuesta"
        value={valor}
        onChangeText={onChange}
        placeholder="Responder como persona…"
        accessibilityLabel="Mensaje para el cliente"
        multiline
        maxLength={4096}
        style={styles.campo}
      />
      <Pressable
        testID="detalle-enviar"
        accessibilityRole="button"
        accessibilityLabel="Enviar mensaje"
        accessibilityState={{ disabled: inactivo, busy: enviando }}
        disabled={inactivo}
        onPress={onEnviar}
        style={({ pressed }) => [
          styles.enviar,
          {
            backgroundColor: inactivo ? c.surface2 : relleno.primario,
            opacity: pressed ? 0.86 : 1,
          },
        ]}
      >
        {enviando ? (
          <ActivityIndicator color={relleno.sobrePrimario} size="small" />
        ) : (
          <Icono name="send" size={22} color={inactivo ? c.textSoft : relleno.sobrePrimario} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: shSpace[2],
    paddingHorizontal: shSpace[3],
    paddingVertical: shSpace[2],
  },
  campo: { flex: 1, minHeight: shDensity.controlLg, maxHeight: 120, textAlignVertical: "top" },
  enviar: {
    width: shDensity.controlLg,
    height: shDensity.controlLg,
    borderRadius: shDensity.controlLg / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
