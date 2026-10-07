import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CobranzaAdminScreen } from "./screens/CobranzaAdminScreen";
import { ClienteDetalleScreen } from "./screens/ClienteDetalleScreen";
import { CarteraDetalleScreen } from "./screens/CarteraDetalleScreen";

export type CobranzaAdminStackParamList = {
  CobranzaAdmin: undefined;
  ClienteDetalle: { id: string; titulo: string };
  CarteraDetalle: { id: string; titulo: string };
};

const Stack = createNativeStackNavigator<CobranzaAdminStackParamList>();

/** Navigator del grupo Cobranza (se anida en el tab del PanelShell, HU-APP-18). */
export function CobranzaAdminNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CobranzaAdmin"
        component={CobranzaAdminScreen}
        options={{ title: "Cobranza" }}
      />
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
