import { StyleSheet, View } from "react-native";

const COLORES: Record<string, string> = {
  verde: "#16a34a",
  rojo: "#dc2626",
  azul: "#2563eb",
  blanco: "#94a3b8",
};

/**
 * Indicador de color de una tarjeta/cliente: un punto circular del color
 * semántico, sin texto (A8). Aplica en listas de clientes, lista del día y
 * tarjeta de cliente.
 */
export function ColorBadge({ color }: { color: string; label?: string }) {
  return (
    <View
      testID={`color-badge-${color}`}
      style={[styles.punto, { backgroundColor: COLORES[color] ?? "#94a3b8" }]}
    />
  );
}

const styles = StyleSheet.create({
  punto: {
    width: 14,
    height: 14,
    borderRadius: 999,
  },
});