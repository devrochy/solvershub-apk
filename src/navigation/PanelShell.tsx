import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAdminSession } from "../modules/auth/admin-session-context";
import { grupoVisible, seccionesPermitidas } from "@core/permisos";
import { useTheme } from "@core/theme/theme-context";
import { SeccionEnConstruccion } from "./screens/SeccionEnConstruccion";

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

function MasScreen() {
  const { colores } = useTheme();
  const { sesion } = useAdminSession();
  const esMaster = sesion?.role === "master";
  const items = seccionesDeMenu(sesion?.permissions ?? {}, esMaster);

  return (
    <View style={[styles.mas, { backgroundColor: colores.fondo }]}>
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

function TabPlaceholder({ grupo }: { grupo: GrupoSecciones }) {
  return <SeccionEnConstruccion titulo={grupo.label} detalle={grupo.detalleHU} />;
}

export function PanelShell() {
  const { colores } = useTheme();
  const { sesion } = useAdminSession();
  const esMaster = sesion?.role === "master";
  const permisos = sesion?.permissions ?? {};

  const gruposVisibles = GRUPOS_PANEL.filter((g) =>
    grupoVisible(permisos, g.secciones, esMaster),
  );

  return (
    <NavigationContainer>
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
            {() => <TabPlaceholder grupo={grupo} />}
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
          {() => <MasScreen />}
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
