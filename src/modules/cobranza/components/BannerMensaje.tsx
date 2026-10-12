import { StyleSheet, Text, View } from "react-native";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Icono, useKit } from "@shared/ui";

export interface BannerMensajeProps {
  texto: string;
  tipo: "error" | "exito" | "aviso";
}

/**
 * Banner de mensaje no bloqueante. Tono `success` para éxito, `danger` para
 * error y `warning` para aviso (por ejemplo, "guardado sin conexión": no es un
 * fallo, pero falta enviarlo). Siempre con ícono: el color nunca va solo.
 */
export function BannerMensaje({ texto, tipo }: BannerMensajeProps) {
  const { c, tonos } = useKit();
  const t = tipo === "exito" ? tonos.success : tipo === "aviso" ? tonos.warning : tonos.danger;
  const icono = tipo === "exito" ? "check-circle" : tipo === "aviso" ? "cloud-upload" : "error-outline";
  return (
    <View
      testID="banner-mensaje"
      accessibilityLiveRegion="polite"
      style={[styles.banner, { backgroundColor: t.bg, borderColor: t.border }]}
    >
      <Icono name={icono} size={18} color={t.fg} />
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
