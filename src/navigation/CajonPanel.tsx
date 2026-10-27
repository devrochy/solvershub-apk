import { useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { useAdminSession } from "@core/session/admin-session-context";
import { useTheme } from "@core/theme/theme-context";
import { shSpace } from "@core/theme/tokens";
import { Drawer, Icono, ListItem, NavGroup, useKit } from "@shared/ui";
import { SessionContext } from "../modules/cobranza/session/session-context";
import { CuentaPanel } from "./CuentaPanel";
import { LOGO_PANEL } from "./marca-panel";
import { entradaContiene, gruposDeMenu, type EntradaVisible } from "./menu-panel";
import { useMenuPanel, type DestinoPanel } from "./menu-panel-context";

/** Entrada resaltada: la del destino activo o, sin entrada, la que lo contiene. */
function esActiva(entrada: EntradaVisible, activo: DestinoPanel | null): boolean {
  if (activo === null) return false;
  return activo.entrada ? entrada.id === activo.entrada : entradaContiene(entrada, activo);
}

/**
 * Cajón lateral del panel en la app (HU-DS-11, D-34): la misma lista agrupada
 * que el sidebar del panel web (menú v2, HU-UX-11), filtrada por permisos. Cada
 * entrada abre su primera pestaña permitida; la de un pack no habilitado queda
 * con candado. Los grupos arrancan plegados y solo se abre el del destino
 * activo, al que se desplaza. Abajo, fija, la tarjeta de la cuenta.
 */
export function CajonPanel({ onAbrirPerfil }: { onAbrirPerfil?: () => void }) {
  const { c } = useKit();
  const { tema, alternarTema } = useTheme();
  const { sesion, perfil, refrescarPerfil, logout: logoutAdmin } = useAdminSession();
  const campo = useContext(SessionContext);
  const { abierto, cerrar, activo, gruposAbiertos, alternarGrupo, irA } = useMenuPanel();

  const esMaster = sesion?.role === "master";
  const permisos = sesion?.permissions;
  const grupos = useMemo(() => gruposDeMenu(permisos ?? {}, esMaster), [permisos, esMaster]);

  const grupoActivo = useMemo(
    () => grupos.find((grupo) => grupo.entradas.some((entrada) => esActiva(entrada, activo)))?.id ?? null,
    [grupos, activo],
  );

  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});

  const desplazar = useCallback(() => {
    if (!abierto || !grupoActivo) return;
    const y = offsets.current[grupoActivo];
    if (typeof y !== "number") return;
    const ref = scrollRef.current as unknown as {
      scrollTo?: (opciones: { y: number; animated?: boolean }) => void;
    } | null;
    ref?.scrollTo?.({ y: Math.max(0, y - shSpace[2]), animated: true });
  }, [abierto, grupoActivo]);

  useEffect(() => {
    if (!abierto) return undefined;
    const temporizador = setTimeout(desplazar, 80);
    return () => clearTimeout(temporizador);
  }, [abierto, desplazar]);

  useEffect(() => {
    if (!abierto) return;
    void refrescarPerfil().catch(() => undefined);
  }, [abierto, refrescarPerfil]);

  const nombre =
    perfil?.nombre?.trim() || perfil?.username || sesion?.username || sesion?.email || "Usuario";
  const email = perfil?.email ?? sesion?.email ?? "";

  const abrirPerfil = () => {
    cerrar();
    onAbrirPerfil?.();
  };

  const cerrarSesion = () => {
    cerrar();
    void (async () => {
      await campo?.logout();
      await logoutAdmin();
    })();
  };

  return (
    <Drawer
      abierto={abierto}
      onCerrar={cerrar}
      testID="cajon-panel"
      testIDFondo="cajon-fondo"
      cerrarConBack
    >
      <View style={styles.contenido}>
        <View style={styles.marcaFila}>
          <Image
            testID="cajon-marca"
            source={LOGO_PANEL[tema]}
            style={styles.marcaLogo}
            resizeMode="contain"
            accessible
            accessibilityRole="image"
            accessibilityLabel="SolversHub"
          />
        </View>

        <ScrollView
          ref={scrollRef}
          testID="cajon-scroll"
          style={styles.scroll}
          contentContainerStyle={styles.scrollContenido}
        >
          {grupos.map((grupo) => {
            const contieneActiva = grupo.entradas.some((entrada) => esActiva(entrada, activo));
            return (
              <View
                key={grupo.id}
                testID={`cajon-zona-${grupo.id}`}
                onLayout={(evento) => {
                  offsets.current[grupo.id] = evento.nativeEvent.layout.y;
                  if (grupo.id === grupoActivo) desplazar();
                }}
              >
                <NavGroup
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
                        accessibilityHint={
                          entrada.bloqueado ? "Habilidad no habilitada en tu negocio" : undefined
                        }
                        selected={seleccionada}
                        disabled={entrada.bloqueado}
                        showChevron={false}
                        onPress={() =>
                          irA({
                            modulo: entrada.destino.modulo,
                            pestana: entrada.destino.pestana,
                            entrada: entrada.id,
                          })
                        }
                      />
                    );
                  })}
                </NavGroup>
              </View>
            );
          })}
        </ScrollView>

        <View testID="cajon-pie" style={[styles.pie, { borderTopColor: c.border }]}>
          <CuentaPanel
            key={abierto ? "cuenta-abierta" : "cuenta-cerrada"}
            abierto={abierto}
            nombre={nombre}
            email={email}
            avatarUrl={perfil?.avatarUrl}
            tema={tema}
            onAlternarTema={alternarTema}
            onPerfil={abrirPerfil}
            onCerrarSesion={cerrarSesion}
          />
        </View>
      </View>
    </Drawer>
  );
}

const styles = StyleSheet.create({
  contenido: { flex: 1 },
  marcaFila: { marginBottom: shSpace[4] },
  marcaLogo: { height: 24, width: 131 },
  scroll: { flex: 1 },
  scrollContenido: { paddingBottom: shSpace[4], gap: 2 },
  pie: {
    borderTopWidth: 1,
    paddingTop: shSpace[3],
  },
});
