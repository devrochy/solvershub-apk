import { Fragment, useEffect, useState } from "react";
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

  if (item.grupo) {
    return (
      <View
        testID={`menu-grupo-${item.key}`}
        style={[styles.grupo, { backgroundColor: colores.fondo, borderColor: colores.borde }]}
      >
        <View style={styles.grupoTitulo}>
          <MaterialIcons name={item.icon as Icono} size={16} color={colores.acento} />
          <Text style={[styles.grupoTituloTexto, { color: colores.texto }]} numberOfLines={1}>
            {item.label}
          </Text>
        </View>
        {item.subItems!.map((sub) => (
          <MenuRow key={sub.key} item={sub} nivel={nivel + 1} onEjecutar={onEjecutar} />
        ))}
      </View>
    );
  }

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
        {item.activo ? (
          <View
            testID={`menu-item-accent-${item.key}`}
            style={[styles.itemAccent, { backgroundColor: colorActivo }]}
          />
        ) : null}
        {item.color ? (
          <View style={[styles.dot, { backgroundColor: item.color }]} />
        ) : (
          <MaterialIcons name={item.icon as Icono} size={20} color={color} />
        )}
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
  const [animUsuario] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progreso, {
      toValue: abierto ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [abierto, progreso]);

  useEffect(() => {
    Animated.timing(animUsuario, {
      toValue: usuarioAbierto ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [usuarioAbierto, animUsuario]);

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
            borderColor: colores.borde,
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom,
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={styles.marcaFila}>
          <View style={[styles.marcaLogo, { backgroundColor: colores.primario }]}>
            <MaterialIcons name="route" size={18} color={colores.sobrePrimario} />
          </View>
          <Text style={[styles.marca, { color: colores.texto }]}>Solver</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.items}>
            {itemsExtra.map((item, indice) => (
              <Fragment key={item.key}>
                <MenuRow item={item} onEjecutar={ejecutar} />
                {indice === 0 ? (
                  <View style={[styles.separador, { backgroundColor: colores.borde }]} />
                ) : null}
              </Fragment>
            ))}
          </View>

          <View testID="menu-usuario-zona">
            {usuarioAbierto ? (
              <Animated.View
                testID="menu-usuario-submenu"
                style={[
                  styles.submenu,
                  {
                    backgroundColor: colores.fondo,
                    borderColor: colores.borde,
                    opacity: animUsuario,
                    transform: [
                      {
                        translateY: animUsuario.interpolate({
                          inputRange: [0, 1],
                          outputRange: [8, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Pressable
                  testID="menu-item-perfil"
                  style={styles.submenuItem}
                  onPress={() => ejecutar(() => navigation.navigate("Perfil"))}
                >
                  <MaterialIcons name="person" size={20} color={colores.texto} />
                  <Text style={[styles.itemTexto, { color: colores.texto }]}>Perfil</Text>
                </Pressable>
                <Pressable
                  testID="menu-item-configuracion"
                  style={styles.submenuItem}
                  onPress={() => ejecutar(() => navigation.navigate("Configuracion"))}
                >
                  <MaterialIcons name="settings" size={20} color={colores.texto} />
                  <Text style={[styles.itemTexto, { color: colores.texto }]}>Configuración</Text>
                </Pressable>
                <Pressable
                  testID="menu-item-modo"
                  style={styles.submenuItem}
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
                <View style={[styles.submenuSeparador, { backgroundColor: colores.borde }]} />
                <Pressable
                  testID="menu-logout"
                  style={styles.submenuItem}
                  onPress={() => ejecutar(() => void logout())}
                >
                  <MaterialIcons name="logout" size={20} color={colores.peligro} />
                  <Text style={[styles.itemTexto, { color: colores.peligro }]}>Cerrar sesión</Text>
                </Pressable>
              </Animated.View>
            ) : null}

            <Pressable
              testID="menu-usuario"
              accessibilityRole="button"
              accessibilityLabel={`Cuenta de ${nombre}`}
              style={[styles.usuarioCard, { backgroundColor: colores.primario }]}
              onPress={() => setUsuarioAbierto((v) => !v)}
            >
              <Avatar
                nombre={nombre}
                size={40}
                fondo="rgba(255,255,255,0.18)"
                colorIcono={colores.sobrePrimario}
                bordeColor="rgba(255,255,255,0.35)"
              />
              <View style={styles.usuarioInfo}>
                <Text
                  style={[styles.usuarioNombre, { color: colores.sobrePrimario }]}
                  numberOfLines={1}
                >
                  {nombre}
                </Text>
                <Text
                  style={[styles.usuarioHandle, { color: colores.sobrePrimario }]}
                  numberOfLines={1}
                >
                  @{gestor?.usuario ?? ""}
                </Text>
              </View>
              <MaterialIcons
                name={usuarioAbierto ? "expand-more" : "chevron-right"}
                size={22}
                color={colores.sobrePrimario}
              />
            </Pressable>
          </View>
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
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    borderRightWidth: 1,
    borderCurve: "continuous",
    boxShadow: "8px 0 24px rgba(15, 23, 42, 0.22)",
  },
  scroll: { paddingBottom: 24, flexGrow: 1, justifyContent: "space-between" },
  marcaFila: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  marcaLogo: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  marca: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Montserrat_700Bold",
  },
  items: { gap: 2 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  submenu: {
    borderWidth: 1,
    borderRadius: 14,
    borderCurve: "continuous",
    padding: 6,
    marginBottom: 10,
    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.10)",
  },
  submenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderCurve: "continuous",
  },
  submenuSeparador: {
    height: 1,
    marginVertical: 4,
    marginHorizontal: 10,
  },
  itemTexto: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Montserrat_600SemiBold",
  },
  chevron: { marginLeft: "auto" },
  dot: { width: 10, height: 10, borderRadius: 5, marginHorizontal: 5 },
  grupo: {
    borderWidth: 1,
    borderRadius: 14,
    borderCurve: "continuous",
    padding: 6,
    marginVertical: 4,
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
  },
  grupoTitulo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  grupoTituloTexto: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Montserrat_700Bold",
  },
  itemAccent: {
    position: "absolute",
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
  separador: {
    height: 1,
    marginVertical: 12,
  },
  usuarioCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderCurve: "continuous",
    boxShadow: "0 6px 16px rgba(15, 23, 42, 0.18)",
  },
  usuarioInfo: { flex: 1 },
  usuarioNombre: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Montserrat_700Bold",
  },
  usuarioHandle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    opacity: 0.75,
  },
});
