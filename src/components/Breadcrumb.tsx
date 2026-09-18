import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

export interface BreadcrumbItem {
  key: string;
  label: string;
  onPress?(): void;
}

/** Ruta de navegación (breadcrumb) con segmentos enlazables. */
export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <View testID="breadcrumb" style={styles.barra}>
      {items.map((item, indice) => (
        <View key={item.key} style={styles.item}>
          {indice > 0 ? (
            <MaterialIcons name="chevron-right" size={16} color="#94a3b8" />
          ) : null}
          <Pressable
            testID={`breadcrumb-${item.key}`}
            disabled={!item.onPress}
            onPress={item.onPress}
            hitSlop={4}
          >
            <Text style={[styles.texto, item.onPress ? styles.enlace : undefined]}>
              {item.label}
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  barra: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 2,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  item: { flexDirection: "row", alignItems: "center", gap: 2 },
  texto: { fontSize: 12, color: "#64748b" },
  enlace: { color: "#172f6c", fontWeight: "600", textDecorationLine: "underline" },
});
