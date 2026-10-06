import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
import { Montserrat_600SemiBold, Montserrat_700Bold } from "@expo-google-fonts/montserrat";
import { useEffect, useRef, useState } from "react";
import Constants from "expo-constants";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { RootStackParamList } from "./src/modules/cobranza/navigation/types";
import { CarteraFlujo } from "./src/modules/cobranza/navigation/CarteraFlujo";
import { MenuLateralProvider } from "./src/modules/cobranza/navigation/menu-lateral-context";
import { MenuLateral } from "./src/navigation/MenuLateral";
import { PantallaActivaProvider } from "./src/modules/cobranza/navigation/pantalla-activa-context";
import { TrayectosOverlayProvider } from "./src/modules/cobranza/navigation/trayectos-overlay-context";
import { OfflineProvider } from "./src/modules/cobranza/offline/offline-context";
import { SeleccionNegocioScreen } from "./src/modules/cobranza/screens/SeleccionNegocioScreen";
import { InvitacionesScreen } from "./src/modules/cobranza/screens/InvitacionesScreen";
import { VincularDispositivoScreen } from "./src/modules/cobranza/screens/VincularDispositivoScreen";
import { SeleccionCarteraScreen } from "./src/modules/cobranza/screens/SeleccionCarteraScreen";
import { PerfilScreen } from "./src/modules/cobranza/screens/PerfilScreen";
import { ConfiguracionScreen } from "./src/modules/cobranza/screens/ConfiguracionScreen";
import { NotificacionesScreen } from "./src/modules/cobranza/screens/NotificacionesScreen";
import { CarteraActivaProvider } from "./src/modules/cobranza/session/cartera-activa-context";
import { NotificacionesProvider } from "./src/modules/cobranza/session/notificaciones-context";
import { SessionProvider, useSession } from "./src/modules/cobranza/session/session-context";
import { AdminSessionProvider, useAdminSession } from "./src/core/session/admin-session-context";
import { AuthStack } from "./src/modules/auth/navigation";
import { LoginUnificadoScreen } from "./src/modules/auth/screens/LoginUnificadoScreen";
import { RecuperarContrasenaScreen } from "./src/modules/auth/screens/RecuperarContrasenaScreen";
import {
  BloqueoBiometrico,
  useBloqueoBiometrico,
} from "./src/modules/auth/screens/BloqueoBiometrico";
import { SeleccionNegocioAdminScreen } from "./src/modules/auth/screens/SeleccionNegocioAdminScreen";
import { PanelShell } from "./src/navigation/PanelShell";
import { campoNavRef } from "./src/navigation/refs";
import { PushProvider, type PushDatos } from "./src/modules/notificaciones";
import { ThemeProvider } from "@core/theme/theme-context";
import { inicializarBase } from "./src/data/bootstrap";
import { SincronizadorProvider } from "./src/data/SincronizadorProvider";

const Stack = createNativeStackNavigator<RootStackParamList>();

const PROYECTO_EAS =
  (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ??
  "3e8fed2f-1720-4cd7-ab2f-01fac56167ed";

/** Puente: lee la sesión admin y arma el PushProvider (HU-APP-05). */
function PushRoot({ children }: { children: React.ReactNode }) {
  const { sesion } = useAdminSession();
  const alTocarPush = (datos: PushDatos) => {
    // Deep link v1: la actividad de campo lleva al diario. Los tipos del panel
    // se enrutan cuando existan sus pantallas (HU-APP-04/08+).
    if (datos?.type === "cobranza.sync" && campoNavRef.isReady()) {
      campoNavRef.navigate("Cartera", {});
    }
  };
  return (
    <PushProvider
      adminToken={sesion?.token ?? null}
      tenantId={sesion?.tenantId ?? null}
      projectId={PROYECTO_EAS}
      alTocarNotificacion={alTocarPush}
    >
      {children}
    </PushProvider>
  );
}

function AuthNavigator() {
  const { login: loginLegado, aplicarSesionExterna } = useSession();

  const aplicarCampo = (result: unknown) =>
    aplicarSesionExterna?.(result as never) ?? Promise.resolve();

  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="LoginUnificado">
        {({ navigation }) => (
          <LoginUnificadoScreen
            onAutenticado={aplicarCampo}
            onFlujoLegado={(usuario, password) => loginLegado(usuario, password)}
            alSeleccionarNegocios={() => navigation.navigate("SeleccionNegocioAdmin")}
            onEntrarPanel={() => setModoPanelRef.current?.(true)}
            irARecuperarContrasena={() => navigation.navigate("RecuperarContrasena")}
          />
        )}
      </AuthStack.Screen>
      <AuthStack.Screen name="SeleccionNegocioAdmin">
        {() => (
          <SeleccionNegocioAdminScreen
            onAutenticado={aplicarCampo}
            onEntrarPanel={() => setModoPanelRef.current?.(true)}
            onCancelar={() => undefined}
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

/** Ref del setter de "modo panel" para pasarlo al AuthNavigator sin prop drilling. */
const setModoPanelRef: { current: ((v: boolean) => void) | null } = { current: null };

function RootNavigator() {
  const { gestor, loading, requiereVinculacion, negociosPendientes, membresiaToken } =
    useSession();
  const { sesion: sesionAdmin, loading: loadingAdmin } = useAdminSession();
  const bio = useBloqueoBiometrico(sesionAdmin?.adminId ?? null);
  const [modoPanel, setModoPanel] = useState(false);
  setModoPanelRef.current = setModoPanel;

  // Hidratación inicial: admin persistido sin sesión de campo (usuario de
  // panel) entra directo al panel; el login en curso no dispara este efecto.
  const hidratado = useRef(false);
  useEffect(() => {
    if (!loadingAdmin && !loading && !hidratado.current) {
      hidratado.current = true;
      if (sesionAdmin && !gestor) {
        setModoPanel(true);
      }
    }
  }, [loadingAdmin, loading, sesionAdmin, gestor]);

  if (loading || loadingAdmin) {
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

  // Usuario de panel (sin tokens de campo o con rol distinto de gestor):
  // shell del panel armado por permisos (ADR-APP-02, HU-APP-03).
  if (modoPanel || (gestor && gestor.rol !== "gestor")) {
    return <PanelShell />;
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
    <NavigationContainer ref={campoNavRef}>
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
          <SincronizadorProvider>
            <PushRoot>
            <SessionProvider>
              <OfflineProvider>
                <CarteraActivaProvider>
                  <NotificacionesProvider>
                    <RootContent />
                  </NotificacionesProvider>
                </CarteraActivaProvider>
              </OfflineProvider>
            </SessionProvider>
            </PushRoot>
          </SincronizadorProvider>
        </AdminSessionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootContent() {
  const { gestor } = useSession();

  // Base local cifrada (ADR-APP-05): se abre al arrancar; un fallo no bloquea
  // la app (los flujos legacy de AsyncStorage siguen operando hasta HU-APP-07).
  useEffect(() => {
    inicializarBase().catch(() => undefined);
  }, []);

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
