import { useEffect, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMenuLateral, type MenuItem } from "../navigation/menu-lateral-context";
import { useSession } from "../session/session-context";
import type { RootStackParamList } from "../navigation/types";

type Icono = keyof typeof MaterialIcons.glyphMap;

const GLOBAL: { key: string; label: string; icon: Icono; screen: keyof RootStackParamList }[] = [
  { key: "carteras", label: "Carteras", icon: "map", screen: "Main" },
  { key: "perfil", label: "Perfil", icon: "person", screen: "Perfil" },
  { key: "configuracion", label: "Configuración", icon: "settings", screen: "Configuracion" },
];

const ANCHO_PANEL = 288;

/**
 * Menú lateral tipo hamburguesa: panel que se desliza desde la izquierda con
 * backdrop. Muestra los ítems contextuales registrados por la pantalla activa
 * (secciones de la cartera, filtros) y los globales (Carteras, Perfil,
 * Configuración, Cerrar sesión).
 */
export function MenuLateral() {
  const { abierto, cerrar, itemsExtra } = useMenuLateral();
  const { gestor, logout } = useSession();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [progreso] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progreso, {
      toValue: abierto ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [abierto, progreso]);

  const translateX = progreso.interpolate({
    inputRange: [0, 1],
    outputRange: [-ANCHO_PANEL, 0],
  });
  const opacidad = progreso.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  function ejecutar(accion: () => void) {
    cerrar();
    accion();
  }

  function Item({ item }: { item: MenuItem }) {
    return (
      <Pressable
        testID={`menu-item-${item.key}`}
        style={[styles.item, item.activo && styles.itemActivo]}
        onPress={() => ejecutar(item.onPress)}
      >
        <MaterialIcons
          name={item.icon as Icono}
          size={20}
          color={item.activo ? "#172f6c" : "#334155"}
        />
        <Text style={[styles.itemTexto, item.activo && styles.itemTextoActivo]}>
          {item.label}
        </Text>
      </Pressable>
    );
  }

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        pointerEvents={abierto ? "auto" : "none"}
        style={[styles.backdrop, { opacity: opacidad }]}
      >
        <Pressable
          testID="menu-backdrop"
          accessibilityLabel="Cerrar menú"
          style={StyleSheet.absoluteFill}
          onPress={cerrar}
        />
      </Animated.View>

      <Animated.View
        testID="menu-lateral"
        pointerEvents={abierto ? "auto" : "none"}
        style={[
          styles.panel,
          { paddingTop: insets.top + 20, transform: [{ translateX }] },
        ]}
      >
        <Text style={styles.marca}>Solver</Text>
        <Text style={styles.usuario}>{gestor ? `@${gestor.usuario}` : ""}</Text>

        <ScrollView contentContainerStyle={styles.scroll}>
          {itemsExtra.length > 0 ? (
            <>
              <View style={styles.items}>
                {itemsExtra.map((item) => (
                  <Item key={item.key} item={item} />
                ))}
              </View>
              <View style={styles.separador} />
            </>
          ) : null}

          <View style={styles.items}>
            {GLOBAL.map((item) => (
              <Pressable
                key={item.key}
                testID={`menu-item-${item.key}`}
                style={styles.item}
                onPress={() => ejecutar(() => navigation.navigate(item.screen as never))}
              >
                <MaterialIcons name={item.icon} size={20} color="#334155" />
                <Text style={styles.itemTexto}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.separador} />

          <Pressable
            testID="menu-logout"
            style={styles.item}
            onPress={() => ejecutar(() => void logout())}
          >
            <MaterialIcons name="logout" size={20} color="#dc2626" />
            <Text style={[styles.itemTexto, styles.salir]}>Cerrar sesión</Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  panel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: ANCHO_PANEL,
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    boxShadow: "4px 0 16px rgba(15, 23, 42, 0.18)",
  },
  scroll: { paddingBottom: 24 },
  marca: {
    fontSize: 22,
    fontWeight: "700",
    color: "#172f6c",
    fontFamily: "Roboto_700Bold",
  },
  usuario: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 16,
    fontFamily: "Roboto_400Regular",
  },
  items: { gap: 2 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  itemActivo: { backgroundColor: "#eef2ff" },
  itemTexto: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
    fontFamily: "Roboto_600SemiBold",
  },
  itemTextoActivo: { color: "#172f6c" },
  salir: { color: "#dc2626" },
  separador: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 12,
  },
});
