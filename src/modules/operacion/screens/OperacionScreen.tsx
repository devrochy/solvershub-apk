import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { usePestanasDeEntrada, type EntradaPestanas, type SolicitudPestana } from "@shared/pestana-inicial";
import { useTheme } from "@core/theme/theme-context";
import { useAdminApi } from "@core/session/use-admin-api";
import {
  cargarPlayground,
  enviarMensajePlayground,
  listarLeads,
  reiniciarPlayground,
  type LeadRow,
  type TurnoPlayground,
} from "../api";
import { PestanaConversaciones } from "../components/PestanaConversaciones";
import { PestanaEscalaciones } from "../components/PestanaEscalaciones";
import { nombreDelChat } from "../presentacion";
import type { OperacionStackParamList } from "../navigation";

type Nav = NativeStackNavigationProp<OperacionStackParamList>;
type Pestana = "conversaciones" | "escalaciones" | "leads" | "playground";
const PESTANAS: readonly Pestana[] = ["conversaciones", "escalaciones", "leads", "playground"];

function Vacio({ texto }: { texto: string }) {
  const { colores } = useTheme();
  return <Text style={[styles.vacio, { color: colores.textoSuave }]}>{texto}</Text>;
}

export function OperacionScreen({
  pestanaInicial,
  entrada,
}: { pestanaInicial?: SolicitudPestana; entrada?: EntradaPestanas } = {}) {
  const { colores } = useTheme();
  const api = useAdminApi();
  const navigation = useNavigation<Nav>();

  // Solo las pestañas de la entrada del cajón (Conversaciones, Clientes, Agentes).
  const { pestana, setPestana, propias } = usePestanasDeEntrada<Pestana>(
    "conversaciones",
    "conversaciones",
    PESTANAS,
    pestanaInicial,
    entrada,
  );
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Clientes y playground
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [busquedaLeads, setBusquedaLeads] = useState("");
  const [turnos, setTurnos] = useState<TurnoPlayground[]>([]);
  const [mensajePlay, setMensajePlay] = useState("");

  useEffect(() => {
    if (pestana === "leads") {
      listarLeads(api, busquedaLeads || undefined)
        .then((p) => setLeads(p.items))
        .catch(() => setError("No pudimos cargar los clientes."))
        .finally(() => setCargando(false));
    }
     
  }, [pestana, busquedaLeads, api]);

  const abrirConversacion = (id: string, titulo: string) =>
    navigation.navigate("ConversacionDetalle", { id, titulo });

  const cambiarPestana = (destino: Pestana) => {
    setCargando(true);
    setError(null);
    setPestana(destino);
  };

  const recargarPlayground = useCallback(async () => {
    try {
      setTurnos(await cargarPlayground(api));
      setError(null);
    } catch {
      setError("No pudimos cargar el playground.");
    }
  }, [api]);

  useEffect(() => {
    if (pestana === "playground") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- el setState ocurre tras el await de recargarPlayground
      void recargarPlayground().finally(() => setCargando(false));
    }
     
  }, [pestana, recargarPlayground]);

  return (
    <View style={[styles.contenedor, { backgroundColor: colores.fondo }]}>
      {propias.length > 1 ? (
        <View style={[styles.pestanas, { borderColor: colores.borde }]}>
          {propias.map((p) => (
            <Pressable
              key={p}
              testID={`pestana-${p}`}
              onPress={() => cambiarPestana(p)}
              style={[
                styles.pestana,
                pestana === p && { borderBottomColor: colores.acento, borderBottomWidth: 2 },
              ]}
            >
              <Text
                style={[
                  styles.pestanaTexto,
                  { color: pestana === p ? colores.texto : colores.textoSuave },
                ]}
              >
                {p === "conversaciones"
                  ? "Conversaciones"
                  : p === "escalaciones"
                    ? "Escalaciones"
                    : p === "leads"
                      ? "Clientes"
                      : "Playground"}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {pestana === "leads" ? (
        <TextInput
          testID="operacion-busqueda-leads"
          value={busquedaLeads}
          onChangeText={setBusquedaLeads}
          placeholder="Buscar cliente"
          placeholderTextColor={colores.textoSuave}
          style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]}
        />
      ) : null}

      {pestana === "playground" ? (
        <View style={{ marginBottom: 8 }}>
          <Pressable
            testID="playground-reset"
            onPress={() => {
              void reiniciarPlayground(api)
                .then(() => setTurnos([]))
                .catch(() => setError("No se pudo reiniciar el playground."));
            }}
            style={[styles.chip, { borderColor: colores.borde, alignSelf: "flex-start" }]}
          >
            <Text style={{ color: colores.textoSuave, fontSize: 12 }}>Reiniciar demo</Text>
          </Pressable>
        </View>
      ) : null}

      {pestana !== "conversaciones" && error ? (
        <Text testID="operacion-error" style={[styles.error, { color: colores.peligro }]}>
          {error}
        </Text>
      ) : null}

      {pestana === "conversaciones" ? (
        <PestanaConversaciones
          onAbrir={(chat) => abrirConversacion(chat.id, nombreDelChat(chat))}
        />
      ) : pestana === "escalaciones" ? (
        <PestanaEscalaciones
          onAbrirConversacion={abrirConversacion}
          onVerConversaciones={() => cambiarPestana("conversaciones")}
        />
      ) : cargando ? (
        <ActivityIndicator size="large" style={styles.cargando} />
      ) : pestana === "leads" ? (
        <FlatList
          testID="lista-leads"
          data={leads}
          keyExtractor={(l) => l.id}
          ListEmptyComponent={<Vacio texto="Sin clientes registrados." />}
          renderItem={({ item }) => {
            const clasificacion = item.extras?.clasificacion;
            return (
              <Pressable
                testID={`lead-${item.id}`}
                accessibilityRole="button"
                onPress={() => navigation.navigate("ClienteDetalle", { id: item.id, titulo: item.cliente })}
                style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
              >
                <View style={styles.filaTexto}>
                  <Text style={[styles.filaTitulo, { color: colores.texto }]} numberOfLines={1}>
                    {item.cliente}
                  </Text>
                  <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                    {item.canal} · {item.telefono ?? item.alta}
                    {typeof clasificacion === "string" ? ` · ${clasificacion}` : ""}
                  </Text>
                </View>
                {item.bot_paused && (
                  <Text style={{ color: colores.peligro, fontSize: 12 }}>Agente pausado</Text>
                )}
              </Pressable>
            );
          }}
        />
      ) : (
        <>
          <FlatList
            testID="lista-playground"
            data={turnos}
            keyExtractor={(_, i) => `turno-${i}`}
            ListEmptyComponent={<Vacio texto="Conversación de demostración. Escribe abajo para probar el asistente." />}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.fila,
                  {
                    borderColor: item.escalated ? colores.peligro : colores.borde,
                    backgroundColor: colores.tarjeta,
                  },
                ]}
              >
                <Text style={{ color: colores.texto }}>{item.text}</Text>
              </View>
            )}
          />
          <TextInput
            testID="playground-campo"
            value={mensajePlay}
            onChangeText={setMensajePlay}
            placeholder="Escribe un mensaje de prueba…"
            placeholderTextColor={colores.textoSuave}
            onSubmitEditing={() => {
              if (!mensajePlay.trim()) {
                return;
              }
              void enviarMensajePlayground(api, mensajePlay.trim())
                .then(() => {
                  setMensajePlay("");
                  return recargarPlayground();
                })
                .catch(() => setError("No se pudo enviar el mensaje."));
            }}
            style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, padding: 12 },
  pestanas: { flexDirection: "row", borderBottomWidth: 1, marginBottom: 10 },
  pestana: { flex: 1, paddingVertical: 10, alignItems: "center" },
  pestanaTexto: { fontSize: 14, fontWeight: "600" },
  campo: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 8,
  },
  chips: { flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  cargando: { marginTop: 30 },
  vacio: { textAlign: "center", marginTop: 24, fontSize: 14 },
  error: { fontSize: 13, marginBottom: 8 },
  fila: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  filaTexto: { flex: 1, marginRight: 8 },
  filaTitulo: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
});
