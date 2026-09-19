import { useEffect, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "./Avatar";
import { useMenuLateral, type MenuItem } from "../navigation/menu-lateral-context";
import { useSession } from "../session/session-context";
import { useTheme } from "../theme/theme-context";
import type { RootStackParamList } from "../navigation/types";

type Icono = keyof typeof MaterialIcons.glyphMap;

const ANCHO_PANEL = 288;

/**
 * Ítem del menú. Si tiene `subItems`, se despliega en vez de ejecutarse; los
 * hijos se renderizan indentados debajo.
 */
function MenuRow({
  item,
  nivel = 0,
  onEjecutar,
}: {
  item: MenuItem;
  nivel?: number;
  onEjecutar(accion?: () => void): void;
}) {
  const { colores, tema } = useTheme();
  const [expandido, setExpandido] = useState(false);
  const tieneSub = (item.subItems?.length ?? 0) > 0;
  const colorActivo = tema === "claro" ? colores.primario : colores.texto;
  const color = item.activo ? colorActivo : colores.texto;

  return (
    <>
      <Pressable
        testID={`menu-item-${item.key}`}
        accessibilityRole="button"
        style={[
          styles.item,
          { paddingLeft: 8 + nivel * 16 },
          item.activo && { backgroundColor: colores.activoSuave },
        ]}
        onPress={() => (tieneSub ? setExpandido((v) => !v) : onEjecutar(item.onPress))}
      >
        <MaterialIcons name={item.icon as Icono} size={20} color={color} />
        <Text style={[styles.itemTexto, { color }]}>{item.label}</Text>
        {tieneSub ? (
          <MaterialIcons
            name={expandido ? "expand-more" : "chevron-right"}
            size={20}
            color={colores.textoSuave}
            style={styles.chevron}
          />
        ) : null}
      </Pressable>

      {tieneSub && expandido
        ? item.subItems!.map((sub) => (
            <MenuRow key={sub.key} item={sub} nivel={nivel + 1} onEjecutar={onEjecutar} />
          ))
        : null}
    </>
  );
}

/**
 * Menú lateral tipo hamburguesa: panel que se desliza desde la izquierda con
 * backdrop. Arriba los ítems contextuales de la pantalla activa (con submenús
 * desplegables) y al fondo la tarjeta de usuario (avatar + nombre) que despliega
 * Perfil / Configuración / Modo oscuro / Cerrar sesión.
 */
export function MenuLateral() {
  const { abierto, cerrar, itemsExtra } = useMenuLateral();
  const { gestor, logout } = useSession();
  const { colores, tema, alternarTema } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [progreso] = useState(() => new Animated.Value(0));
  const [usuarioAbierto, setUsuarioAbierto] = useState(false);

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

  function ejecutar(accion?: () => void) {
    cerrar();
    accion?.();
  }

  const nombre = `${gestor?.nombre ?? ""} ${gestor?.apellido ?? ""}`.trim() || "Usuario";

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
          {
            backgroundColor: colores.tarjeta,
            paddingTop: insets.top + 20,
            transform: [{ translateX }],
          },
        ]}
      >
        <Text style={[styles.marca, { color: colores.texto }]}>Solver</Text>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.items}>
            {itemsExtra.map((item) => (
              <MenuRow key={item.key} item={item} onEjecutar={ejecutar} />
            ))}
          </View>

          <View style={[styles.separador, { backgroundColor: colores.borde }]} />

          <Pressable
            testID="menu-usuario"
            accessibilityRole="button"
            accessibilityLabel={`Cuenta de ${nombre}`}
            style={[styles.usuarioCard, { backgroundColor: colores.fondo }]}
            onPress={() => setUsuarioAbierto((v) => !v)}
          >
            <Avatar nombre={nombre} size={36} />
            <View style={styles.usuarioInfo}>
              <Text style={[styles.usuarioNombre, { color: colores.texto }]} numberOfLines={1}>
                {nombre}
              </Text>
              <Text style={[styles.usuarioHandle, { color: colores.textoSuave }]} numberOfLines={1}>
                @{gestor?.usuario ?? ""}
              </Text>
            </View>
            <MaterialIcons
              name={usuarioAbierto ? "expand-more" : "chevron-right"}
              size={22}
              color={colores.textoSuave}
            />
          </Pressable>

          {usuarioAbierto ? (
            <View style={styles.items}>
              <Pressable
                testID="menu-item-perfil"
                style={[styles.item, styles.itemIndentado]}
                onPress={() => ejecutar(() => navigation.navigate("Perfil"))}
              >
                <MaterialIcons name="person" size={20} color={colores.texto} />
                <Text style={[styles.itemTexto, { color: colores.texto }]}>Perfil</Text>
              </Pressable>
              <Pressable
                testID="menu-item-configuracion"
                style={[styles.item, styles.itemIndentado]}
                onPress={() => ejecutar(() => navigation.navigate("Configuracion"))}
              >
                <MaterialIcons name="settings" size={20} color={colores.texto} />
                <Text style={[styles.itemTexto, { color: colores.texto }]}>Configuración</Text>
              </Pressable>
              <Pressable
                testID="menu-item-modo"
                style={[styles.item, styles.itemIndentado]}
                onPress={alternarTema}
              >
                <MaterialIcons
                  name={tema === "oscuro" ? "dark-mode" : "light-mode"}
                  size={20}
                  color={colores.texto}
                />
                <Text style={[styles.itemTexto, { color: colores.texto }]}>
                  {tema === "oscuro" ? "Modo claro" : "Modo oscuro"}
                </Text>
              </Pressable>
              <Pressable
                testID="menu-logout"
                style={[styles.item, styles.itemIndentado]}
                onPress={() => ejecutar(() => void logout())}
              >
                <MaterialIcons name="logout" size={20} color={colores.peligro} />
                <Text style={[styles.itemTexto, { color: colores.peligro }]}>Cerrar sesión</Text>
              </Pressable>
            </View>
          ) : null}
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
    paddingHorizontal: 16,
    boxShadow: "4px 0 16px rgba(15, 23, 42, 0.18)",
  },
  scroll: { paddingBottom: 24, flexGrow: 1, justifyContent: "space-between" },
  marca: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Roboto_700Bold",
    marginBottom: 16,
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
  itemIndentado: { paddingLeft: 24 },
  itemTexto: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Roboto_600SemiBold",
  },
  chevron: { marginLeft: "auto" },
  separador: {
    height: 1,
    marginVertical: 12,
  },
  usuarioCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  usuarioInfo: { flex: 1 },
  usuarioNombre: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Roboto_700Bold",
  },
  usuarioHandle: {
    fontSize: 12,
    fontFamily: "Roboto_400Regular",
  },
});
