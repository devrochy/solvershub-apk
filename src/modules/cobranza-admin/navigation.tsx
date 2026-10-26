import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { SolicitudPestana } from "@shared/pestana-inicial";
import { CampanaDelPanel, useKit } from "@shared/ui";
import { CobranzaAdminScreen } from "./screens/CobranzaAdminScreen";
import { ClienteDetalleScreen } from "./screens/ClienteDetalleScreen";
import { CarteraDetalleScreen } from "./screens/CarteraDetalleScreen";

export type CobranzaAdminStackParamList = {
  CobranzaAdmin: { pestanaInicial?: SolicitudPestana } | undefined;
  ClienteDetalle: { id: string; titulo: string };
  CarteraDetalle: { id: string; titulo: string };
};

const Stack = createNativeStackNavigator<CobranzaAdminStackParamList>();

/**
 * Navigator del grupo Cobranza (se anida en el PanelShell, HU-APP-18). Con
 * `encabezadoRaiz` (el header del panel con la hamburguesa) la raíz no muestra
 * el header nativo; los detalles sí, con la flecha atrás.
 */
export function CobranzaAdminNavigator({ encabezadoRaiz }: { encabezadoRaiz?: ReactNode } = {}) {
  const { c } = useKit();
  return (
    <Stack.Navigator
      screenOptions={{
        // Los detalles conservan el header nativo: con el tema, no el blanco por defecto.
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.text,
        headerTitleStyle: { color: c.text },
        headerShadowVisible: false,
        // La campana siempre arriba a la derecha, también en los detalles (ADR-0167).
        headerRight: () => <CampanaDelPanel />,
        contentStyle: { backgroundColor: c.bg },
      }}
    >
      <Stack.Screen name="CobranzaAdmin" options={{ title: "Cobranza", headerShown: !encabezadoRaiz }}>
        {({ route }) => (
          <View style={styles.raiz}>
            {encabezadoRaiz}
            <CobranzaAdminScreen pestanaInicial={route.params?.pestanaInicial} />
          </View>
        )}
      </Stack.Screen>
      <Stack.Screen
        name="ClienteDetalle"
        component={ClienteDetalleScreen}
        options={({ route }) => ({ title: route.params.titulo })}
      />
      <Stack.Screen
        name="CarteraDetalle"
        component={CarteraDetalleScreen}
        options={({ route }) => ({ title: route.params.titulo })}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({ raiz: { flex: 1 } });
