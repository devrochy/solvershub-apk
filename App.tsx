import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_600SemiBold,
  Roboto_700Bold,
} from "@expo-google-fonts/roboto";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { RootStackParamList } from "./src/navigation/types";
import { InicioCobrador } from "./src/navigation/InicioCobrador";
import { PantallaActivaProvider } from "./src/navigation/pantalla-activa-context";
import { TrayectosOverlayProvider } from "./src/navigation/trayectos-overlay-context";
import { OfflineProvider } from "./src/offline/offline-context";
import { LoginScreen } from "./src/screens/LoginScreen";
import { RutaActivaProvider } from "./src/session/ruta-activa-context";
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
      <TrayectosOverlayProvider>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {cobrador ? (
            <Stack.Screen name="SeleccionRuta" component={InicioCobrador} />
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} />
          )}
        </Stack.Navigator>
      </TrayectosOverlayProvider>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_600SemiBold,
    Roboto_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

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
      <StatusBar style="light" />
      <RootNavigator />
    </PantallaActivaProvider>
  );
}

const styles = StyleSheet.create({
  carga: { flex: 1, alignItems: "center", justifyContent: "center" },
});
