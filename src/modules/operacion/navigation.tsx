import { useEffect, useRef, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { createNativeStackNavigator, type NativeStackScreenProps } from "@react-navigation/native-stack";
import type { EntradaPestanas, SolicitudPestana } from "@shared/pestana-inicial";
import { CampanaDelPanel, useKit } from "@shared/ui";
import { OperacionScreen } from "./screens/OperacionScreen";
import { ClienteDetalleScreen } from "./screens/ClienteDetalleScreen";
import { ConversacionDetalleScreen } from "./screens/ConversacionDetalleScreen";

/** Pedido de abrir la ficha de un cliente sobre la lista (aviso tocado, HU-CRM-20); `n` distingue pedidos seguidos. */
export interface SolicitudCliente {
  id: string;
  n: number;
}

export type OperacionStackParamList = {
  Operacion: { pestanaInicial?: SolicitudPestana; clienteInicial?: SolicitudCliente } | undefined;
  ConversacionDetalle: { id: string; titulo: string };
  ClienteDetalle: { id: string; titulo: string; editar?: boolean };
};

const Stack = createNativeStackNavigator<OperacionStackParamList>();

/**
 * Raíz del grupo: la lista (Conversaciones, Escalaciones, Clientes…) y, si llegó un aviso de
 * cliente (HU-CRM-20), su ficha encima: atrás vuelve a la lista. Se abre una sola vez por pedido
 * (`n`), con la app abierta o recién arrancada desde el aviso.
 */
function RaizOperacion({
  route,
  navigation,
  encabezadoRaiz,
  entrada,
}: NativeStackScreenProps<OperacionStackParamList, "Operacion"> & {
  encabezadoRaiz?: ReactNode;
  entrada?: EntradaPestanas;
}) {
  const clienteInicial = route.params?.clienteInicial;
  const atendido = useRef<number | null>(null);
  useEffect(() => {
    if (!clienteInicial || atendido.current === clienteInicial.n) return;
    atendido.current = clienteInicial.n;
    navigation.navigate("ClienteDetalle", { id: clienteInicial.id, titulo: "Cliente" });
  }, [clienteInicial, navigation]);

  return (
    <View style={styles.raiz}>
      {encabezadoRaiz}
      <OperacionScreen pestanaInicial={route.params?.pestanaInicial} entrada={entrada} />
    </View>
  );
}

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
        // La campana siempre arriba a la derecha, también en los detalles (ADR-0167).
        headerRight: () => <CampanaDelPanel />,
        contentStyle: { backgroundColor: c.bg },
      }}
    >
      <Stack.Screen name="Operacion" options={{ title: "Operación", headerShown: !encabezadoRaiz }}>
        {(props) => <RaizOperacion {...props} encabezadoRaiz={encabezadoRaiz} entrada={entrada} />}
      </Stack.Screen>
      <Stack.Screen
        name="ConversacionDetalle"
        component={ConversacionDetalleScreen}
        options={({ route }) => ({ title: route.params.titulo, headerBackTitle: "Conversaciones" })}
      />
      <Stack.Screen
        name="ClienteDetalle"
        component={ClienteDetalleScreen}
        options={({ route }) => ({ title: route.params.titulo })}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({ raiz: { flex: 1 } });
