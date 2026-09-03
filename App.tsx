import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { RootStackParamList, RootTabParamList } from "./src/navigation/types";
import { PantallaActivaProvider } from "./src/navigation/pantalla-activa-context";
import { ContenidoTab } from "./src/navigation/ContenidoTab";
import { CustomTabBar } from "./src/components/CustomTabBar";
import { OfflineProvider } from "./src/offline/offline-context";
import { ClientesScreen } from "./src/screens/ClientesScreen";
import { DiaScreen } from "./src/screens/DiaScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { RutaDetalleScreen } from "./src/screens/RutaDetalleScreen";
import { SeleccionRutaScreen } from "./src/screens/SeleccionRutaScreen";
import { RutaActivaProvider } from "./src/session/ruta-activa-context";
import { SessionProvider, useSession } from "./src/session/session-context";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

function ContenidoRuta() {
  return (
    <ContenidoTab>
      <RutaDetalleScreen />
    </ContenidoTab>
  );
}

function ContenidoDia() {
  return (
    <ContenidoTab>
      <DiaScreen />
    </ContenidoTab>
  );
}

function ContenidoClientes() {
  return (
    <ContenidoTab>
      <ClientesScreen />
    </ContenidoTab>
  );
}

function TabsNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Dia"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Ruta" component={ContenidoRuta} options={{ title: "Ruta" }} />
      <Tab.Screen name="Dia" component={ContenidoDia} options={{ title: "Día" }} />
      <Tab.Screen name="Clientes" component={ContenidoClientes} options={{ title: "Clientes" }} />
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
              name="SeleccionRuta"
              component={SeleccionRutaScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Main"
              component={TabsNavigator}
              options={{ headerShown: false }}
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
            <RootContent />
          </RutaActivaProvider>
        </OfflineProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}

function RootContent() {
  const { cobrador } = useSession();
  return (
    <PantallaActivaProvider resetKey={cobrador?.id ?? null}>
      <StatusBar style="auto" />
      <RootNavigator />
    </PantallaActivaProvider>
  );
}

const styles = StyleSheet.create({
  carga: { flex: 1, alignItems: "center", justifyContent: "center" },
});