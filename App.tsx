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
import { AdminSessionProvider, useAdminSession } from "./src/modules/auth/admin-session-context";
import { AuthStack } from "./src/modules/auth/navigation";
import { LoginUnificadoScreen } from "./src/modules/auth/screens/LoginUnificadoScreen";
import { RecuperarContrasenaScreen } from "./src/modules/auth/screens/RecuperarContrasenaScreen";
import {
  BloqueoBiometrico,
  useBloqueoBiometrico,
} from "./src/modules/auth/screens/BloqueoBiometrico";
import { ThemeProvider } from "@core/theme/theme-context";

const Stack = createNativeStackNavigator<RootStackParamList>();

function AuthNavigator() {
  const { login: loginLegado, aplicarSesionExterna } = useSession();

  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="LoginUnificado">
        {({ navigation }) => (
          <LoginUnificadoScreen
            onAutenticado={(result) => aplicarSesionExterna?.(result) ?? Promise.resolve()}
            onFlujoLegado={(usuario, password) => loginLegado(usuario, password)}
            irARecuperarContrasena={() => navigation.navigate("RecuperarContrasena")}
          />
        )}
      </AuthStack.Screen>
      <AuthStack.Screen name="RecuperarContrasena">
        {({ navigation }) => (
          <RecuperarContrasenaScreen
            volverAlLogin={() => navigation.navigate("LoginUnificado")}
          />
        )}
      </AuthStack.Screen>
    </AuthStack.Navigator>
  );
}

function RootNavigator() {
  const { gestor, loading, requiereVinculacion, negociosPendientes, membresiaToken } =
    useSession();
  const { sesion: sesionAdmin } = useAdminSession();
  const bio = useBloqueoBiometrico(sesionAdmin?.adminId ?? null);

  if (loading) {
    return (
      <View style={styles.carga}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Sin sesión admin: login unificado + recuperación de contraseña.
  if (!sesionAdmin) {
    return (
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
    );
  }

  // Biometría habilitada y sin verificar: puerta antes de mostrar contenido.
  if (bio.requerido && !bio.verificado) {
    return (
      <NavigationContainer>
        <BloqueoBiometrico onDesbloqueado={bio.marcarVerificado} />
      </NavigationContainer>
    );
  }

  // Sesión admin activa pero sin sesión de campo aún (flujo legado en curso):
  // el login unificado resuelve invitaciones/selector antes de aplicar tokens.
  if (!gestor) {
    return (
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
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
            ) : (
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
        <AdminSessionProvider>
          <SessionProvider>
            <OfflineProvider>
              <CarteraActivaProvider>
                <NotificacionesProvider>
                  <RootContent />
                </NotificacionesProvider>
              </CarteraActivaProvider>
            </OfflineProvider>
          </SessionProvider>
        </AdminSessionProvider>
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
