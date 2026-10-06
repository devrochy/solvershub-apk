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
import type { LoginResult } from "@shared/types/auth";
import { useAdminSession } from "../admin-session-context";
import { ApiAuthError, apiGestorToken } from "../api";
import { biometriaDisponible, biometriaHabilitada, deshabilitarBiometria, habilitarBiometria } from "../biometria";

export interface LoginUnificadoProps {
  /** Sesión de campo lista (exchange OK): el compositor la aplica. */
  onAutenticado(result: LoginResult): Promise<void>;
  /** Cero o varios negocios: se delega al flujo legado (invitaciones/selector). */
  onFlujoLegado(usuario: string, password: string): Promise<void>;
  irARecuperarContrasena(): void;
}

export function LoginUnificadoScreen({
  onAutenticado,
  onFlujoLegado,
  irARecuperarContrasena,
}: LoginUnificadoProps) {
  const { colores } = useTheme();
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
      if (me.tenantCount === 1 && me.tenant) {
        const campo = await apiGestorToken(sesion.token, me.tenant.id);
        await onAutenticado(campo);
      } else {
        await onFlujoLegado(usuario.trim(), password);
      }
    } catch (err) {
      if (err instanceof ApiAuthError && err.status === 401) {
        setError("Correo o contraseña incorrectos.");
      } else if (err instanceof ApiAuthError && err.status === 403) {
        setError("Tu cuenta no tiene acceso de campo en este negocio.");
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
      <TextInput
        testID="login-password"
        value={password}
        onChangeText={setPassword}
        placeholder="Contraseña"
        placeholderTextColor={colores.textoSuave}
        secureTextEntry
        style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]}
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
          { backgroundColor: colores.primario },
          pressed && styles.presionado,
        ]}
      >
        {cargando ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.botonTexto}>Entrar</Text>
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
  botonTexto: { color: "#ffffff", fontWeight: "700", fontSize: 16 },
  presionado: { opacity: 0.85 },
  recuperar: { textAlign: "center", fontSize: 14 },
  biometria: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
});
