import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { RootStackParamList, RootTabParamList } from "./src/navigation/types";
import { CustomTabBar } from "./src/components/CustomTabBar";
import { OfflineProvider } from "./src/offline/offline-context";
import { ClienteScreen } from "./src/screens/ClienteScreen";
import { ClientesScreen } from "./src/screens/ClientesScreen";
import { DiaScreen } from "./src/screens/DiaScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { PrestamoScreen } from "./src/screens/PrestamoScreen";
import { RutasScreen } from "./src/screens/RutasScreen";
import { RutaActivaProvider } from "./src/session/ruta-activa-context";
import { SessionProvider, useSession } from "./src/session/session-context";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

function TabsNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Rutas" component={RutasScreen} options={{ title: "Rutas" }} />
      <Tab.Screen name="Dia" component={DiaScreen} options={{ title: "Día" }} />
      <Tab.Screen name="Clientes" component={ClientesScreen} options={{ title: "Clientes" }} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { cobrador, loading } = useSession();

  if (loading) {
    return (
      <View style={styles.carga}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {cobrador ? (
          <>
            <Stack.Screen
              name="Main"
              component={TabsNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Cliente"
              component={ClienteScreen}
              options={({ route }) => ({ title: route.params.nombre })}
            />
            <Stack.Screen
              name="Prestamo"
              component={PrestamoScreen}
              options={{ title: "Préstamo" }}
            />
          </>
        ) : (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <OfflineProvider>
          <RutaActivaProvider>
            <StatusBar style="auto" />
            <RootNavigator />
          </RutaActivaProvider>
        </OfflineProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  carga: { flex: 1, alignItems: "center", justifyContent: "center" },
});