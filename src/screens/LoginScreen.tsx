import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiErrorStatus } from "../api/client";
import type { RolLogin } from "../api/auth";
import { useSession } from "../session/session-context";

export function LoginScreen() {
  const { login } = useSession();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<RolLogin>("cobrador");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const puedeEnviar = usuario.trim().length > 0 && password.length > 0 && !submitting;

  async function handleSubmit() {
    if (!puedeEnviar) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await login(usuario.trim(), password, rol);
    } catch (err) {
      setError(
        apiErrorStatus(err) === 401
          ? "Usuario o contraseña incorrectos."
          : "No se pudo conectar con el servidor.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.contenedor} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.formFlex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.form}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <View style={styles.roles}>
            <Pressable
              testID="rol-cobrador"
              style={[styles.rol, rol === "cobrador" && styles.rolActivo]}
              onPress={() => setRol("cobrador")}
            >
              <Text style={rol === "cobrador" ? styles.rolTextoActivo : styles.rolTexto}>
                Cobrador
              </Text>
            </Pressable>
            <Pressable
              testID="rol-socio"
              style={[styles.rol, rol === "socio" && styles.rolActivo]}
              onPress={() => setRol("socio")}
            >
              <Text style={rol === "socio" ? styles.rolTextoActivo : styles.rolTexto}>
                Socio
              </Text>
            </Pressable>
          </View>

          <TextInput
            testID="usuario-input"
            style={styles.input}
            placeholder="Usuario"
            autoCapitalize="none"
            autoCorrect={false}
            value={usuario}
            onChangeText={setUsuario}
          />
          <TextInput
            testID="password-input"
            style={styles.input}
            placeholder="Contraseña"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleSubmit}
          />

          {error ? (
            <Text testID="error-text" style={styles.error}>
              {error}
            </Text>
          ) : null}

          <Pressable
            testID="login-button"
            style={[styles.boton, !puedeEnviar && styles.botonDeshabilitado]}
            disabled={!puedeEnviar}
            onPress={handleSubmit}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.botonTexto}>Entrar</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  logo: {
    width: 140,
    height: 140,
    alignSelf: "center",
    marginBottom: 20,
  },
  formFlex: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  form: {
    gap: 12,
  },
  roles: { flexDirection: "row", gap: 8 },
  rol: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  rolActivo: { backgroundColor: "#172f6c", borderColor: "#172f6c" },
  rolTexto: { color: "#334155", fontWeight: "600" },
  rolTextoActivo: { color: "#ffffff", fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: {
    color: "#dc2626",
    fontSize: 14,
  },
  boton: {
    backgroundColor: "#172f6c",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  botonDeshabilitado: {
    backgroundColor: "#6b8ab5",
  },
  botonTexto: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});