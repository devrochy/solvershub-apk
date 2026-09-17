import { StyleSheet, Text, View } from "react-native";

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
  exito: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
  error: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
  texto: { fontSize: 13, fontWeight: "500" },
  textoExito: { color: "#15803d" },
  textoError: { color: "#b91c1c" },
});
