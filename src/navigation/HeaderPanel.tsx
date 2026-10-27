import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAdminSession } from "@core/session/admin-session-context";
import { shSpace, shType } from "@core/theme/tokens";
import { CampanaDelPanel, IconButton, useKit } from "@shared/ui";
import { AvisoDeOnboarding } from "../modules/onboarding";
import { useMenuPanel } from "./menu-panel-context";

/**
 * Header del panel en la app (HU-DS-11, D-34): hamburguesa que abre el cajón,
 * título del módulo con el nombre del negocio debajo, búsqueda y campana. El
 * tema se cambia desde la tarjeta de la cuenta del cajón. La lupa abre la
 * Búsqueda, que en el panel web también vive en la topbar y no en el menú
 * (HU-UX-11). Reserva el área segura superior (edge-to-edge): va en la raíz de
 * cada módulo.
 */
export function HeaderPanel({ titulo, conBusqueda = true }: { titulo: string; conBusqueda?: boolean }) {
  const { c } = useKit();
  const { sesion } = useAdminSession();
  const { abrir, irA } = useMenuPanel();
  const insets = useSafeAreaInsets();

  return (
    <>
      <View
        testID="panel-header"
        style={[styles.banda, { backgroundColor: c.surface, borderBottomColor: c.border, paddingTop: insets.top }]}
      >
        <View style={styles.fila}>
          <IconButton testID="panel-menu" icon="menu" label="Abrir menú" onPress={abrir} />
          <View style={styles.titulos}>
            <Text testID="panel-titulo" accessibilityRole="header" style={[styles.titulo, { color: c.text }]} numberOfLines={1}>
              {titulo}
            </Text>
            {sesion?.tenantName ? (
              <Text testID="panel-negocio" style={[shType.caption, { color: c.textMuted }]} numberOfLines={1}>
                {sesion.tenantName}
              </Text>
            ) : null}
          </View>
          {conBusqueda ? (
            <IconButton testID="panel-buscar" icon="search" label="Buscar" onPress={() => irA({ modulo: "busqueda" })} />
          ) : null}
          {/* Siempre al extremo derecho (ADR-0167). */}
          <CampanaDelPanel />
        </View>
      </View>
      <AvisoDeOnboarding />
    </>
  );
}

const styles = StyleSheet.create({
  banda: { borderBottomWidth: 1 },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[2],
    paddingHorizontal: shSpace[2],
    paddingVertical: shSpace[1],
  },
  titulos: { flex: 1 },
  titulo: { ...shType.block, fontFamily: shType.hero.fontFamily },
});
