import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { CustomTabBarMain } from "../components/CustomTabBarMain";
import { ConfiguracionScreen } from "../screens/ConfiguracionScreen";
import { PerfilScreen } from "../screens/PerfilScreen";
import { CarterasScreen } from "../screens/CarterasScreen";
import type { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

/** Menú inferior principal: Perfil | Carteras (centro) | Configuración. */
export function MainTabsNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Carteras"
      tabBar={(props) => <CustomTabBarMain {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Perfil" component={PerfilScreen} options={{ title: "Perfil" }} />
      <Tab.Screen name="Carteras" component={CarterasScreen} options={{ title: "Carteras" }} />
      <Tab.Screen
        name="Configuracion"
        component={ConfiguracionScreen}
        options={{ title: "Configuración" }}
      />
    </Tab.Navigator>
  );
}
