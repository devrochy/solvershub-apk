import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { CustomTabBar } from "../components/CustomTabBar";
import { ClientesScreen } from "../screens/ClientesScreen";
import { DiaScreen } from "../screens/DiaScreen";
import { RutaDetalleScreen } from "../screens/RutaDetalleScreen";
import type { RootTabParamList } from "./types";

const Tab = createBottomTabNavigator<RootTabParamList>();

export function TabsNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Dia"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Ruta" component={RutaDetalleScreen} options={{ title: "Ruta" }} />
      <Tab.Screen name="Dia" component={DiaScreen} options={{ title: "Día" }} />
      <Tab.Screen name="Clientes" component={ClientesScreen} options={{ title: "Clientes" }} />
    </Tab.Navigator>
  );
}
