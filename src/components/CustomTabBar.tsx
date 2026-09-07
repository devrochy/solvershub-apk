import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { usePantallaActiva } from "../navigation/pantalla-activa-context";

const ICONOS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  Ruta: "map",
  Dia: "today",
  Clientes: "people",
};

/**
 * Tab bar custom (A9/N1): "Día" en el centro y sobresaliente (estilo FAB), con
 * "Ruta" a la izquierda y "Clientes" a la derecha. Al cambiar de tab se cierra
 * el overlay de detalle para que el nuevo tab muestre su propia sección.
 */
export function CustomTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const { cerrar } = usePantallaActiva();
  const orden = ["Ruta", "Dia", "Clientes"];
  const rutasOrdenadas = orden
    .map((name) => state.routes.find((r) => r.name === name))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  return (
    <View testID="tab-bar" style={[styles.barra, { paddingBottom: Math.max(insets.bottom, 8) + 8 }]}>
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
            // Al cambiar de tab, se cierra el detalle (overlay) si está abierto
            // para que el nuevo tab muestre su propia sección.
            cerrar();
            navigation.navigate(route.name);
          } else if (enfocado) {
            // Re-tocar el tab actual también cierra el detalle (volver a la lista).
            cerrar();
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
  centralActivo: { backgroundColor: "#2563eb" },
  etiqueta: { color: "#64748b", fontSize: 11, fontWeight: "600" },
  etiquetaActiva: { color: "#2563eb" },
});