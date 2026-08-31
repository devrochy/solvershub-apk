import { StyleSheet, Text, View } from "react-native";

const COLORES: Record<string, string> = {
  verde: "#16a34a",
  rojo: "#dc2626",
  azul: "#2563eb",
  blanco: "#94a3b8",
};

export function ColorBadge({
  color,
  label,
}: {
  color: string;
  label?: string;
}) {
  return (
    <View
      testID={`color-badge-${color}`}
      style={[styles.badge, { backgroundColor: COLORES[color] ?? "#94a3b8" }]}
    >
      <Text style={styles.texto}>{label ?? color}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  texto: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
});