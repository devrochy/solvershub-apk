import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const ICONOS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  Perfil: "person",
  Rutas: "map",
  Configuracion: "settings",
};

/**
 * Menú inferior principal: "Rutas" en el centro y sobresaliente (estilo FAB),
 * con "Perfil" a la izquierda y "Configuración" a la derecha.
 */
export function CustomTabBarMain({
  state,
  descriptors,
  navigation,
  insets,
}: BottomTabBarProps) {
  const orden = ["Perfil", "Rutas", "Configuracion"];
  const rutasOrdenadas = orden
    .map((name) => state.routes.find((r) => r.name === name))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  return (
    <View
      testID="tab-bar-main"
      style={[styles.barra, { paddingBottom: Math.max(insets.bottom, 8) + 8 }]}
    >
      {rutasOrdenadas.map((route) => {
        const descriptor = descriptors[route.key];
        const enfocado = state.index === state.routes.indexOf(route);
        const esCentral = route.name === "Rutas";
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
                testID="tab-main-central"
                onPress={onPress}
                style={[styles.central, enfocado && styles.centralActivo]}
              >
                <MaterialIcons
                  name={ICONOS[route.name]}
                  size={28}
                  color={enfocado ? "#ffffff" : "#172f6c"}
                />
              </Pressable>
              <Text style={[styles.etiqueta, enfocado && styles.etiquetaActiva]}>
                {descriptor.options.title ?? "Rutas"}
              </Text>
            </View>
          );
        }

        return (
          <Pressable
            key={route.key}
            testID={`tab-main-${route.name}`}
            onPress={onPress}
            style={styles.lateral}
          >
            <MaterialIcons
              name={ICONOS[route.name]}
              size={22}
              color={enfocado ? "#172f6c" : "#64748b"}
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
    paddingHorizontal: 16,
    paddingTop: 6,
    boxShadow: "0 -1px 2px rgba(15, 23, 42, 0.06)",
  },
  lateral: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 4 },
  centralContenedor: { flex: 1, alignItems: "center", gap: 2 },
  central: {
    width: 58,
    height: 58,
    borderRadius: 999,
    borderCurve: "continuous",
    backgroundColor: "#dbeafe",
    borderWidth: 3,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -26,
    boxShadow: "0 3px 8px rgba(37, 99, 235, 0.28)",
  },
  centralActivo: { backgroundColor: "#172f6c" },
  etiqueta: { color: "#64748b", fontSize: 11, fontWeight: "600" },
  etiquetaActiva: { color: "#172f6c" },
});
