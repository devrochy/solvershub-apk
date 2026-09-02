import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const ICONOS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  Rutas: "map",
  Dia: "today",
  Clientes: "people",
};

/**
 * Tab bar custom (A9): "Día" en el centro y sobresaliente (estilo FAB), con
 * iconos MaterialIcons + texto. Rutas y Clientes a los lados.
 */
export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const orden = ["Rutas", "Dia", "Clientes"];
  const rutasOrdenadas = orden
    .map((name) => state.routes.find((r) => r.name === name))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  return (
    <View style={styles.barra}>
      {rutasOrdenadas.map((route, indice) => {
        const descriptor = descriptors[route.key];
        const enfocado = state.index === state.routes.indexOf(route);
        const esCentral = route.name === "Dia";
        const onPress = () => {
          const evento = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!enfocado && !evento.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (esCentral) {
          return (
            <View key={route.key} style={styles.centralContenedor}>
              <Pressable
                testID="tab-central"
                onPress={onPress}
                style={[styles.central, enfocado && styles.centralActivo]}
              >
                <MaterialIcons
                  name={ICONOS[route.name]}
                  size={28}
                  color={enfocado ? "#ffffff" : "#2563eb"}
                />
              </Pressable>
              <Text style={[styles.etiqueta, enfocado && styles.etiquetaActiva]}>
                {descriptor.options.title ?? "Día"}
              </Text>
            </View>
          );
        }

        return (
          <Pressable
            key={route.key}
            testID={`tab-${route.name}`}
            onPress={onPress}
            style={styles.lateral}
          >
            <MaterialIcons
              name={ICONOS[route.name]}
              size={22}
              color={enfocado ? "#2563eb" : "#64748b"}
            />
            <Text style={[styles.etiqueta, enfocado && styles.etiquetaActiva]}>
              {descriptor.options.title ?? route.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  barra: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  lateral: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 4 },
  centralContenedor: { flex: 1, alignItems: "center", gap: 2 },
  central: {
    width: 58,
    height: 58,
    borderRadius: 999,
    backgroundColor: "#dbeafe",
    borderWidth: 3,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -26,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  centralActivo: { backgroundColor: "#2563eb" },
  etiqueta: { color: "#64748b", fontSize: 11, fontWeight: "600" },
  etiquetaActiva: { color: "#2563eb" },
});