import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "@core/theme/theme-context";
import { PasswordField, useKit } from "@shared/ui";
import type { LoginResult } from "@shared/types/auth";
import { useAdminSession } from "@core/session/admin-session-context";
import { ApiAuthError, apiGestorToken } from "@core/api/auth-admin";
import { biometriaDisponible, biometriaHabilitada, deshabilitarBiometria, habilitarBiometria } from "../biometria";

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
  const { colores } = useTheme();
  const { relleno } = useKit();
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
    <View style={[styles.contenedor, { backgroundColor: colores.fondo }]}>
      <Text style={[styles.titulo, { color: colores.texto }]}>SolversHub</Text>
      <Text style={[styles.subtitulo, { color: colores.textoSuave }]}>
        Un solo login para todo tu negocio
      </Text>

      <TextInput
        testID="login-usuario"
        value={usuario}
        onChangeText={setUsuario}
        placeholder="Correo o usuario"
        placeholderTextColor={colores.textoSuave}
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]}
      />
      <PasswordField
        testID="login-password"
        value={password}
        onChangeText={setPassword}
        placeholder="Contraseña"
        style={[styles.campo, { borderColor: colores.borde, color: colores.texto, backgroundColor: "transparent" }]}
      />

      {error ? (
        <Text testID="login-error" style={[styles.error, { color: colores.peligro }]}>
          {error}
        </Text>
      ) : null}

      <Pressable
        testID="login-entrar"
        disabled={cargando}
        onPress={() => void entrar()}
        style={({ pressed }) => [
          styles.boton,
          { backgroundColor: relleno.primario },
          pressed && styles.presionado,
        ]}
      >
        {cargando ? (
          <ActivityIndicator color={relleno.sobrePrimario} />
        ) : (
          <Text style={[styles.botonTexto, { color: relleno.sobrePrimario }]}>Entrar</Text>
        )}
      </Pressable>

      <Pressable testID="login-recuperar" onPress={irARecuperarContrasena}>
        <Text style={[styles.recuperar, { color: colores.acento }]}>
          ¿Olvidaste tu contraseña?
        </Text>
      </Pressable>

      {puedeBiometria ? (
        <View style={styles.biometria}>
          <Text style={{ color: colores.texto }}>Desbloquear con biometría</Text>
          <Switch
            testID="login-biometria"
            value={biometriaOn}
            onValueChange={(v) => void alternarBiometria(v)}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, justifyContent: "center", padding: 28, gap: 14 },
  titulo: { fontSize: 30, fontWeight: "700", textAlign: "center" },
  subtitulo: { fontSize: 14, textAlign: "center", marginBottom: 18 },
  campo: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: { fontSize: 13 },
  boton: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  botonTexto: { fontWeight: "700", fontSize: 16 },
  presionado: { opacity: 0.85 },
  recuperar: { textAlign: "center", fontSize: 14 },
  biometria: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
});
