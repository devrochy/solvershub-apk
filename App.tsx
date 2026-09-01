import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import type { RootStackParamList } from "./src/navigation/types";
import { OfflineProvider } from "./src/offline/offline-context";
import { ClienteScreen } from "./src/screens/ClienteScreen";
import { DiaScreen } from "./src/screens/DiaScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { RutasScreen } from "./src/screens/RutasScreen";
import { SessionProvider, useSession } from "./src/session/session-context";

const Stack = createNativeStackNavigator<RootStackParamList>();

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
              name="Rutas"
              component={RutasScreen}
              options={{ title: "Mis rutas" }}
            />
            <Stack.Screen
              name="Dia"
              component={DiaScreen}
              options={({ route }) => ({ title: route.params.rutaNombre })}
            />
            <Stack.Screen
              name="Cliente"
              component={ClienteScreen}
              options={({ route }) => ({ title: route.params.nombre })}
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
    <SessionProvider>
      <OfflineProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </OfflineProvider>
    </SessionProvider>
  );
}

const styles = StyleSheet.create({
  carga: { flex: 1, alignItems: "center", justifyContent: "center" },
});