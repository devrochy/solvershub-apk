import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAdminSession } from "@core/session/admin-session-context";
import { grupoVisible, seccionesPermitidas } from "@core/permisos";
import { useTheme } from "@core/theme/theme-context";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SeccionEnConstruccion } from "./screens/SeccionEnConstruccion";
import { DashboardScreen } from "../modules/dashboard";
import { OperacionNavigator } from "../modules/operacion";
import { CobranzaAdminNavigator } from "../modules/cobranza-admin";
import { ComercioScreen } from "../modules/comercio";
import { CalendarioScreen } from "../modules/calendario";
import { NegocioScreen } from "../modules/negocio";
import { ConfiguracionScreen } from "../modules/configuracion";
import { HerramientasScreen } from "../modules/herramientas";
import { BusquedaScreen } from "../modules/busqueda";
import { suscribirNavegacion } from "@shared/navegacion-evento";
import { useEffect, useRef } from "react";

/**
 * Shell del panel (ADR-APP-02): tabs + lista "Más" armados SOLO con las
 * secciones que los permisos del usuario permiten ver (MeResponse.permissions,
 * ADR-0047). Cada tab es un placeholder hasta que llega el módulo real
 * (HU-APP-04/08+).
 */

export interface GrupoSecciones {
  clave: string;
  label: string;
  secciones: string[];
  detalleHU: string;
}

export const GRUPOS_PANEL: GrupoSecciones[] = [
  { clave: "inicio", label: "Inicio", secciones: ["dashboard"], detalleHU: "HU-APP-04" },
  {
    clave: "conversaciones",
    label: "Conversaciones",
    secciones: ["conversations", "escalations", "leads"],
    detalleHU: "HU-APP-08",
  },
  {
    clave: "cobranza",
    label: "Cobranza",
    secciones: [
      "pack_cobranza:resumen",
      "pack_cobranza:gestores",
      "pack_cobranza:carteras",
      "pack_cobranza:clientes",
      "pack_cobranza:cobros",
      "pack_cobranza:propietario",
      "pack_cobranza:promesas",
      "pack_cobranza:reportes",
      "pack_cobranza:reglas",
      "pack_cobranza:monitoreo",
      "pack_cobranza:dispositivos",
      "pack_cobranza:alertas",
      "pack_cobranza:auditoria",
    ],
    detalleHU: "HU-APP-07 (campo) / HU-APP-08+ (admin)",
  },
  {
    clave: "comercio",
    label: "Comercio",
    secciones: ["pack_commerce"],
    detalleHU: "HU-APP-10",
  },
  {
    clave: "calendario",
    label: "Calendario",
    secciones: [
      "pack_calendar:citas",
      "pack_calendar:tipos",
      "pack_calendar:bloqueos",
      "pack_calendar:conexion",
      "pack_calendar:configuracion",
    ],
    detalleHU: "HU-APP-11",
  },
  { clave: "negocio", label: "Negocio", secciones: ["plan", "costs"], detalleHU: "HU-APP-09" },
  {
    clave: "configuracion",
    label: "Configuración",
    secciones: ["collaborators", "connections", "plugins", "settings"],
    detalleHU: "HU-APP-12",
  },
];

/** Secciones que solo el master de plataforma ve (ADR-0047 GLOBAL_ONLY). */
export const GRUPO_PLATAFORMA: GrupoSecciones = {
  clave: "plataforma",
  label: "Plataforma",
  secciones: ["tenants"],
  detalleHU: "HU-APP-13",
};

const Tab = createBottomTabNavigator();

export interface ItemMenuPanel {
  seccion: string;
  grupo: string;
  detalleHU: string;
}

/** Ítems del menú "Más" según permisos (lógica pura, testeable). */
export function seccionesDeMenu(
  permisos: Record<string, string | null>,
  esMaster: boolean,
): ItemMenuPanel[] {
  const grupos = GRUPOS_PANEL.filter((g) => grupoVisible(permisos, g.secciones, esMaster));
  return [
    ...grupos.flatMap((g) =>
      seccionesPermitidas(permisos, g.secciones, esMaster).map((s) => ({
        seccion: s,
        grupo: g.label,
        detalleHU: g.detalleHU,
      })),
    ),
    ...(esMaster
      ? GRUPO_PLATAFORMA.secciones.map((s) => ({
          seccion: s,
          grupo: GRUPO_PLATAFORMA.label,
          detalleHU: GRUPO_PLATAFORMA.detalleHU,
        }))
      : []),
  ];
}

export type MasStackParamList = {
  Mas: undefined;
  Busqueda: undefined;
  Herramientas: undefined;
};

const MasStack = createNativeStackNavigator<MasStackParamList>();

function MasNavigator() {
  return (
    <MasStack.Navigator>
      <MasStack.Screen name="Mas" component={MasScreen} options={{ title: "Más" }} />
      <MasStack.Screen
        name="Busqueda"
        component={BusquedaScreen}
        options={{ title: "Búsqueda global" }}
      />
      <MasStack.Screen
        name="Herramientas"
        component={HerramientasScreen}
        options={{ title: "Herramientas y plataforma" }}
      />
    </MasStack.Navigator>
  );
}

function MasScreen() {
  const { colores } = useTheme();
  const { sesion } = useAdminSession();
  const navigation = useNavigation<NativeStackNavigationProp<MasStackParamList>>();
  const esMaster = sesion?.role === "master";
  const items = seccionesDeMenu(sesion?.permissions ?? {}, esMaster);

  return (
    <View style={[styles.mas, { backgroundColor: colores.fondo }]}>
      <Pressable
        testID="mas-buscar"
        onPress={() => navigation.navigate("Busqueda")}
        style={[styles.item, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
      >
        <Text style={[styles.itemSeccion, { color: colores.texto }]}>Buscar en todo el negocio</Text>
        <Text style={[styles.itemGrupo, { color: colores.textoSuave }]}>Búsqueda global</Text>
      </Pressable>
      <Pressable
        testID="mas-herramientas"
        onPress={() => navigation.navigate("Herramientas")}
        style={[styles.item, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
      >
        <Text style={[styles.itemSeccion, { color: colores.texto }]}>
          Herramientas y plataforma
        </Text>
        <Text style={[styles.itemGrupo, { color: colores.textoSuave }]}>
          Fallos de envío{esMaster ? " · negocios" : ""}
        </Text>
      </Pressable>
      <FlatList
        testID="mas-lista"
        data={items}
        keyExtractor={(i) => i.seccion}
        renderItem={({ item }) => (
          <View
            style={[styles.item, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
          >
            <Text style={[styles.itemSeccion, { color: colores.texto }]}>{item.seccion}</Text>
            <Text style={[styles.itemGrupo, { color: colores.textoSuave }]}>{item.grupo}</Text>
          </View>
        )}
      />
    </View>
  );
}

/**
 * Grupos que se montan dentro de un stack con header nativo (que ya reserva la
 * barra de estado). El resto va sin header (`headerShown: false`) y con
 * edge-to-edge (targetSdk 36) quedaría bajo la barra de estado.
 */
const GRUPOS_CON_STACK = new Set(["conversaciones", "cobranza"]);

export function usaAreaSeguraSuperior(clave: string): boolean {
  return !GRUPOS_CON_STACK.has(clave);
}

function ContenidoConAreaSegura({ grupo }: { grupo: GrupoSecciones }) {
  const { colores } = useTheme();
  if (!usaAreaSeguraSuperior(grupo.clave)) {
    return <ContenidoDeGrupo grupo={grupo} />;
  }
  return (
    <SafeAreaView
      testID={`area-segura-${grupo.clave}`}
      edges={["top"]}
      style={{ flex: 1, backgroundColor: colores.fondo }}
    >
      <ContenidoDeGrupo grupo={grupo} />
    </SafeAreaView>
  );
}

function ContenidoDeGrupo({ grupo }: { grupo: GrupoSecciones }) {
  if (grupo.clave === "inicio") {
    return <DashboardScreen />;
  }
  if (grupo.clave === "conversaciones") {
    return <OperacionNavigator />;
  }
  if (grupo.clave === "cobranza") {
    return <CobranzaAdminNavigator />;
  }
  if (grupo.clave === "comercio") {
    return <ComercioScreen />;
  }
  if (grupo.clave === "calendario") {
    return <CalendarioScreen />;
  }
  if (grupo.clave === "negocio") {
    return <NegocioScreen />;
  }
  if (grupo.clave === "configuracion") {
    return <ConfiguracionScreen />;
  }
  return <SeccionEnConstruccion titulo={grupo.label} detalle={grupo.detalleHU} />;
}

export function PanelShell() {
  const { colores } = useTheme();
  const { sesion } = useAdminSession();
  const esMaster = sesion?.role === "master";
  const permisos = sesion?.permissions ?? {};
  const navRef = useRef(createNavigationContainerRef());

  const gruposVisibles = GRUPOS_PANEL.filter((g) =>
    grupoVisible(permisos, g.secciones, esMaster),
  );

  useEffect(() => {
    // Deep link desde módulos anidados (HU-APP-21): cambia de tab al destino.
    return suscribirNavegacion((destino) => {
      if (navRef.current?.isReady()) {
        navRef.current.navigate(destino.tab as never);
      }
    });
  }, []);

  return (
    <NavigationContainer ref={navRef}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colores.acento,
          tabBarInactiveTintColor: colores.textoSuave,
          tabBarStyle: { backgroundColor: colores.tarjeta },
        }}
      >
        {gruposVisibles.map((grupo) => (
          <Tab.Screen
            key={grupo.clave}
            name={grupo.clave}
            options={{
              tabBarLabel: grupo.label,
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="home" size={size} color={color} />
              ),
            }}
          >
            {() => <ContenidoConAreaSegura grupo={grupo} />}
          </Tab.Screen>
        ))}
        <Tab.Screen
          name="mas"
          options={{
            tabBarLabel: "Más",
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="menu" size={size} color={color} />
            ),
          }}
        >
          {() => <MasNavigator />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  mas: { flex: 1, padding: 16 },
  item: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  itemSeccion: { fontSize: 15, fontWeight: "600" },
  itemGrupo: { fontSize: 13, marginTop: 2 },
});
