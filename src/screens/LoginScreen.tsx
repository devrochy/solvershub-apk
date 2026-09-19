import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { apiErrorStatus } from "../api/client";
import type { RolLogin } from "../api/auth";
import { useSession } from "../session/session-context";

export function LoginScreen() {
  const { login } = useSession();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<RolLogin>("gestor");
  const [mostrarPassword, setMostrarPassword] = useState(false);
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
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.form}>
            <Image
              testID="login-logo"
              source={require("../../assets/logo-transparente.png")}
              style={styles.logo}
              resizeMode="contain"
            />

            <View style={styles.roles}>
              <Pressable
                testID="rol-gestor"
                style={[styles.rol, rol === "gestor" && styles.rolActivo]}
                onPress={() => setRol("gestor")}
              >
                <Text style={rol === "gestor" ? styles.rolTextoActivo : styles.rolTexto}>
                  Gestor
                </Text>
              </Pressable>
              <Pressable
                testID="rol-propietario"
                style={[styles.rol, rol === "propietario" && styles.rolActivo]}
                onPress={() => setRol("propietario")}
              >
                <Text style={rol === "propietario" ? styles.rolTextoActivo : styles.rolTexto}>
                  Propietario
                </Text>
              </Pressable>
            </View>

            <TextInput
              testID="usuario-input"
              style={styles.input}
              placeholder="Usuario"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
              value={usuario}
              onChangeText={setUsuario}
            />
            <View style={styles.passwordWrap}>
              <TextInput
                testID="password-input"
                style={styles.passwordInput}
                placeholder="Contraseña"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!mostrarPassword}
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={handleSubmit}
              />
              <Pressable
                testID="password-toggle"
                accessibilityRole="button"
                accessibilityLabel={
                  mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                hitSlop={8}
                onPress={() => setMostrarPassword((valor) => !valor)}
              >
                <MaterialIcons
                  name={mostrarPassword ? "visibility-off" : "visibility"}
                  size={22}
                  color="#64748b"
                />
              </Pressable>
            </View>

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
                <ActivityIndicator color="#172f6c" />
              ) : (
                <Text style={styles.botonTexto}>Entrar</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: "#172f6c",
  },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  form: {
    gap: 12,
  },
  logo: {
    width: "70%",
    aspectRatio: 1,
    alignSelf: "center",
    marginBottom: 16,
  },
  roles: { flexDirection: "row", gap: 8 },
  rol: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  rolActivo: { backgroundColor: "#ffffff", borderColor: "#ffffff" },
  rolTexto: { color: "#ffffff", fontWeight: "600" },
  rolTextoActivo: { color: "#172f6c", fontWeight: "600" },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#334155",
  },
  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderRadius: 8,
    paddingRight: 10,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#334155",
  },
  error: {
    color: "#fecaca",
    fontSize: 14,
  },
  boton: {
    backgroundColor: "#f7f4ec",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  botonDeshabilitado: {
    backgroundColor: "rgba(247, 244, 236, 0.45)",
  },
  botonTexto: {
    color: "#172f6c",
    fontSize: 16,
    fontWeight: "700",
  },
});
