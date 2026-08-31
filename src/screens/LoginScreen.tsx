import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { apiErrorStatus } from "../api/client";
import { useSession } from "../session/session-context";

export function LoginScreen() {
  const { login } = useSession();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
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
      await login(usuario.trim(), password);
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
    <KeyboardAvoidingView
      style={styles.contenedor}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.form}>
        <Text style={styles.titulo}>CobraIA</Text>
        <Text style={styles.subtitulo}>App del cobrador</Text>

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
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#ffffff",
  },
  form: {
    gap: 12,
  },
  titulo: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitulo: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 16,
  },
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
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  botonDeshabilitado: {
    backgroundColor: "#93c5fd",
  },
  botonTexto: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});