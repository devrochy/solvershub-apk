import { Fragment, useEffect, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Avatar } from "../modules/cobranza/components/Avatar";
import { useMenuLateral, type MenuItem } from "../modules/cobranza/navigation/menu-lateral-context";
import { useSession } from "../modules/cobranza/session/session-context";
import { useAdminSession } from "@core/session/admin-session-context";
import { useTheme } from "@core/theme/theme-context";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { Drawer, useKit } from "@shared/ui";
import type { RootStackParamList } from "../modules/cobranza/navigation/types";

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
  const { c, ripple } = useKit();
  const [expandido, setExpandido] = useState(false);
  const tieneSub = (item.subItems?.length ?? 0) > 0;
  // Indicador de activo del kit (como `ListItem`): barra `link` de 3 px y fondo
  // `surfaceRaised`; el texto activo va en `textStrong`.
  const colorActivo = c.link;
  const color = item.activo ? c.textStrong : c.text;

  if (item.grupo) {
    return (
      <View
        testID={`menu-grupo-${item.key}`}
        style={[styles.grupo, { backgroundColor: c.bg, borderColor: c.border, boxShadow: c.elev1 }]}
      >
        <View style={styles.grupoTitulo}>
          <MaterialIcons name={item.icon as Icono} size={16} color={c.link} />
          <Text
            accessibilityRole="header"
            style={[styles.grupoTituloTexto, { color: c.text }]}
            numberOfLines={1}
          >
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
        accessibilityState={tieneSub ? { expanded: expandido, selected: item.activo } : { selected: item.activo }}
        android_ripple={{ color: ripple.superficie }}
        style={[
          styles.item,
          { paddingLeft: shSpace[2] + nivel * shSpace[4] },
          item.activo && { backgroundColor: c.surfaceRaised },
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
            color={c.textSoft}
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
 * Menú lateral de campo (D-SPEC-29-6): un `Drawer` del kit con, arriba, los
 * ítems contextuales de la pantalla activa (con submenús desplegables) y al
 * fondo la tarjeta de usuario (avatar + nombre) que despliega Perfil /
 * Configuración / Modo oscuro / Cerrar sesión. No cierra con el botón atrás:
 * de eso se encarga `CarteraFlujo`.
 */
export function MenuLateral() {
  const { abierto, cerrar, itemsExtra } = useMenuLateral();
  const { gestor, logout } = useSession();
  const { logout: logoutAdmin } = useAdminSession();
  const { tema, alternarTema } = useTheme();
  const { c, banda, relleno, ripple } = useKit();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [usuarioAbierto, setUsuarioAbierto] = useState(false);
  const [animUsuario] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(animUsuario, {
      toValue: usuarioAbierto ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [usuarioAbierto, animUsuario]);

  function ejecutar(accion?: () => void) {
    cerrar();
    accion?.();
  }

  const nombre = `${gestor?.nombre ?? ""} ${gestor?.apellido ?? ""}`.trim() || "Usuario";

  return (
    <Drawer
      abierto={abierto}
      onCerrar={cerrar}
      ancho={ANCHO_PANEL}
      testID="menu-lateral"
      testIDFondo="menu-backdrop"
      style={styles.panel}
    >
        <View style={styles.marcaFila}>
          <View style={[styles.marcaLogo, { backgroundColor: banda.fondo }]}>
            <MaterialIcons name="route" size={18} color={banda.texto} />
          </View>
          <Text style={[styles.marca, { color: c.text }]}>Solver</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.items}>
            {itemsExtra.map((item, indice) => (
              <Fragment key={item.key}>
                <MenuRow item={item} onEjecutar={ejecutar} />
                {indice === 0 ? (
                  <View style={[styles.separador, { backgroundColor: c.border }]} />
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
                    backgroundColor: c.bg,
                    borderColor: c.border,
                    boxShadow: c.elev2,
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
                  accessibilityRole="button"
                  android_ripple={{ color: ripple.superficie }}
                  style={styles.submenuItem}
                  onPress={() => ejecutar(() => navigation.navigate("Perfil"))}
                >
                  <MaterialIcons name="person" size={20} color={c.text} />
                  <Text style={[styles.itemTexto, { color: c.text }]}>Perfil</Text>
                </Pressable>
                <Pressable
                  testID="menu-item-configuracion"
                  accessibilityRole="button"
                  android_ripple={{ color: ripple.superficie }}
                  style={styles.submenuItem}
                  onPress={() => ejecutar(() => navigation.navigate("Configuracion"))}
                >
                  <MaterialIcons name="settings" size={20} color={c.text} />
                  <Text style={[styles.itemTexto, { color: c.text }]}>Configuración</Text>
                </Pressable>
                <Pressable
                  testID="menu-item-modo"
                  accessibilityRole="button"
                  android_ripple={{ color: ripple.superficie }}
                  style={styles.submenuItem}
                  onPress={alternarTema}
                >
                  <MaterialIcons
                    name={tema === "oscuro" ? "dark-mode" : "light-mode"}
                    size={20}
                    color={c.text}
                  />
                  <Text style={[styles.itemTexto, { color: c.text }]}>
                    {tema === "oscuro" ? "Modo claro" : "Modo oscuro"}
                  </Text>
                </Pressable>
                <View style={[styles.submenuSeparador, { backgroundColor: c.border }]} />
                <Pressable
                  testID="menu-logout"
                  accessibilityRole="button"
                  android_ripple={{ color: ripple.superficie }}
                  style={styles.submenuItem}
                  onPress={() => ejecutar(async () => {
                    await logout();
                    await logoutAdmin();
                  })}
                >
                  <MaterialIcons name="logout" size={20} color={c.statusDangerFg} />
                  <Text style={[styles.itemTexto, { color: c.statusDangerFg }]}>Cerrar sesión</Text>
                </Pressable>
              </Animated.View>
            ) : null}

            <Pressable
              testID="menu-usuario"
              accessibilityRole="button"
              accessibilityLabel={`Cuenta de ${nombre}`}
              accessibilityState={{ expanded: usuarioAbierto }}
              android_ripple={{ color: ripple.relleno }}
              style={[styles.usuarioCard, { backgroundColor: banda.fondo, boxShadow: c.elev2 }]}
              onPress={() => setUsuarioAbierto((v) => !v)}
            >
              <Avatar
                nombre={nombre}
                size={40}
                fondo={banda.relleno}
                colorIcono={relleno.sobrePrimario}
                bordeColor={banda.borde}
              />
              <View style={styles.usuarioInfo}>
                <Text
                  style={[styles.usuarioNombre, { color: banda.texto }]}
                  numberOfLines={1}
                >
                  {nombre}
                </Text>
                <Text
                  style={[styles.usuarioHandle, { color: banda.textoSuave }]}
                  numberOfLines={1}
                >
                  @{gestor?.usuario ?? ""}
                </Text>
              </View>
              <MaterialIcons
                name={usuarioAbierto ? "expand-more" : "chevron-right"}
                size={22}
                color={banda.texto}
              />
            </Pressable>
          </View>
        </ScrollView>
    </Drawer>
  );
}

const styles = StyleSheet.create({
  // Sombra propia del campo (la del kit es `elev3`); sin cambio visual.
  panel: {
    boxShadow: "8px 0 24px rgba(15, 23, 42, 0.22)",
  },
  scroll: { paddingBottom: shSpace[6], flexGrow: 1, justifyContent: "space-between" },
  marcaFila: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: shSpace[4] },
  marcaLogo: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  marca: {
    ...shType.h1,
    fontFamily: shType.hero.fontFamily,
  },
  items: { gap: 2 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[3],
    minHeight: shDensity.rowComfortable,
    paddingVertical: shSpace[2],
    paddingHorizontal: shSpace[2],
    borderRadius: shRadius.md,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  submenu: {
    borderWidth: 1,
    borderRadius: 14,
    borderCurve: "continuous",
    padding: 6,
    marginBottom: 10,
  },
  submenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[3],
    minHeight: shDensity.rowComfortable,
    paddingVertical: shSpace[2],
    paddingHorizontal: 10,
    borderRadius: 10,
    overflow: "hidden",
    borderCurve: "continuous",
  },
  submenuSeparador: {
    height: 1,
    marginVertical: 4,
    marginHorizontal: 10,
  },
  itemTexto: {
    ...shType.body,
    flex: 1,
    fontFamily: shType.block.fontFamily,
  },
  chevron: { marginLeft: "auto" },
  dot: { width: 10, height: 10, borderRadius: 5, marginHorizontal: 5 },
  grupo: {
    borderWidth: 1,
    borderRadius: 14,
    borderCurve: "continuous",
    padding: 6,
    marginVertical: 4,
  },
  grupoTitulo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  grupoTituloTexto: {
    ...shType.label,
    flex: 1,
    fontFamily: shType.hero.fontFamily,
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
    gap: shSpace[3],
    minHeight: shDensity.controlLg,
    paddingVertical: shSpace[3],
    paddingHorizontal: shSpace[3],
    overflow: "hidden",
    borderRadius: 16,
    borderCurve: "continuous",
  },
  usuarioInfo: { flex: 1 },
  usuarioNombre: {
    ...shType.label,
    fontFamily: shType.hero.fontFamily,
  },
  usuarioHandle: {
    ...shType.caption,
  },
});
