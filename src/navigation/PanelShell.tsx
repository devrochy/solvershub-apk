import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAdminSession } from "@core/session/admin-session-context";
import { useTheme } from "@core/theme/theme-context";
import { EmptyState } from "@shared/ui";
import { suscribirNavegacion } from "@shared/navegacion-evento";
import type { SolicitudPestana } from "@shared/pestana-inicial";
import { CatalogoScreen } from "@shared/ui/catalogo/CatalogoScreen";
import { DashboardScreen } from "../modules/dashboard";
import { OperacionNavigator } from "../modules/operacion";
import { CobranzaAdminNavigator } from "../modules/cobranza-admin";
import { ComercioScreen } from "../modules/comercio";
import { CalendarioScreen } from "../modules/calendario";
import { NegocioScreen } from "../modules/negocio";
import { ConfiguracionScreen } from "../modules/configuracion";
import { HerramientasScreen } from "../modules/herramientas";
import { BusquedaScreen } from "../modules/busqueda";
import { CajonPanel } from "./CajonPanel";
import { HeaderPanel } from "./HeaderPanel";
import { MODULOS_PANEL, modulosVisibles, type ModuloPanel } from "./menu-panel";
import { MenuPanelProvider, type DestinoPanel } from "./menu-panel-context";

export { catalogoDisponible, seccionesDeMenu } from "./menu-panel";

/**
 * Shell del panel dentro de la app (ADR-APP-02, ADR-APP-07 enmendado, D-34):
 * header con hamburguesa + cajón lateral con la misma lista agrupada que el
 * sidebar del panel web, armada SOLO con las secciones que los permisos del
 * usuario permiten ver (MeResponse.permissions, ADR-0047).
 *
 * Por debajo sigue un `Tab.Navigator` sin barra: conserva el montaje perezoso,
 * el estado por módulo y el `navRef` que usan el push y la Búsqueda (bus de
 * `@shared/navegacion-evento`). Cada ítem del cajón abre su módulo en la
 * pestaña interna pedida (`pestanaInicial`).
 */

const Tab = createBottomTabNavigator();

type ParamsModulo = { pestanaInicial?: SolicitudPestana } | undefined;

function ConHeader({ modulo, children }: { modulo: ModuloPanel; children: ReactNode }) {
  const { colores } = useTheme();
  return (
    <View style={[styles.modulo, { backgroundColor: colores.fondo }]}>
      <HeaderPanel titulo={MODULOS_PANEL[modulo].label} />
      {children}
    </View>
  );
}

function ContenidoDeModulo({ modulo, params }: { modulo: ModuloPanel; params: ParamsModulo }) {
  const pestanaInicial = params?.pestanaInicial;
  switch (modulo) {
    case "conversaciones":
      return <OperacionNavigator encabezadoRaiz={<HeaderPanel titulo={MODULOS_PANEL.conversaciones.label} />} />;
    case "cobranza":
      return <CobranzaAdminNavigator encabezadoRaiz={<HeaderPanel titulo={MODULOS_PANEL.cobranza.label} />} />;
    case "inicio":
      return (
        <ConHeader modulo={modulo}>
          <DashboardScreen />
        </ConHeader>
      );
    case "comercio":
      return (
        <ConHeader modulo={modulo}>
          <ComercioScreen pestanaInicial={pestanaInicial} />
        </ConHeader>
      );
    case "calendario":
      return (
        <ConHeader modulo={modulo}>
          <CalendarioScreen pestanaInicial={pestanaInicial} />
        </ConHeader>
      );
    case "negocio":
      return (
        <ConHeader modulo={modulo}>
          <NegocioScreen pestanaInicial={pestanaInicial} />
        </ConHeader>
      );
    case "configuracion":
      return (
        <ConHeader modulo={modulo}>
          <ConfiguracionScreen pestanaInicial={pestanaInicial} />
        </ConHeader>
      );
    case "herramientas":
      return (
        <ConHeader modulo={modulo}>
          <HerramientasScreen pestanaInicial={pestanaInicial} />
        </ConHeader>
      );
    case "busqueda":
      return (
        <ConHeader modulo={modulo}>
          <BusquedaScreen />
        </ConHeader>
      );
    case "catalogo":
      return (
        <ConHeader modulo={modulo}>
          <CatalogoScreen />
        </ConHeader>
      );
  }
}

export function PanelShell() {
  const { colores, tema } = useTheme();
  const { sesion } = useAdminSession();
  const esMaster = sesion?.role === "master";
  const permisos = useMemo(() => sesion?.permissions ?? {}, [sesion?.permissions]);
  const modulos = useMemo(() => modulosVisibles(permisos, esMaster), [permisos, esMaster]);

  const navRef = useRef(createNavigationContainerRef());
  const contador = useRef(0);
  const [activo, setActivo] = useState<DestinoPanel | null>(() => (modulos[0] ? { modulo: modulos[0] } : null));
  // Destino que llegó antes de que la navegación estuviera lista (push en frío).
  const destinoPendiente = useRef<DestinoPanel | null>(null);

  const navegar = useCallback(
    (destino: DestinoPanel) => {
      if (!modulos.includes(destino.modulo)) return;
      if (!navRef.current?.isReady()) {
        destinoPendiente.current = destino;
        return;
      }
      const n = ++contador.current;
      const params = destino.pestana ? { pestanaInicial: { pestana: destino.pestana, n } } : undefined;
      const raiz = MODULOS_PANEL[destino.modulo].raizStack;
      // Con stack propio, el `screen` anidado además vuelve a la raíz del módulo.
      const navegarA = navRef.current.navigate as (nombre: string, params?: object) => void;
      navegarA(destino.modulo, raiz ? { screen: raiz, params } : params);
      setActivo(destino);
    },
    [modulos],
  );

  useEffect(() => {
    // Deep link desde módulos anidados (HU-APP-21) y push tocados.
    return suscribirNavegacion((destino) =>
      navegar({ modulo: destino.tab as ModuloPanel, pestana: destino.pestana }),
    );
  }, [navegar]);

  const barra = <StatusBar style={tema === "oscuro" ? "light" : "dark"} />;

  if (modulos.length === 0) {
    return (
      <MenuPanelProvider activo={null} alNavegar={navegar}>
        {barra}
        <View style={[styles.modulo, { backgroundColor: colores.fondo }]}>
          <HeaderPanel titulo="SolversHub" />
          <EmptyState
            testID="panel-sin-secciones"
            icon="lock-outline"
            title="Sin secciones asignadas"
            description="Pide al dueño del negocio que te dé acceso a alguna sección."
            secondaryAction={{ label: "Entendido", onPress: () => undefined }}
          />
        </View>
        <CajonPanel />
      </MenuPanelProvider>
    );
  }

  return (
    <MenuPanelProvider activo={activo} alNavegar={navegar}>
      {/* El panel no tiene banda navy: la barra de estado sigue al tema. Al
          desmontar, RN restaura el `light` de App.tsx (login y campo). */}
      {barra}
      <NavigationContainer
        ref={navRef}
        onReady={() => {
          if (destinoPendiente.current) {
            const destino = destinoPendiente.current;
            destinoPendiente.current = null;
            navegar(destino);
          }
        }}
        onStateChange={() => {
          // Back del sistema u otro cambio fuera del cajón: el header y el
          // ítem resaltado siguen al módulo que quedó en pantalla.
          const estado = navRef.current?.getRootState();
          const nombre = estado?.routes[estado.index]?.name as ModuloPanel | undefined;
          if (nombre) {
            setActivo((actual) => (actual?.modulo === nombre ? actual : { modulo: nombre }));
          }
        }}
      >
        <Tab.Navigator tabBar={() => null} screenOptions={{ headerShown: false }}>
          {modulos.map((modulo) => (
            <Tab.Screen key={modulo} name={modulo}>
              {({ route }) => <ContenidoDeModulo modulo={modulo} params={route.params as ParamsModulo} />}
            </Tab.Screen>
          ))}
        </Tab.Navigator>
      </NavigationContainer>
      <CajonPanel />
    </MenuPanelProvider>
  );
}

const styles = StyleSheet.create({
  modulo: { flex: 1 },
});
