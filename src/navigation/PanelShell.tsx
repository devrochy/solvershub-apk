import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAdminSession } from "@core/session/admin-session-context";
import { useTheme } from "@core/theme/theme-context";
import { EmptyState } from "@shared/ui";
import { suscribirNavegacion } from "@shared/navegacion-evento";
import type { EntradaPestanas, SolicitudPestana } from "@shared/pestana-inicial";
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
import {
  MODULOS_PANEL,
  entradaDeDestino,
  modulosVisibles,
  pestanasDeEntrada,
  tituloDeDestino,
  type ModuloPanel,
} from "./menu-panel";
import { MenuPanelProvider, useMenuPanel, type DestinoPanel } from "./menu-panel-context";

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
 * pestaña interna pedida (`pestanaInicial`) y le pasa las pestañas de la
 * entrada (`entrada`): la pantalla muestra solo esas (Equipo → Colaboradores).
 */

const Tab = createBottomTabNavigator();

type ParamsModulo =
  | { pestanaInicial?: SolicitudPestana; entrada?: EntradaPestanas; screen?: string; params?: object }
  | undefined;

/**
 * Header de un módulo: lleva el nombre de la entrada del cajón por la que se
 * llegó (varias entradas comparten módulo, p. ej. Equipo y Configuración).
 */
function HeaderDeModulo({ modulo }: { modulo: ModuloPanel }) {
  const { activo } = useMenuPanel();
  const titulo = activo?.modulo === modulo ? tituloDeDestino(activo) : MODULOS_PANEL[modulo].label;
  return <HeaderPanel titulo={titulo} />;
}

function ConHeader({ modulo, children }: { modulo: ModuloPanel; children: ReactNode }) {
  const { colores } = useTheme();
  return (
    <View style={[styles.modulo, { backgroundColor: colores.fondo }]}>
      <HeaderDeModulo modulo={modulo} />
      {children}
    </View>
  );
}

function ContenidoDeModulo({ modulo, params }: { modulo: ModuloPanel; params: ParamsModulo }) {
  const pestanaInicial = params?.pestanaInicial;
  const entrada = params?.entrada;
  switch (modulo) {
    case "conversaciones":
      return <OperacionNavigator encabezadoRaiz={<HeaderDeModulo modulo="conversaciones" />} entrada={entrada} />;
    case "cobranza":
      return <CobranzaAdminNavigator encabezadoRaiz={<HeaderDeModulo modulo="cobranza" />} />;
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
          <CalendarioScreen pestanaInicial={pestanaInicial} entrada={entrada} />
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
          <ConfiguracionScreen pestanaInicial={pestanaInicial} entrada={entrada} />
        </ConHeader>
      );
    case "herramientas":
      return (
        <ConHeader modulo={modulo}>
          <HerramientasScreen pestanaInicial={pestanaInicial} entrada={entrada} />
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
  // Sin destino del cajón (arranque, módulo abierto por primera vez con back),
  // cada módulo muestra las pestañas de su primera entrada visible.
  const paramsIniciales = useMemo(
    () =>
      Object.fromEntries(
        modulos.map((modulo) => {
          const entrada = entradaDeDestino(permisos, esMaster, { modulo });
          return [modulo, entrada ? { entrada: pestanasDeEntrada(entrada) } : undefined];
        }),
      ) as Partial<Record<ModuloPanel, { entrada: EntradaPestanas }>>,
    [modulos, permisos, esMaster],
  );

  const navRef = useRef(createNavigationContainerRef());
  const contador = useRef(0);
  const [activo, setActivo] = useState<DestinoPanel | null>(() =>
    modulos[0] ? { modulo: modulos[0], entrada: paramsIniciales[modulos[0]]?.entrada.id } : null,
  );
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
      // La entrada del cajón (o la que contiene el destino del bus) decide qué
      // pestañas muestra la pantalla y el título del header.
      const visible = entradaDeDestino(permisos, esMaster, destino);
      const entrada = visible ? pestanasDeEntrada(visible) : undefined;
      const params = {
        ...(destino.pestana ? { pestanaInicial: { pestana: destino.pestana, n } } : {}),
        entrada,
      };
      const raiz = MODULOS_PANEL[destino.modulo].raizStack;
      // Con stack propio, el `screen` anidado además vuelve a la raíz del módulo;
      // `entrada` va también arriba, donde la lee el shell (header y back).
      const navegarA = navRef.current.navigate as (nombre: string, params?: object) => void;
      navegarA(destino.modulo, raiz ? { screen: raiz, params, entrada } : params);
      setActivo({ ...destino, entrada: visible?.id });
    },
    [modulos, permisos, esMaster],
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
          <HeaderPanel titulo="SolversHub" conBusqueda={false} />
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
          const ruta = estado?.routes[estado.index];
          const nombre = ruta?.name as ModuloPanel | undefined;
          if (nombre) {
            // La entrada sale de los params del módulo: el header sigue a la
            // entrada cuyas pestañas están en pantalla.
            const entrada = (ruta?.params as ParamsModulo)?.entrada?.id;
            setActivo((actual) =>
              actual?.modulo === nombre && actual.entrada === entrada ? actual : { modulo: nombre, entrada },
            );
          }
        }}
      >
        <Tab.Navigator tabBar={() => null} screenOptions={{ headerShown: false }}>
          {modulos.map((modulo) => (
            <Tab.Screen key={modulo} name={modulo} initialParams={paramsIniciales[modulo]}>
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
