import { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import type { Tema } from "@core/theme/theme";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { Avatar, Icono, useKit } from "@shared/ui";

export interface CuentaPanelProps {
  /** El cajón está abierto; el padre remonta la tarjeta al abrir/cerrar para plegar el submenú. */
  abierto: boolean;
  nombre: string;
  email: string;
  avatarUrl?: string | null;
  tema: Tema;
  onAlternarTema(): void;
  onPerfil(): void;
  onCerrarSesion(): void;
}

/**
 * Tarjeta de la cuenta fija al pie del cajón: avatar, nombre y correo. Al
 * tocarla despliega hacia arriba Perfil, Tema oscuro y Cerrar sesión, como la
 * `UserCard` del sidebar del panel web.
 */
export function CuentaPanel({
  abierto,
  nombre,
  email,
  avatarUrl,
  tema,
  onAlternarTema,
  onPerfil,
  onCerrarSesion,
}: CuentaPanelProps) {
  const { c, ripple } = useKit();
  const [submenu, setSubmenu] = useState(false);
  const [anim] = useState(() => new Animated.Value(0));
  const oscuro = tema === "oscuro";
  const mostrarSubmenu = abierto && submenu;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: mostrarSubmenu ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [anim, mostrarSubmenu]);

  const ejecutar = (accion: () => void) => {
    setSubmenu(false);
    accion();
  };

  return (
    <View testID="cajon-cuenta-zona">
      {mostrarSubmenu ? (
        <Animated.View
          testID="cajon-cuenta-submenu"
          style={[
            styles.submenu,
            {
              backgroundColor: c.surface,
              borderColor: c.border,
              boxShadow: c.elev2,
              opacity: anim,
              transform: [
                {
                  translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }),
                },
              ],
            },
          ]}
        >
          <Pressable
            testID="cajon-perfil"
            accessibilityRole="button"
            android_ripple={{ color: ripple.superficie }}
            style={styles.submenuItem}
            onPress={() => ejecutar(onPerfil)}
          >
            <Icono name="person" size={20} color={c.text} />
            <Text style={[styles.itemTexto, { color: c.text }]}>Perfil</Text>
          </Pressable>

          <View style={styles.temaFila}>
            <Icono name="palette" size={20} color={c.textMuted} />
            <Text style={[styles.itemTexto, { color: c.text }]}>Tema oscuro</Text>
            <Switch
              testID="cajon-tema"
              accessibilityLabel="Tema oscuro"
              value={oscuro}
              onValueChange={onAlternarTema}
              trackColor={{ false: c.controlBorder, true: c.link }}
              thumbColor={c.surface}
            />
          </View>

          <View style={[styles.separador, { backgroundColor: c.border }]} />
          <Pressable
            testID="cajon-logout"
            accessibilityRole="button"
            android_ripple={{ color: ripple.superficie }}
            style={styles.submenuItem}
            onPress={() => ejecutar(onCerrarSesion)}
          >
            <Icono name="logout" size={20} color={c.statusDangerFg} />
            <Text style={[styles.itemTexto, { color: c.statusDangerFg }]}>Cerrar sesión</Text>
          </Pressable>
        </Animated.View>
      ) : null}

      <Pressable
        testID="cajon-cuenta"
        accessibilityRole="button"
        accessibilityLabel={`Cuenta de ${nombre}`}
        accessibilityState={{ expanded: mostrarSubmenu }}
        android_ripple={{ color: ripple.superficie }}
        style={[styles.cuenta, { backgroundColor: c.surfaceRaised, borderColor: c.border }]}
        onPress={() => setSubmenu((valor) => !valor)}
      >
        <Avatar name={nombre} src={avatarUrl} size="md" />
        <View style={styles.info}>
          <Text style={[styles.nombre, { color: c.text }]} numberOfLines={1}>
            {nombre}
          </Text>
          <Text style={[styles.email, { color: c.textMuted }]} numberOfLines={1}>
            {email}
          </Text>
        </View>
        <Icono name={mostrarSubmenu ? "expand-more" : "expand-less"} size={22} color={c.textSoft} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  submenu: {
    borderWidth: 1,
    borderRadius: 14,
    borderCurve: "continuous",
    padding: 6,
    marginBottom: shSpace[2],
  },
  submenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[3],
    minHeight: shDensity.rowComfortable,
    paddingHorizontal: 10,
    borderRadius: 10,
    overflow: "hidden",
    borderCurve: "continuous",
  },
  temaFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[3],
    minHeight: shDensity.rowComfortable,
    paddingHorizontal: 10,
  },
  separador: { height: 1, marginVertical: 4, marginHorizontal: 10 },
  itemTexto: {
    ...shType.body,
    flex: 1,
    fontFamily: shType.block.fontFamily,
  },
  cuenta: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[3],
    minHeight: shDensity.controlLg + shSpace[2],
    paddingVertical: shSpace[2],
    paddingHorizontal: shSpace[3],
    borderWidth: 1,
    borderRadius: shRadius.lg,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  info: { flex: 1 },
  nombre: { ...shType.label, fontFamily: shType.hero.fontFamily },
  email: { ...shType.caption },
});
