import { StyleSheet, Text, View } from "react-native";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Icono, useKit } from "@shared/ui";

export interface BannerMensajeProps {
  texto: string;
  tipo: "error" | "exito";
}

/**
 * Banner de mensaje no bloqueante. Tono `success` para éxito y `danger` para
 * error, siempre con ícono (el color nunca va solo), de modo que el gestor
 * distinga un "guardado" de un fallo de un vistazo.
 */
export function BannerMensaje({ texto, tipo }: BannerMensajeProps) {
  const { c, tonos } = useKit();
  const esExito = tipo === "exito";
  const t = esExito ? tonos.success : tonos.danger;
  return (
    <View
      testID="banner-mensaje"
      accessibilityLiveRegion="polite"
      style={[styles.banner, { backgroundColor: t.bg, borderColor: t.border }]}
    >
      <Icono name={esExito ? "check-circle" : "error-outline"} size={18} color={t.fg} />
      <Text style={[shType.dense, styles.texto, { color: c.text }]}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[2],
    borderWidth: 1,
    borderRadius: shRadius.md,
    paddingHorizontal: shSpace[3],
    paddingVertical: 10,
  },
  texto: { flex: 1 },
});
