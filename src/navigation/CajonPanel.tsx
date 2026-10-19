import { useContext, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAdminSession } from "@core/session/admin-session-context";
import { useTheme } from "@core/theme/theme-context";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { Drawer, Icono, ListItem, NavGroup, useKit } from "@shared/ui";
import { SessionContext } from "../modules/cobranza/session/session-context";
import { entradaContiene, gruposDeMenu, type EntradaVisible } from "./menu-panel";
import { useMenuPanel, type DestinoPanel } from "./menu-panel-context";

/** Entrada resaltada: contiene el destino activo (módulo y pestaña exactos). */
function esActiva(entrada: EntradaVisible, activo: DestinoPanel | null): boolean {
  return activo !== null && entradaContiene(entrada, activo);
}

/**
 * Cajón lateral del panel en la app (HU-DS-11, D-34): la misma lista agrupada
 * que el sidebar del panel web (menú v2, HU-UX-11), filtrada por permisos. Cada
 * entrada abre su primera pestaña permitida; la de un pack no habilitado queda
 * con candado. Abajo, la cuenta: negocio y correo, tema y cerrar sesión.
 */
export function CajonPanel() {
  const { c } = useKit();
  const { tema, alternarTema } = useTheme();
  const { sesion, logout: logoutAdmin } = useAdminSession();
  // Un propietario/master con tokens de campo también tiene sesión de campo:
  // se cierra junto con la de admin, como en el menú de campo.
  const campo = useContext(SessionContext);
  const { abierto, cerrar, activo, gruposAbiertos, alternarGrupo, irA } = useMenuPanel();

  const esMaster = sesion?.role === "master";
  const permisos = sesion?.permissions;
  const grupos = useMemo(() => gruposDeMenu(permisos ?? {}, esMaster), [permisos, esMaster]);
  const oscuro = tema === "oscuro";

  return (
    <Drawer abierto={abierto} onCerrar={cerrar} testID="cajon-panel" testIDFondo="cajon-fondo" cerrarConBack>
      <View style={styles.marcaFila}>
        <View style={[styles.marcaLogo, { backgroundColor: c.surfaceRaised }]}>
          <Icono name="hub" size={18} color={c.link} />
        </View>
        <Text style={[styles.marca, { color: c.text }]}>SolversHub</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.grupos}>
          {grupos.map((grupo) => {
            const contieneActiva = grupo.entradas.some((entrada) => esActiva(entrada, activo));
            return (
              <NavGroup
                key={grupo.id}
                testID={`cajon-grupo-${grupo.id}`}
                label={grupo.label}
                icon={grupo.icono}
                abierto={gruposAbiertos.has(grupo.id) || contieneActiva}
                onToggle={() => alternarGrupo(grupo.id)}
              >
                {grupo.entradas.map((entrada) => {
                  const seleccionada = esActiva(entrada, activo);
                  return (
                    <ListItem
                      key={entrada.id}
                      testID={`cajon-item-${entrada.id}`}
                      title={entrada.label}
                      leading={
                        <Icono
                          name={entrada.icono}
                          size={20}
                          color={entrada.bloqueado ? c.textSoft : seleccionada ? c.textStrong : c.textMuted}
                        />
                      }
                      trailing={entrada.bloqueado ? <Icono name="lock" size={18} color={c.textSoft} /> : undefined}
                      accessibilityHint={entrada.bloqueado ? "Habilidad no habilitada en tu negocio" : undefined}
                      selected={seleccionada}
                      disabled={entrada.bloqueado}
                      showChevron={false}
                      onPress={() => irA({ modulo: entrada.destino.modulo, pestana: entrada.destino.pestana })}
                    />
                  );
                })}
              </NavGroup>
            );
          })}
        </View>

        <View testID="cajon-cuenta" style={[styles.cuenta, { backgroundColor: c.bg, borderColor: c.border }]}>
          <View style={styles.cuentaTexto}>
            <Text style={[styles.cuentaNegocio, { color: c.text }]} numberOfLines={1}>
              {sesion?.tenantName ?? "SolversHub"}
            </Text>
            {sesion?.email ? (
              <Text style={[shType.caption, { color: c.textMuted }]} numberOfLines={1}>
                {sesion.email}
              </Text>
            ) : null}
          </View>
          <ListItem
            testID="cajon-tema"
            title={oscuro ? "Modo claro" : "Modo oscuro"}
            leading={<Icono name={oscuro ? "light-mode" : "dark-mode"} size={20} color={c.textMuted} />}
            showChevron={false}
            onPress={alternarTema}
            style={styles.filaCuenta}
          />
          <Pressable
            testID="cajon-logout"
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
            style={styles.logout}
            onPress={() => {
              cerrar();
              void (async () => {
                await campo?.logout();
                await logoutAdmin();
              })();
            }}
          >
            <Icono name="logout" size={20} color={c.statusDangerFg} />
            <Text style={[shType.body, { color: c.statusDangerFg }]}>Cerrar sesión</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Drawer>
  );
}

const styles = StyleSheet.create({
  marcaFila: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: shSpace[4] },
  marcaLogo: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  marca: { ...shType.h1, fontFamily: shType.hero.fontFamily },
  scroll: { paddingBottom: shSpace[6], flexGrow: 1, justifyContent: "space-between" },
  grupos: { gap: 2 },
  cuenta: {
    marginTop: shSpace[4],
    borderWidth: 1,
    borderRadius: 14,
    borderCurve: "continuous",
    padding: shSpace[2],
    gap: 2,
  },
  cuentaTexto: { paddingHorizontal: shSpace[2], paddingVertical: shSpace[2], gap: 2 },
  cuentaNegocio: { ...shType.label, fontFamily: shType.hero.fontFamily },
  filaCuenta: { borderRadius: shRadius.md },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[3],
    minHeight: shDensity.controlLg,
    paddingHorizontal: shSpace[3],
    borderRadius: shRadius.md,
    borderCurve: "continuous",
    overflow: "hidden",
  },
});
