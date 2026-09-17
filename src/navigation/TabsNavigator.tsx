import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { CustomTabBar } from "../components/CustomTabBar";
import { ClientesScreen } from "../screens/ClientesScreen";
import { TrayectoDiarioScreen } from "../screens/TrayectoDiarioScreen";
import { CarteraDetalleScreen } from "../screens/CarteraDetalleScreen";
import type { RootTabParamList } from "./types";

const Tab = createBottomTabNavigator<RootTabParamList>();

export function TabsNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="TrayectoDiario"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Cartera" component={CarteraDetalleScreen} options={{ title: "Cartera" }} />
      <Tab.Screen name="TrayectoDiario" component={TrayectoDiarioScreen} options={{ title: "Trayecto diario" }} />
      <Tab.Screen name="Clientes" component={ClientesScreen} options={{ title: "Clientes" }} />
    </Tab.Navigator>
  );
}
