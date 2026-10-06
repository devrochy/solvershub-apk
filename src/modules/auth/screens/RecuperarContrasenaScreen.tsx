import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "@core/theme/theme-context";
import { ApiAuthError, apiOlvidarContrasena, apiRestablecerContrasena } from "@core/api/auth-admin";

export interface RecuperarContrasenaProps {
  volverAlLogin(): void;
}

export function RecuperarContrasenaScreen({ volverAlLogin }: RecuperarContrasenaProps) {
  const { colores } = useTheme();
  const [paso, setPaso] = useState<"solicitar" | "aplicar" | "hecho">("solicitar");
  const [identifier, setIdentifier] = useState("");
  const [codigo, setCodigo] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const solicitar = async () => {
    if (!identifier.trim()) {
      setError("Escribe tu correo o usuario.");
      return;
    }
    setCargando(true);
    setError(null);
    try {
      await apiOlvidarContrasena(identifier.trim());
      setPaso("aplicar");
    } catch {
      setError("Sin conexión con el servidor. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  const aplicar = async () => {
    if (!codigo.trim() || nueva.length < 8) {
      setError("Escribe el código y una contraseña de al menos 8 caracteres.");
      return;
    }
    if (nueva !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setCargando(true);
    setError(null);
    try {
      await apiRestablecerContrasena(codigo.trim(), nueva);
      setPaso("hecho");
    } catch (err) {
      if (err instanceof ApiAuthError && err.status === 400) {
        setError("Código inválido o vencido.");
      } else {
        setError("Sin conexión con el servidor. Intenta de nuevo.");
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={[styles.contenedor, { backgroundColor: colores.fondo }]}>
      <Text style={[styles.titulo, { color: colores.texto }]}>Recuperar contraseña</Text>

      {paso === "solicitar" ? (
        <>
          <Text style={[styles.explicacion, { color: colores.textoSuave }]}>
            Te enviaremos un código de un solo uso a tu correo.
          </Text>
          <TextInput
            testID="recuperar-identifier"
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="Correo o usuario"
            placeholderTextColor={colores.textoSuave}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]}
          />
          <BotonPrincipal cargando={cargando} testID="recuperar-solicitar" onPress={solicitar} texto="Enviar código" />
        </>
      ) : paso === "aplicar" ? (
        <>
          <Text style={[styles.explicacion, { color: colores.textoSuave }]}>
            Escribe el código recibido y tu nueva contraseña.
          </Text>
          <TextInput
            testID="recuperar-codigo"
            value={codigo}
            onChangeText={(t) => setCodigo(t.toUpperCase())}
            placeholder="Código"
            placeholderTextColor={colores.textoSuave}
            autoCapitalize="characters"
            autoCorrect={false}
            style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]}
          />
          <TextInput
            testID="recuperar-nueva"
            value={nueva}
            onChangeText={setNueva}
            placeholder="Nueva contraseña"
            placeholderTextColor={colores.textoSuave}
            secureTextEntry
            style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]}
          />
          <TextInput
            testID="recuperar-confirmacion"
            value={confirmacion}
            onChangeText={setConfirmacion}
            placeholder="Repite la contraseña"
            placeholderTextColor={colores.textoSuave}
            secureTextEntry
            style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]}
          />
          <BotonPrincipal cargando={cargando} testID="recuperar-aplicar" onPress={aplicar} texto="Restablecer" />
        </>
      ) : (
        <>
          <Text style={[styles.exito, { color: colores.acento }]}>
            Contraseña restablecida. Ya puedes iniciar sesión.
          </Text>
          <BotonPrincipal cargando={false} testID="recuperar-volver" onPress={volverAlLogin} texto="Ir al login" />
        </>
      )}

      {error ? (
        <Text testID="recuperar-error" style={[styles.error, { color: colores.peligro }]}>
          {error}
        </Text>
      ) : null}

      {paso !== "hecho" ? (
        <Pressable testID="recuperar-cancelar" onPress={volverAlLogin}>
          <Text style={[styles.volver, { color: colores.acento }]}>Volver al login</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function BotonPrincipal({
  texto,
  onPress,
  cargando,
  testID,
}: {
  texto: string;
  onPress(): void;
  cargando: boolean;
  testID: string;
}) {
  const { colores } = useTheme();
  return (
    <Pressable
      testID={testID}
      disabled={cargando}
      onPress={onPress}
      style={({ pressed }) => [styles.boton, { backgroundColor: colores.primario }, pressed && styles.presionado]}
    >
      {cargando ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.botonTexto}>{texto}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, justifyContent: "center", padding: 28, gap: 14 },
  titulo: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  explicacion: { fontSize: 14, textAlign: "center" },
  campo: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: { fontSize: 13 },
  exito: { fontSize: 15, textAlign: "center", fontWeight: "600" },
  boton: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  botonTexto: { color: "#ffffff", fontWeight: "700", fontSize: 16 },
  presionado: { opacity: 0.85 },
  volver: { textAlign: "center", fontSize: 14 },
});
