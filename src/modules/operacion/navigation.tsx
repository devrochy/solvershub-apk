import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { EntradaPestanas, SolicitudPestana } from "@shared/pestana-inicial";
import { useKit } from "@shared/ui";
import { OperacionScreen } from "./screens/OperacionScreen";
import { ConversacionDetalleScreen } from "./screens/ConversacionDetalleScreen";

export type OperacionStackParamList = {
  Operacion: { pestanaInicial?: SolicitudPestana } | undefined;
  ConversacionDetalle: { id: string; titulo: string };
};

const Stack = createNativeStackNavigator<OperacionStackParamList>();

/**
 * Navigator del grupo Operación (se anida en el PanelShell). Con
 * `encabezadoRaiz` (el header del panel con la hamburguesa) la raíz no muestra
 * el header nativo; los detalles sí, con la flecha atrás. `entrada` son las
 * pestañas de la entrada del cajón por la que se llegó (Clientes, Agentes…).
 */
export function OperacionNavigator({
  encabezadoRaiz,
  entrada,
}: { encabezadoRaiz?: ReactNode; entrada?: EntradaPestanas } = {}) {
  const { c } = useKit();
  return (
    <Stack.Navigator
      screenOptions={{
        // Los detalles conservan el header nativo: con el tema, no el blanco por defecto.
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.text,
        headerTitleStyle: { color: c.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: c.bg },
      }}
    >
      <Stack.Screen name="Operacion" options={{ title: "Operación", headerShown: !encabezadoRaiz }}>
        {({ route }) => (
          <View style={styles.raiz}>
            {encabezadoRaiz}
            <OperacionScreen pestanaInicial={route.params?.pestanaInicial} entrada={entrada} />
          </View>
        )}
      </Stack.Screen>
      <Stack.Screen
        name="ConversacionDetalle"
        component={ConversacionDetalleScreen}
        options={({ route }) => ({ title: route.params.titulo })}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({ raiz: { flex: 1 } });
