import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
import { Montserrat_600SemiBold, Montserrat_700Bold } from "@expo-google-fonts/montserrat";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { RootStackParamList } from "./src/navigation/types";
import { CarteraFlujo } from "./src/navigation/CarteraFlujo";
import { MenuLateralProvider } from "./src/navigation/menu-lateral-context";
import { MenuLateral } from "./src/components/MenuLateral";
import { PantallaActivaProvider } from "./src/navigation/pantalla-activa-context";
import { TrayectosOverlayProvider } from "./src/navigation/trayectos-overlay-context";
import { OfflineProvider } from "./src/offline/offline-context";
import { LoginScreen } from "./src/screens/LoginScreen";
import { SeleccionNegocioScreen } from "./src/screens/SeleccionNegocioScreen";
import { InvitacionesScreen } from "./src/screens/InvitacionesScreen";
import { VincularDispositivoScreen } from "./src/screens/VincularDispositivoScreen";
import { SeleccionCarteraScreen } from "./src/screens/SeleccionCarteraScreen";
import { PerfilScreen } from "./src/screens/PerfilScreen";
import { ConfiguracionScreen } from "./src/screens/ConfiguracionScreen";
import { NotificacionesScreen } from "./src/screens/NotificacionesScreen";
import { CarteraActivaProvider } from "./src/session/cartera-activa-context";
import { NotificacionesProvider } from "./src/session/notificaciones-context";
import { SessionProvider, useSession } from "./src/session/session-context";
import { ThemeProvider } from "@core/theme/theme-context";

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { gestor, loading, requiereVinculacion, negociosPendientes, membresiaToken } = useSession();

  if (loading) {
    return (
      <View style={styles.carga}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <MenuLateralProvider>
        <TrayectosOverlayProvider>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {membresiaToken ? (
              <Stack.Screen name="Invitaciones" component={InvitacionesScreen} />
            ) : negociosPendientes.length > 0 ? (
              <Stack.Screen name="SeleccionNegocio" component={SeleccionNegocioScreen} />
            ) : gestor && requiereVinculacion ? (
              <Stack.Screen
                name="VincularDispositivo"
                component={VincularDispositivoScreen}
              />
            ) : gestor ? (
              <>
                <Stack.Screen name="Main">
                  {(props) => (
                    <SeleccionCarteraScreen
                      onCarteraSeleccionada={() => props.navigation.navigate("Cartera", {})}
                    />
                  )}
                </Stack.Screen>
                <Stack.Screen name="Cartera" component={CarteraFlujo} />
                <Stack.Screen name="Perfil" component={PerfilScreen} />
                <Stack.Screen name="Configuracion" component={ConfiguracionScreen} />
                <Stack.Screen name="Notificaciones" component={NotificacionesScreen} />
              </>
            ) : (
              <Stack.Screen name="Login" component={LoginScreen} />
            )}
          </Stack.Navigator>
          <MenuLateral />
        </TrayectosOverlayProvider>
      </MenuLateralProvider>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SessionProvider>
          <OfflineProvider>
            <CarteraActivaProvider>
              <NotificacionesProvider>
                <RootContent />
              </NotificacionesProvider>
            </CarteraActivaProvider>
          </OfflineProvider>
        </SessionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootContent() {
  const { gestor } = useSession();
  return (
    <PantallaActivaProvider resetKey={gestor?.id ?? null}>
      <StatusBar style="light" />
      <RootNavigator />
    </PantallaActivaProvider>
  );
}

const styles = StyleSheet.create({
  carga: { flex: 1, alignItems: "center", justifyContent: "center" },
});
