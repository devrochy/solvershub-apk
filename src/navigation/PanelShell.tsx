import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  CardStyleInterpolators,
  createStackNavigator,
  type StackNavigationOptions,
} from "@react-navigation/stack";
import { StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAdminSession } from "@core/session/admin-session-context";
import { useTheme } from "@core/theme/theme-context";
import { EmptyState } from "@shared/ui";
import { suscribirNavegacion } from "@shared/navegacion-evento";
import {
  suscribirAperturaColaborador,
  type ColaboradorEquipo,
} from "@shared/equipo-evento";
import type { EntradaPestanas, SolicitudPestana } from "@shared/pestana-inicial";
import { CatalogoScreen } from "@shared/ui/catalogo/CatalogoScreen";
import { DashboardScreen } from "../modules/dashboard";
import { OperacionNavigator } from "../modules/operacion";
import { CobranzaAdminNavigator } from "../modules/cobranza-admin";
import { ComercioScreen } from "../modules/comercio";
import { CalendarioScreen } from "../modules/calendario";
import { SuscripcionesScreen } from "../modules/suscripciones";
import { AgentesScreen } from "../modules/agentes";
import { SeguridadScreen } from "../modules/seguridad";
import { NegocioScreen } from "../modules/negocio";
import { ColaboradorDetalleScreen, ConfiguracionScreen } from "../modules/configuracion";
import { HerramientasScreen } from "../modules/herramientas";
import { BusquedaScreen } from "../modules/busqueda";
import { OnboardingProvider, RecorridoScreen, useOnboarding } from "../modules/onboarding";
import { PerfilAdminScreen } from "../modules/perfil";
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
 *
 * Encima hay un stack con dos rutas: `Panel` (las pestañas) y `Perfil` (la
 * cuenta del usuario). El stack permite que el gesto de volver siga el dedo y
 * revele la sección anterior, y el `Tab.Navigator` conserva la pestaña activa.
 */

const Tab = createBottomTabNavigator();
const PanelStack = createStackNavigator<PanelStackParamList>();

export interface PanelStackParamList extends Record<string, object | undefined> {
  Panel: { screen?: ModuloPanel; params?: object } | undefined;
  Perfil: undefined;
  ColaboradorDetalle: { colaborador: ColaboradorEquipo };
}

type ParamsModulo =
  | {
      pestanaInicial?: SolicitudPestana;
      ajustesInicial?: string;
      entrada?: EntradaPestanas;
      screen?: string;
      params?: object;
    }
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
          <CalendarioScreen
            pestanaInicial={pestanaInicial}
            ajustesInicial={params?.ajustesInicial}
            entrada={entrada}
          />
        </ConHeader>
      );
    case "suscripciones":
      return (
        <ConHeader modulo={modulo}>
          <SuscripcionesScreen pestanaInicial={pestanaInicial} />
        </ConHeader>
      );
    case "agentes":
      return (
        <ConHeader modulo={modulo}>
          <AgentesScreen />
        </ConHeader>
      );
    case "negocio":
      return (
        <ConHeader modulo={modulo}>
          <NegocioScreen pestanaInicial={pestanaInicial} />
        </ConHeader>
      );
    case "seguridad":
      return (
        <ConHeader modulo={modulo}>
          <SeguridadScreen pestanaInicial={pestanaInicial} />
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

function SinSecciones() {
  const { colores } = useTheme();
  return (
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
  );
}

function PanelPrincipal({
  modulos,
  paramsIniciales,
}: {
  modulos: ModuloPanel[];
  paramsIniciales: Partial<Record<ModuloPanel, { entrada: EntradaPestanas }>>;
}) {
  if (modulos.length === 0) {
    return <SinSecciones />;
  }
  return (
    <Tab.Navigator tabBar={() => null} screenOptions={{ headerShown: false }} backBehavior="history">
      {modulos.map((modulo) => (
        <Tab.Screen key={modulo} name={modulo} initialParams={paramsIniciales[modulo]}>
          {({ route }) => <ContenidoDeModulo modulo={modulo} params={route.params as ParamsModulo} />}
        </Tab.Screen>
      ))}
    </Tab.Navigator>
  );
}

const OPCIONES_PERFIL: StackNavigationOptions = {
  gestureEnabled: true,
  gestureDirection: "horizontal",
  gestureResponseDistance: 30,
  transitionSpec: {
    open: { animation: "timing", config: { duration: 220 } },
    close: { animation: "timing", config: { duration: 220 } },
  },
  cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
};

export function PanelShell() {
  return (
    <OnboardingProvider>
      <PanelShellInterno />
    </OnboardingProvider>
  );
}

function PanelShellInterno() {
  const { abierto } = useOnboarding();
  const { colores, tema } = useTheme();
  const { sesion } = useAdminSession();
  const esMaster = sesion?.role === "master";
  const permisos = useMemo(() => sesion?.permissions ?? {}, [sesion?.permissions]);
  const modulos = useMemo(() => modulosVisibles(permisos, esMaster), [permisos, esMaster]);
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

  const navRef = useRef(createNavigationContainerRef<PanelStackParamList>());
  const contador = useRef(0);
  const [activo, setActivo] = useState<DestinoPanel | null>(() =>
    modulos[0] ? { modulo: modulos[0], entrada: paramsIniciales[modulos[0]]?.entrada.id } : null,
  );
  const destinoPendiente = useRef<DestinoPanel | null>(null);
  const perfilPendiente = useRef(false);
  const colaboradorPendiente = useRef<ColaboradorEquipo | null>(null);

  const navegar = useCallback(
    (destino: DestinoPanel) => {
      if (!modulos.includes(destino.modulo)) return;
      if (!navRef.current?.isReady()) {
        destinoPendiente.current = destino;
        return;
      }
      const n = ++contador.current;
      const visible = entradaDeDestino(permisos, esMaster, destino);
      const entrada = visible ? pestanasDeEntrada(visible) : undefined;
      const params = {
        ...(destino.pestana ? { pestanaInicial: { pestana: destino.pestana, n } } : {}),
        ...(destino.ajustes ? { ajustesInicial: destino.ajustes } : {}),
        // HU-CRM-20: `n` distingue dos avisos seguidos al mismo cliente.
        ...(destino.cliente ? { clienteInicial: { id: destino.cliente, n } } : {}),
        entrada,
      };
      const raiz = MODULOS_PANEL[destino.modulo].raizStack;
      navRef.current.navigate("Panel", {
        screen: destino.modulo,
        params: raiz ? { screen: raiz, params, entrada } : params,
      });
      setActivo({ ...destino, entrada: visible?.id });
    },
    [modulos, permisos, esMaster],
  );

  const abrirPerfil = useCallback(() => {
    if (!navRef.current?.isReady()) {
      perfilPendiente.current = true;
      return;
    }
    navRef.current.navigate("Perfil");
  }, []);

  useEffect(() => {
    return suscribirNavegacion((destino) =>
      navegar({
        modulo: destino.tab as ModuloPanel,
        pestana: destino.pestana,
        ajustes: destino.ajustes,
        cliente: destino.cliente,
      }),
    );
  }, [navegar]);

  useEffect(() => {
    return suscribirAperturaColaborador((colaborador) => {
      if (!navRef.current?.isReady()) {
        colaboradorPendiente.current = colaborador;
        return;
      }
      navRef.current.navigate("ColaboradorDetalle", { colaborador });
    });
  }, []);

  const barra = <StatusBar style={tema === "oscuro" ? "light" : "dark"} />;

  return (
    <MenuPanelProvider activo={activo} alNavegar={navegar}>
      {barra}
      <NavigationContainer
        ref={navRef}
        onReady={() => {
          if (perfilPendiente.current) {
            perfilPendiente.current = false;
            navRef.current?.navigate("Perfil");
          }
          if (colaboradorPendiente.current) {
            const colaborador = colaboradorPendiente.current;
            colaboradorPendiente.current = null;
            navRef.current?.navigate("ColaboradorDetalle", { colaborador });
          }
          if (destinoPendiente.current) {
            const destino = destinoPendiente.current;
            destinoPendiente.current = null;
            navegar(destino);
          }
        }}
        onStateChange={() => {
          const estado = navRef.current?.getRootState();
          const ruta = estado?.routes[estado.index];
          if (ruta?.name === "Perfil" || ruta?.name === "ColaboradorDetalle") {
            setActivo(null);
            return;
          }
          if (ruta?.name !== "Panel") return;
          const tabs = ruta.state;
          if (!tabs) {
            setActivo(null);
            return;
          }
          const indice = tabs.index ?? 0;
          const tab = tabs.routes[indice];
          const nombre = tab?.name as ModuloPanel | undefined;
          if (!nombre) return;
          const entrada = (tab.params as ParamsModulo)?.entrada?.id;
          setActivo((actual) =>
            actual?.modulo === nombre && actual.entrada === entrada ? actual : { modulo: nombre, entrada },
          );
        }}
      >
        <PanelStack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: colores.fondo } }}>
          <PanelStack.Screen
            name="Panel"
            options={{ gestureEnabled: false, cardStyle: { backgroundColor: colores.fondo } }}
          >
            {() => <PanelPrincipal modulos={modulos} paramsIniciales={paramsIniciales} />}
          </PanelStack.Screen>
          <PanelStack.Screen name="Perfil" options={OPCIONES_PERFIL}>
            {() => <PerfilAdminScreen onBack={() => navRef.current?.goBack()} />}
          </PanelStack.Screen>
          <PanelStack.Screen name="ColaboradorDetalle" options={OPCIONES_PERFIL}>
            {({ route }) => (
              <ColaboradorDetalleScreen
                colaborador={route.params.colaborador}
                onBack={() => navRef.current?.goBack()}
              />
            )}
          </PanelStack.Screen>
        </PanelStack.Navigator>
      </NavigationContainer>
      <CajonPanel onAbrirPerfil={abrirPerfil} />
      {abierto && <RecorridoScreen />}
    </MenuPanelProvider>
  );
}

const styles = StyleSheet.create({
  modulo: { flex: 1 },
});
