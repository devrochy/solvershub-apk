import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../theme/theme-context";
import type { ColoresTema } from "../theme/theme";

export interface BreadcrumbItem {
  key: string;
  label: string;
  onPress?(): void;
}

/** Ruta de navegación (breadcrumb) con segmentos enlazables. */
export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const { colores } = useTheme();
  const styles = useMemo(() => crearEstilos(colores), [colores]);
  return (
    <View testID="breadcrumb" style={styles.barra}>
      {items.map((item, indice) => (
        <View key={item.key} style={styles.item}>
          {indice > 0 ? (
            <MaterialIcons name="chevron-right" size={16} color={colores.textoSuave} />
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

function crearEstilos(c: ColoresTema) {
  return StyleSheet.create({
    barra: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 2,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: c.tarjeta,
      borderBottomWidth: 1,
      borderBottomColor: c.borde,
    },
    item: { flexDirection: "row", alignItems: "center", gap: 2 },
    texto: { fontSize: 12, color: c.textoSuave },
    enlace: { color: c.acento, fontWeight: "600", textDecorationLine: "underline" },
  });
}
