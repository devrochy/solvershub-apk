import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
import { Montserrat_600SemiBold, Montserrat_700Bold } from "@expo-google-fonts/montserrat";
import { useCallback, useEffect, useRef, useState } from "react";
import Constants from "expo-constants";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { ActivityIndicator, AppState, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
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
import { EquipoEnEsperaScreen } from "./src/modules/auth/screens/EquipoEnEsperaScreen";
import { consultarEquipo } from "./src/core/api/acceso";
import { ApiAuthError, apiGestorToken } from "./src/core/api/auth-admin";
import { suscribirAccesoDeEquipo, type CodigoDeEquipo } from "@shared/acceso-evento";
import { PanelShell } from "./src/navigation/PanelShell";
import { campoNavRef } from "./src/navigation/refs";
import {
  BannerNotificacion,
  CentroNotificacionesProvider,
  destinoDePush,
  PushProvider,
  type AvisoBanner,
  type PushDatos,
} from "./src/modules/notificaciones";
import { emitirNavegacion } from "@shared/navegacion-evento";
import { ThemeProvider } from "@core/theme/theme-context";
import { inicializarBase } from "./src/data/bootstrap";
import { SincronizadorProvider } from "./src/data/SincronizadorProvider";
import { kitDeTema, ToastProvider } from "@shared/ui";
import {
  PresentacionScreen,
  debeMostrarPresentacion,
  usePresentacion,
  type Presentacion,
} from "./src/modules/presentacion";

const Stack = createNativeStackNavigator<RootStackParamList>();
const KIT_OSCURO = kitDeTema("oscuro");

const PROYECTO_EAS =
  (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ??
  "3e8fed2f-1720-4cd7-ab2f-01fac56167ed";

/** Puente: lee la sesión admin y arma el PushProvider (HU-APP-05). */
function PushRoot({ children }: { children: React.ReactNode }) {
  const { sesion } = useAdminSession();
  // El push recibido con la app abierta refresca el contador del centro de notificaciones y,
  // si es del centro (trae categoría), se muestra en un banner animado propio.
  const refrescarCentro = useRef<(() => void) | null>(null);
  const [aviso, setAviso] = useState<AvisoBanner | null>(null);
  const cerrarAviso = useCallback(() => setAviso(null), []);
  const alRecibirPush = (datos: PushDatos, contenido?: { title?: string; body?: string }) => {
    refrescarCentro.current?.();
    if (typeof datos?.category !== "string") return;
    setAviso({
      id: String(datos.notificationId ?? `${Date.now()}`),
      titulo: contenido?.title ?? "Nueva notificación",
      cuerpo: contenido?.body,
      categoria: datos.category,
      severidad: typeof datos.severity === "string" ? datos.severity : "info",
      datos,
    });
  };
  const alTocarPush = (datos: PushDatos) => {
    // Sesión de campo (gestor): la actividad de campo lleva al diario.
    if (datos?.type === "cobranza.sync" && campoNavRef.isReady()) {
      campoNavRef.navigate("Cartera", {});
      return;
    }
    // Panel: el destino neutro del centro de notificaciones (ADR-0167) o, si no viene, el `type`
    // legado del push (ADR-0099).
    const destino = destinoDePush(datos);
    if (destino) {
      emitirNavegacion(destino);
    }
  };
  return (
    <PushProvider
      adminToken={sesion?.token ?? null}
      tenantId={sesion?.tenantId ?? null}
      projectId={PROYECTO_EAS}
      alTocarNotificacion={alTocarPush}
      alRecibirNotificacion={alRecibirPush}
    >
      <CentroNotificacionesProvider refrescarRef={refrescarCentro}>
        {children}
        <BannerNotificacion
          aviso={aviso}
          onCerrar={cerrarAviso}
          onAbrir={(a) => {
            setAviso(null);
            alTocarPush(a.datos as PushDatos);
          }}
        />
      </CentroNotificacionesProvider>
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

function RootNavigator({ presentacion }: { presentacion: Presentacion }) {
  const {
    gestor,
    loading,
    requiereVinculacion,
    negociosPendientes,
    membresiaToken,
    aplicarSesionExterna,
    logout: logoutCampo,
  } = useSession();
  const { sesion: sesionAdmin, loading: loadingAdmin, logout: logoutAdmin } = useAdminSession();
  const bio = useBloqueoBiometrico(sesionAdmin?.adminId ?? null);
  const [modoPanel, setModoPanel] = useState(false);
  const [bloqueoDeEquipo, setBloqueoDeEquipo] = useState<CodigoDeEquipo | null>(null);
  const [introAlInicio, setIntroAlInicio] = useState<boolean | null>(null);
  const [introTerminada, setIntroTerminada] = useState(false);
  const terminarIntro = useCallback(() => {
    setIntroTerminada(true);
    void presentacion.marcarVista();
  }, [presentacion.marcarVista]);
  // El setter es estable: se publica tras montar para los handlers de fuera del árbol.
  useEffect(() => {
    setModoPanelRef.current = setModoPanel;
    return () => {
      setModoPanelRef.current = null;
    };
  }, []);

  // Equipo no autorizado (ADR-0174, HU-ACC-05): cualquier 403 de equipo o la consulta de
  // `device-session` muestran la pantalla de espera/bloqueo en vez de un error suelto.
  const tokenAdmin = sesionAdmin?.token ?? null;
  const negocioAdmin = sesionAdmin?.tenantId ?? null;
  useEffect(() => suscribirAccesoDeEquipo(setBloqueoDeEquipo), []);
  useEffect(() => {
    if (!tokenAdmin || !negocioAdmin) {
      setBloqueoDeEquipo(null);
      return;
    }
    const verificar = () => {
      consultarEquipo(tokenAdmin, negocioAdmin)
        .then((e) => {
          if (!e.permitido) {
            setBloqueoDeEquipo(e.estado === "bloqueado" ? "dispositivo_bloqueado" : "dispositivo_pendiente");
          }
        })
        // Sin red o con error: la app sigue; el backend aplica la política en cada petición.
        .catch(() => undefined);
    };
    verificar();
    const sub = AppState.addEventListener("change", (estado) => {
      if (estado === "active") verificar();
    });
    return () => sub.remove();
  }, [tokenAdmin, negocioAdmin]);
  const consultarEsteEquipo = useCallback(
    () => consultarEquipo(tokenAdmin ?? "", negocioAdmin ?? ""),
    [tokenAdmin, negocioAdmin],
  );
  const equipoAprobado = useCallback(async () => {
    setBloqueoDeEquipo(null);
    if (!tokenAdmin || !negocioAdmin || gestor || modoPanel) return;
    // Entra sola: repite el intercambio a campo que el 403 había frenado, sin pedir la clave.
    try {
      const campo = await apiGestorToken(tokenAdmin, negocioAdmin);
      await aplicarSesionExterna?.(campo);
    } catch (err) {
      if (err instanceof ApiAuthError && err.status === 403 && err.code === "sin_acceso_campo") {
        setModoPanel(true);
      }
    }
  }, [tokenAdmin, negocioAdmin, gestor, modoPanel, aplicarSesionExterna]);
  const salirDelEquipo = useCallback(async () => {
    setBloqueoDeEquipo(null);
    await logoutCampo();
    await logoutAdmin();
  }, [logoutCampo, logoutAdmin]);

  // Hidratación inicial: admin persistido sin sesión de campo (usuario de
  // panel) entra directo al panel; el login en curso no dispara este efecto.
  const hidratado = useRef(false);
  useEffect(() => {
    if (!loadingAdmin && !loading && !hidratado.current) {
      hidratado.current = true;
      if (sesionAdmin && !gestor) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratación única al restaurar la sesión
        setModoPanel(true);
      }
      // La decisión se toma una sola vez por arranque: si había sesión, el intro
      // no reaparece después de cerrar sesión en la misma ejecución.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- decisión única al hidratar
      setIntroAlInicio(
        debeMostrarPresentacion({
          haySesion: Boolean(sesionAdmin || gestor),
          vista: presentacion.vista,
          reduceMotion: presentacion.reduceMotion,
        }),
      );
    }
  }, [
    loadingAdmin,
    loading,
    sesionAdmin,
    gestor,
    presentacion.vista,
    presentacion.reduceMotion,
  ]);

  if (loading || loadingAdmin || introAlInicio === null) {
    return (
      <View style={[styles.carga, { backgroundColor: KIT_OSCURO.c.bg }]}>
        <ActivityIndicator size="large" color={KIT_OSCURO.c.link} />
      </View>
    );
  }

  // Presentación de primer inicio: solo sin sesión, una vez y con movimiento.
  if (introAlInicio && !introTerminada) {
    return <PresentacionScreen onTerminar={terminarIntro} />;
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

  if (bloqueoDeEquipo) {
    return (
      <EquipoEnEsperaScreen
        codigo={bloqueoDeEquipo}
        consultar={consultarEsteEquipo}
        alAprobado={() => void equipoAprobado()}
        cerrarSesion={() => void salirDelEquipo()}
      />
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
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });
  const presentacion = usePresentacion();
  const listo = (fontsLoaded || Boolean(fontError)) && presentacion.listo;

  useEffect(() => {
    if (listo) void SplashScreen.hideAsync();
  }, [listo]);

  if (!listo) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.raiz}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ToastProvider>
            <AdminSessionProvider>
              <SincronizadorProvider>
                <PushRoot>
                  <SessionProvider>
                    <OfflineProvider>
                      <CarteraActivaProvider>
                        <NotificacionesProvider>
                          <RootContent presentacion={presentacion} />
                        </NotificacionesProvider>
                      </CarteraActivaProvider>
                    </OfflineProvider>
                  </SessionProvider>
                </PushRoot>
              </SincronizadorProvider>
            </AdminSessionProvider>
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootContent({ presentacion }: { presentacion: Presentacion }) {
  const { gestor } = useSession();

  // Base local cifrada (ADR-APP-05): se abre al arrancar; un fallo no bloquea
  // la app (los flujos legacy de AsyncStorage siguen operando hasta HU-APP-07).
  useEffect(() => {
    inicializarBase().catch(() => undefined);
  }, []);

  return (
    <PantallaActivaProvider resetKey={gestor?.id ?? null}>
      <StatusBar style="light" />
      <RootNavigator presentacion={presentacion} />
    </PantallaActivaProvider>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  carga: { flex: 1, alignItems: "center", justifyContent: "center" },
});
