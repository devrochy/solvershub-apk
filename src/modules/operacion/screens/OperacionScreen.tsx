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
import { useTheme } from "@core/theme/theme-context";
import { useAdminApi } from "@core/session/use-admin-api";
import {
  listarConversaciones,
  listarEscalaciones,
  listarLeads,
  type ConversationSummary,
  type EscalationItem,
  type LeadRow,
} from "../api";
import type { OperacionStackParamList } from "../navigation";

type Nav = NativeStackNavigationProp<OperacionStackParamList>;
type Pestana = "conversaciones" | "escalaciones" | "leads";

const ESTADOS_CONVERSACION = [
  { clave: undefined, label: "Todas" },
  { clave: "open", label: "Abiertas" },
  { clave: "escalated", label: "Escaladas" },
  { clave: "closed", label: "Cerradas" },
] as const;

function Vacio({ texto }: { texto: string }) {
  const { colores } = useTheme();
  return <Text style={[styles.vacio, { color: colores.textoSuave }]}>{texto}</Text>;
}

export function OperacionScreen() {
  const { colores } = useTheme();
  const api = useAdminApi();
  const navigation = useNavigation<Nav>();

  const [pestana, setPestana] = useState<Pestana>("conversaciones");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Conversaciones
  const [conversaciones, setConversaciones] = useState<ConversationSummary[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState<string | undefined>(undefined);
  const [hayMas, setHayMas] = useState(false);
  const [pagina, setPagina] = useState(1);

  // Escalaciones y leads
  const [escalaciones, setEscalaciones] = useState<EscalationItem[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [busquedaLeads, setBusquedaLeads] = useState("");

  const cargarConversaciones = useCallback(
    async (texto: string, estadoFiltro: string | undefined, paginaPedida: number) => {
      try {
        const pagina = await listarConversaciones(api, {
          q: texto || undefined,
          status: estadoFiltro,
          page: paginaPedida,
        });
        setError(null);
        setConversaciones((previas) =>
          paginaPedida === 1 ? pagina.items : [...previas, ...pagina.items],
        );
        setHayMas(pagina.has_more);
        setPagina(pagina.page);
      } catch {
        setError("No pudimos cargar la operación. Revisa tu conexión.");
      }
    },
    [api],
  );

  useEffect(() => {
    if (pestana !== "conversaciones") {
      return;
    }
    const temporizador = setTimeout(() => {
      void cargarConversaciones(busqueda, estado, 1).finally(() => setCargando(false));
    }, busqueda ? 350 : 0);
    return () => clearTimeout(temporizador);
  }, [pestana, busqueda, estado, cargarConversaciones]);

  useEffect(() => {
    if (pestana === "escalaciones") {
      listarEscalaciones(api)
        .then((p) => setEscalaciones(p.items))
        .catch(() => setError("No pudimos cargar las escalaciones."))
        .finally(() => setCargando(false));
    }
    if (pestana === "leads") {
      listarLeads(api, busquedaLeads || undefined)
        .then((p) => setLeads(p.items))
        .catch(() => setError("No pudimos cargar los clientes."))
        .finally(() => setCargando(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al cambiar de pestaña o búsqueda de leads
  }, [pestana, busquedaLeads, api]);

  const abrirConversacion = (id: string, titulo: string) =>
    navigation.navigate("ConversacionDetalle", { id, titulo });

  const colorEstado = (estadoConversacion: string) =>
    estadoConversacion === "escalated"
      ? colores.peligro
      : estadoConversacion === "open"
        ? colores.acento
        : colores.textoSuave;

  return (
    <View style={[styles.contenedor, { backgroundColor: colores.fondo }]}>
      <View style={[styles.pestanas, { borderColor: colores.borde }]}>
        {(["conversaciones", "escalaciones", "leads"] as Pestana[]).map((p) => (
          <Pressable
            key={p}
            testID={`pestana-${p}`}
            onPress={() => setPestana(p)}
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
              {p === "conversaciones" ? "Conversaciones" : p === "escalaciones" ? "Escalaciones" : "Clientes"}
            </Text>
          </Pressable>
        ))}
      </View>

      {pestana === "conversaciones" ? (
        <>
          <TextInput
            testID="operacion-busqueda"
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar por nombre o teléfono"
            placeholderTextColor={colores.textoSuave}
            style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]}
          />
          <View style={styles.chips}>
            {ESTADOS_CONVERSACION.map((e) => (
              <Pressable
                key={e.label}
                onPress={() => setEstado(e.clave)}
                style={[
                  styles.chip,
                  {
                    borderColor: estado === e.clave ? colores.acento : colores.borde,
                  },
                ]}
              >
                <Text
                  style={{
                    color: estado === e.clave ? colores.acento : colores.textoSuave,
                    fontSize: 12,
                  }}
                >
                  {e.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
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

      {error ? (
        <Text testID="operacion-error" style={[styles.error, { color: colores.peligro }]}>
          {error}
        </Text>
      ) : null}

      {cargando ? (
        <ActivityIndicator size="large" style={styles.cargando} />
      ) : pestana === "conversaciones" ? (
        <FlatList
          testID="lista-conversaciones"
          data={conversaciones}
          keyExtractor={(c) => c.id}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hayMas) {
              void cargarConversaciones(busqueda, estado, pagina + 1);
            }
          }}
          ListEmptyComponent={<Vacio texto="Sin conversaciones por ahora." />}
          renderItem={({ item }) => (
            <Pressable
              testID={`conversacion-${item.id}`}
              onPress={() =>
                abrirConversacion(item.id, item.customer_name ?? item.external_id ?? "Conversación")
              }
              style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
            >
              <View style={styles.filaTexto}>
                <Text style={[styles.filaTitulo, { color: colores.texto }]} numberOfLines={1}>
                  {item.customer_name ?? item.external_id ?? "Cliente"}
                </Text>
                <Text style={{ color: colorEstado(item.status), fontSize: 12 }}>
                  {item.status}
                  {item.bot_paused ? " · bot pausado" : ""}
                </Text>
              </View>
              <Text style={{ color: colores.textoSuave, fontSize: 12 }}>›</Text>
            </Pressable>
          )}
        />
      ) : pestana === "escalaciones" ? (
        <FlatList
          testID="lista-escalaciones"
          data={escalaciones}
          keyExtractor={(e) => `${e.conversation_id}-${e.created_at}`}
          ListEmptyComponent={<Vacio texto="Sin escalaciones pendientes. 🎉" />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                abrirConversacion(
                  item.conversation_id,
                  item.customer_name ?? item.external_id ?? "Conversación",
                )
              }
              style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
            >
              <View style={styles.filaTexto}>
                <Text style={[styles.filaTitulo, { color: colores.texto }]} numberOfLines={1}>
                  {item.customer_name ?? item.external_id ?? "Cliente"}
                </Text>
                <Text style={{ color: colores.textoSuave, fontSize: 12 }} numberOfLines={1}>
                  {item.reason}
                </Text>
              </View>
              <Text style={{ color: colores.peligro, fontSize: 12 }}>{item.status}</Text>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          testID="lista-leads"
          data={leads}
          keyExtractor={(l) => l.id}
          ListEmptyComponent={<Vacio texto="Sin clientes registrados." />}
          renderItem={({ item }) => (
            <View style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
              <View style={styles.filaTexto}>
                <Text style={[styles.filaTitulo, { color: colores.texto }]} numberOfLines={1}>
                  {item.cliente}
                </Text>
                <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                  {item.canal} · {item.alta}
                </Text>
              </View>
            </View>
          )}
        />
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
