import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { CustomTabBarMain } from "../components/CustomTabBarMain";
import { ConfiguracionScreen } from "../screens/ConfiguracionScreen";
import { PerfilScreen } from "../screens/PerfilScreen";
import { RutasScreen } from "../screens/RutasScreen";
import type { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

/** Menú inferior principal: Perfil | Rutas (centro) | Configuración. */
export function MainTabsNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Rutas"
      tabBar={(props) => <CustomTabBarMain {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Perfil" component={PerfilScreen} options={{ title: "Perfil" }} />
      <Tab.Screen name="Rutas" component={RutasScreen} options={{ title: "Rutas" }} />
      <Tab.Screen
        name="Configuracion"
        component={ConfiguracionScreen}
        options={{ title: "Configuración" }}
      />
    </Tab.Navigator>
  );
}
