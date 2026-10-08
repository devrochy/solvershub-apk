import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "@core/theme/theme-context";
import { useAdminApi } from "@core/session/use-admin-api";
import { cargarChatWeb, guardarChatWeb, type WebChatSettings } from "../api";

/** Dominios separados por línea o coma, sin vacíos (mismo criterio que el panel). */
function aOrigenes(texto: string): string[] {
  return texto
    .split(/[\n,]/)
    .map((o) => o.trim())
    .filter(Boolean);
}

/** Chat web embebible (panel: /configuracion?tab=chat-web): widget, dominios y Turnstile. */
export function ChatWebTab() {
  const { colores } = useTheme();
  const api = useAdminApi();
  const [actual, setActual] = useState<WebChatSettings | null>(null);
  const [cargando, setCargando] = useState(true);
  const [activo, setActivo] = useState(false);
  const [origenes, setOrigenes] = useState("");
  const [turnstile, setTurnstile] = useState("");
  const [rotar, setRotar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    cargarChatWeb(api)
      .then((wc) => {
        setActual(wc);
        setActivo(wc.enabled);
        setOrigenes(wc.allowed_origins.join("\n"));
      })
      .catch(() => setError("No pudimos cargar el chat web."))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carga inicial de la pestaña
  }, []);

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    setMensaje(null);
    try {
      const wc = await guardarChatWeb(api, {
        enabled: activo,
        allowed_origins: aOrigenes(origenes),
        // undefined = no tocar el secreto guardado.
        turnstile_secret: turnstile.trim() === "" ? undefined : turnstile.trim(),
        rotate_key: rotar,
      });
      setActual(wc);
      setOrigenes(wc.allowed_origins.join("\n"));
      setTurnstile("");
      setRotar(false);
      setMensaje("Chat web guardado.");
    } catch {
      setError("No se pudo guardar el chat web.");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return <ActivityIndicator testID="chatweb-cargando" style={{ marginTop: 30 }} />;
  }
  if (!actual) {
    return (
      <Text testID="chatweb-error" style={{ color: colores.peligro, marginTop: 12 }}>
        {error ?? "Sin datos del chat web."}
      </Text>
    );
  }

  const estiloInput = [styles.input, { borderColor: colores.borde, color: colores.texto }];

  return (
    <View testID="chatweb-tab">
      <View style={styles.fila}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.titulo, { color: colores.texto }]}>Chat web embebible</Text>
          <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
            Pega un fragmento en tu sitio y tus visitantes hablan con el mismo agente.
          </Text>
        </View>
        <Switch testID="chatweb-activo" value={activo} onValueChange={setActivo} />
      </View>

      <Text style={[styles.label, { color: colores.texto }]}>Dominios permitidos</Text>
      <TextInput
        testID="chatweb-origenes"
        value={origenes}
        onChangeText={setOrigenes}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="https://tunegocio.com"
        placeholderTextColor={colores.textoSuave}
        style={[estiloInput, { minHeight: 80, textAlignVertical: "top" }]}
      />
      <Text style={[styles.ayuda, { color: colores.textoSuave }]}>
        Uno por línea, con esquema. Solo estos dominios pueden incrustar el chat.
      </Text>

      <Text style={[styles.label, { color: colores.texto }]}>Secreto de Turnstile (opcional)</Text>
      <TextInput
        testID="chatweb-turnstile"
        value={turnstile}
        onChangeText={setTurnstile}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        style={estiloInput}
      />
      <Text style={[styles.ayuda, { color: colores.textoSuave }]}>
        {actual.turnstile_configured ? "Turnstile configurado. " : ""}
        Deja vacío para no cambiarlo.
      </Text>

      <View style={styles.fila}>
        <Text style={{ flex: 1, color: colores.texto, fontSize: 13 }}>
          Rotar la clave pública (el fragmento actual deja de funcionar)
        </Text>
        <Switch testID="chatweb-rotar" value={rotar} onValueChange={setRotar} />
      </View>

      {actual.snippet ? (
        <View style={{ marginTop: 8 }}>
          <Text style={[styles.label, { color: colores.texto }]}>Fragmento para tu sitio</Text>
          <Text
            testID="chatweb-fragmento"
            selectable
            style={[styles.fragmento, { borderColor: colores.borde, color: colores.texto }]}
          >
            {actual.snippet}
          </Text>
          <Pressable
            testID="chatweb-compartir"
            onPress={() => void Share.share({ message: actual.snippet }).catch(() => undefined)}
            style={[styles.secundario, { borderColor: colores.borde }]}
          >
            <Text style={{ color: colores.texto, fontWeight: "600" }}>Compartir fragmento</Text>
          </Pressable>
        </View>
      ) : null}

      {error ? (
        <Text testID="chatweb-error" style={[styles.resultado, { color: colores.peligro }]}>
          {error}
        </Text>
      ) : null}
      {mensaje ? (
        <Text testID="chatweb-mensaje" style={[styles.resultado, { color: colores.acento }]}>
          {mensaje}
        </Text>
      ) : null}
      <Pressable
        testID="chatweb-guardar"
        disabled={guardando}
        onPress={() => void guardar()}
        style={[styles.guardar, { backgroundColor: colores.primario }]}
      >
        <Text style={{ color: "#ffffff", fontWeight: "700" }}>
          {guardando ? "Guardando…" : "Guardar chat web"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  titulo: { fontSize: 14, fontWeight: "700" },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
  ayuda: { fontSize: 12, marginTop: 4, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 13,
  },
  fragmento: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 11,
    fontFamily: "monospace",
  },
  secundario: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 8,
  },
  resultado: { textAlign: "center", marginTop: 12 },
  guardar: {
    alignSelf: "center",
    paddingHorizontal: 28,
    paddingVertical: 11,
    borderRadius: 8,
    marginTop: 8,
  },
});
