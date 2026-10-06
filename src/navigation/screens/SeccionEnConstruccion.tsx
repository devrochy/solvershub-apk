import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@core/theme/theme-context";

export interface SeccionEnConstruccionProps {
  titulo: string;
  /** HU que implementa la sección real (se muestra como referencia). */
  detalle?: string;
}

/**
 * Placeholder de una sección del panel mientras llega su módulo (HU-APP-04+).
 * Reemplazado por el navigator real de cada módulo según el plan de SPEC-25.
 */
export function SeccionEnConstruccion({ titulo, detalle }: SeccionEnConstruccionProps) {
  const { colores } = useTheme();
  return (
    <View style={[styles.contenedor, { backgroundColor: colores.fondo }]}>
      <Text style={[styles.titulo, { color: colores.texto }]}>{titulo}</Text>
      <Text style={[styles.detalle, { color: colores.textoSuave }]}>
        Esta sección llega en {detalle ?? "una próxima entrega"}.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 10 },
  titulo: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  detalle: { fontSize: 14, textAlign: "center" },
});
