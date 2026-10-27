import { useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@core/theme/theme-context";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Button, Icono, PasswordField, TextField, useKit } from "@shared/ui";
import type { LoginResult } from "@shared/types/auth";
import { useAdminSession } from "@core/session/admin-session-context";
import { ApiAuthError, apiGestorToken } from "@core/api/auth-admin";
import { biometriaDisponible, biometriaHabilitada, deshabilitarBiometria, habilitarBiometria } from "../biometria";
import { LOGO_POR_TEMA } from "../marca";

export interface LoginUnificadoProps {
  /** Sesión de campo lista (exchange OK): el compositor la aplica. */
  onAutenticado(result: LoginResult): Promise<void>;
  /** Cero negocios: se delega al flujo legado (invitaciones ADR-0081). */
  onFlujoLegado(usuario: string, password: string): Promise<void>;
  /** Varios negocios: se abre el selector admin (HU-APP-03). */
  alSeleccionarNegocios(): void;
  /** Negocio sin acceso de campo: se entra al panel con la sesión admin. */
  onEntrarPanel(): void;
  irARecuperarContrasena(): void;
}

export function LoginUnificadoScreen({
  onAutenticado,
  onFlujoLegado,
  alSeleccionarNegocios,
  onEntrarPanel,
  irARecuperarContrasena,
}: LoginUnificadoProps) {
  const { tema, colores } = useTheme();
  const { c, tonos } = useKit();
  const { login: loginAdmin } = useAdminSession();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometriaOn, setBiometriaOn] = useState(false);
  const [puedeBiometria, setPuedeBiometria] = useState(false);

  useEffect(() => {
    let activo = true;
    Promise.all([biometriaDisponible(), biometriaHabilitada()])
      .then(([disponible, habilitada]) => {
        if (activo) {
          setPuedeBiometria(disponible);
          setBiometriaOn(habilitada);
        }
      })
      .catch(() => undefined);
    return () => {
      activo = false;
    };
  }, []);

  const entrar = async () => {
    if (!usuario.trim() || !password) {
      setError("Escribe tu usuario y contraseña.");
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const { sesion, me } = await loginAdmin(usuario.trim(), password);
      if (me.tenantCount === 0) {
        await onFlujoLegado(usuario.trim(), password);
        return;
      }
      if (me.tenantCount === 1 && me.tenant) {
        try {
          const campo = await apiGestorToken(sesion.token, me.tenant.id);
          await onAutenticado(campo);
        } catch (err) {
          // 403 del exchange = negocio sin acceso de campo (ADR-0094):
          // el usuario opera el panel con su sesión admin.
          if (err instanceof ApiAuthError && err.status === 403) {
            onEntrarPanel();
            return;
          }
          throw err;
        }
        return;
      }
      alSeleccionarNegocios();
    } catch (err) {
      if (err instanceof ApiAuthError && err.status === 401) {
        setError("Correo o contraseña incorrectos.");
      } else {
        setError("Sin conexión con el servidor. Intenta de nuevo.");
      }
    } finally {
      setCargando(false);
    }
  };

  const alternarBiometria = async (valor: boolean) => {
    setBiometriaOn(valor);
    if (valor) {
      await habilitarBiometria();
    } else {
      await deshabilitarBiometria();
    }
  };

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={[styles.pantalla, { backgroundColor: colores.fondo }]}
    >
      <KeyboardAvoidingView
        style={styles.pantalla}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.contenido}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.columna}>
            <View style={styles.marca}>
              <View style={[styles.halo, { backgroundColor: tonos.accent.bg }]} />
              <Image
                testID="login-logo"
                accessibilityRole="image"
                accessibilityLabel="SolversHub"
                source={LOGO_POR_TEMA[tema]}
                resizeMode="contain"
                style={styles.logo}
              />
            </View>

            <Text style={[shType.body, styles.subtitulo, { color: colores.textoSuave }]}>
              Un solo login para todo tu negocio
            </Text>

            <View style={styles.formulario}>
              <TextField
                testID="login-usuario"
                value={usuario}
                onChangeText={setUsuario}
                placeholder="Correo o usuario"
                accessibilityLabel="Correo o usuario"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                style={styles.campo}
              />
              <PasswordField
                testID="login-password"
                value={password}
                onChangeText={setPassword}
                placeholder="Contraseña"
                accessibilityLabel="Contraseña"
                returnKeyType="go"
                onSubmitEditing={() => void entrar()}
                style={styles.campo}
              />

              {error ? (
                <View
                  testID="login-error"
                  accessibilityRole="alert"
                  accessibilityLiveRegion="polite"
                  style={styles.error}
                >
                  <Icono name="error-outline" size={16} color={c.statusDangerFg} />
                  <Text style={[shType.caption, styles.errorTexto, { color: c.statusDangerFg }]}>
                    {error}
                  </Text>
                </View>
              ) : null}

              <Button
                testID="login-entrar"
                fullWidth
                size="lg"
                loading={cargando}
                onPress={() => void entrar()}
              >
                Entrar
              </Button>

              <Button
                testID="login-recuperar"
                variant="link"
                onPress={irARecuperarContrasena}
                style={styles.recuperar}
              >
                ¿Olvidaste tu contraseña?
              </Button>
            </View>

            {puedeBiometria ? (
              <View
                style={[styles.biometria, { backgroundColor: c.surface, borderColor: c.border }]}
              >
                <Text style={[shType.body, { color: c.text }]}>Desbloquear con biometría</Text>
                <Switch
                  testID="login-biometria"
                  value={biometriaOn}
                  onValueChange={(v) => void alternarBiometria(v)}
                  trackColor={{ false: c.border, true: c.link }}
                />
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  contenido: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: shSpace[6],
    paddingVertical: shSpace[8],
  },
  columna: { width: "100%", maxWidth: 420, alignSelf: "center", gap: shSpace[4] },
  marca: { alignItems: "center", justifyContent: "center", paddingVertical: shSpace[4] },
  halo: {
    position: "absolute",
    width: 248,
    height: 248,
    borderRadius: shRadius.pill,
  },
  logo: { width: 190, aspectRatio: 2048 / 1644 },
  subtitulo: { textAlign: "center" },
  formulario: { gap: shSpace[3] },
  campo: { borderRadius: shRadius.md },
  error: { flexDirection: "row", alignItems: "center", gap: shSpace[1] },
  errorTexto: { flexShrink: 1 },
  recuperar: { alignSelf: "center" },
  biometria: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 56,
    paddingHorizontal: shSpace[4],
    borderRadius: shRadius.md,
    borderWidth: 1,
  },
});
