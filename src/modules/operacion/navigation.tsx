import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { OperacionScreen } from "./screens/OperacionScreen";
import { ConversacionDetalleScreen } from "./screens/ConversacionDetalleScreen";

export type OperacionStackParamList = {
  Operacion: undefined;
  ConversacionDetalle: { id: string; titulo: string };
};

const Stack = createNativeStackNavigator<OperacionStackParamList>();

/** Navigator del grupo Operación (se anida en el tab del PanelShell). */
export function OperacionNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Operacion"
        component={OperacionScreen}
        options={{ title: "Operación" }}
      />
      <Stack.Screen
        name="ConversacionDetalle"
        component={ConversacionDetalleScreen}
        options={({ route }) => ({ title: route.params.titulo })}
      />
    </Stack.Navigator>
  );
}
