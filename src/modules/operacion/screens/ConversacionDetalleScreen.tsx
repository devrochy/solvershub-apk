import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTheme } from "@core/theme/theme-context";
import { useAdminApi } from "@core/session/use-admin-api";
import {
  alternarBot,
  detalleConversacion,
  responderConversacion,
  resolverConversacion,
  type ConversationDetail,
} from "../api";
import type { OperacionStackParamList } from "../navigation";

type Props = NativeStackScreenProps<OperacionStackParamList, "ConversacionDetalle">;

export function ConversacionDetalleScreen({ route }: Props) {
  const { colores } = useTheme();
  const api = useAdminApi();
  const { id } = route.params;

  const [detalle, setDetalle] = useState<ConversationDetail | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [respuesta, setRespuesta] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setDetalle(await detalleConversacion(api, id));
      setError(null);
    } catch {
      setError("No pudimos cargar la conversación.");
    }
  }, [api, id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial: los setState ocurren después del await (no síncronos)
    void cargar().finally(() => setCargando(false));
  }, [cargar]);

  const enviar = async () => {
    const texto = respuesta.trim();
    if (!texto || enviando) {
      return;
    }
    setEnviando(true);
    try {
      await responderConversacion(api, id, texto);
      setRespuesta("");
      await cargar();
    } catch {
      setError("No se pudo enviar el mensaje.");
    } finally {
      setEnviando(false);
    }
  };

  const alternar = async () => {
    try {
      await alternarBot(api, id);
      await cargar();
    } catch {
      setError("No se pudo cambiar el estado del asistente.");
    }
  };

  const resolver = () => {
    Alert.alert(
      "Resolver conversación",
      "El asistente dejará de responder y la conversación quedará cerrada.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Resolver",
          style: "destructive",
          onPress: () => {
            void resolverConversacion(api, id)
              .then(cargar)
              .catch(() => setError("No se pudo resolver la conversación."));
          },
        },
      ],
    );
  };

  if (cargando) {
    return (
      <View style={[styles.centro, { backgroundColor: colores.fondo }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.contenedor, { backgroundColor: colores.fondo }]}>
      <View style={styles.acciones}>
        <Pressable
          testID="detalle-toggle-bot"
          onPress={() => void alternar()}
          style={[styles.botonSecundario, { borderColor: colores.borde }]}
        >
          <Text style={{ color: colores.texto, fontSize: 13 }}>
            {detalle?.bot_paused ? "Reanudar asistente" : "Pausar asistente"}
          </Text>
        </Pressable>
        <Pressable
          testID="detalle-resolver"
          onPress={resolver}
          style={[styles.botonSecundario, { borderColor: colores.peligro }]}
        >
          <Text style={{ color: colores.peligro, fontSize: 13 }}>Resolver</Text>
        </Pressable>
      </View>

      {error ? (
        <Text testID="detalle-error" style={[styles.error, { color: colores.peligro }]}>
          {error}
        </Text>
      ) : null}

      <FlatList
        testID="hilo-mensajes"
        data={detalle?.messages ?? []}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.hilo}
        renderItem={({ item }) => {
          const entrante = item.direction === "in";
          return (
            <View
              style={[
                styles.burbuja,
                {
                  alignSelf: entrante ? "flex-start" : "flex-end",
                  backgroundColor: entrante ? colores.tarjeta : colores.primario,
                  borderColor: colores.borde,
                },
              ]}
            >
              <Text
                style={{
                  color: entrante ? colores.texto : "#ffffff",
                  fontSize: 14,
                }}
              >
                {item.content}
              </Text>
              <Text
                style={{
                  color: entrante ? colores.textoSuave : "#E8EDF7",
                  fontSize: 10,
                  marginTop: 4,
                }}
              >
                {item.sender_type} · {item.status}
              </Text>
            </View>
          );
        }}
      />

      <View style={styles.responder}>
        <TextInput
          testID="detalle-respuesta"
          value={respuesta}
          onChangeText={setRespuesta}
          placeholder="Responder como humano…"
          placeholderTextColor={colores.textoSuave}
          style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]}
        />
        <Pressable
          testID="detalle-enviar"
          disabled={enviando}
          onPress={() => void enviar()}
          style={[styles.enviar, { backgroundColor: colores.primario }]}
        >
          {enviando ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.enviarTexto}>Enviar</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  contenedor: { flex: 1, padding: 12 },
  acciones: { flexDirection: "row", gap: 8, marginBottom: 8 },
  botonSecundario: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  error: { fontSize: 13, marginBottom: 6 },
  hilo: { paddingBottom: 12 },
  burbuja: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    maxWidth: "85%",
  },
  responder: { flexDirection: "row", gap: 8, alignItems: "center" },
  campo: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  enviar: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12 },
  enviarTexto: { color: "#ffffff", fontWeight: "700" },
});
