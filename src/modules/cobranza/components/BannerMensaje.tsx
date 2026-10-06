import { StyleSheet, Text, View } from "react-native";
import { conAlfa } from "@core/theme/alpha";
import { shColor } from "@core/theme/tokens";

export interface BannerMensajeProps {
  texto: string;
  tipo: "error" | "exito";
}

/**
 * Banner de mensaje no bloqueante. Verde para éxito, rojo para error, de modo
 * que el gestor distinga un "guardado" de un fallo de un vistazo.
 */
export function BannerMensaje({ texto, tipo }: BannerMensajeProps) {
  const esExito = tipo === "exito";
  return (
    <View
      testID="banner-mensaje"
      style={[styles.banner, esExito ? styles.exito : styles.error]}
    >
      <Text style={[styles.texto, esExito ? styles.textoExito : styles.textoError]}>
        {texto}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  exito: { backgroundColor: conAlfa(shColor.success, 0.12), borderColor: conAlfa(shColor.success, 0.3) },
  error: { backgroundColor: conAlfa(shColor.danger, 0.12), borderColor: conAlfa(shColor.danger, 0.3) },
  texto: { fontSize: 13, fontWeight: "500" },
  textoExito: { color: shColor.navy["900"] },
  textoError: { color: shColor.navy["900"] },
});
