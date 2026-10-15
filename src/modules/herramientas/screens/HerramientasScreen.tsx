import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { usePestanaInicial, type SolicitudPestana } from "@shared/pestana-inicial";
import { useTheme } from "@core/theme/theme-context";
import { useAdminSession } from "@core/session/admin-session-context";
import { useAdminApi } from "@core/session/use-admin-api";
import { baseActual } from "@data/bootstrap";
import { registrarAccionCritica } from "@data/auditoria-sync";
import {
  accionNegocio,
  cargarDlq,
  cargarNegocios,
  reintentarDlq,
  type DlqEntry,
  type PlatformTenant,
} from "../api";

type Pestana = "fallos" | "negocios";

export function HerramientasScreen({ pestanaInicial }: { pestanaInicial?: SolicitudPestana } = {}) {
  const { colores } = useTheme();
  const api = useAdminApi();
  const { sesion } = useAdminSession();
  const esMaster = sesion?.role === "master";

  const [pestana, setPestana] = usePestanaInicial<Pestana>(
    "fallos",
    esMaster ? ["fallos", "negocios"] : ["fallos"],
    pestanaInicial,
  );
  const [entradas, setEntradas] = useState<DlqEntry[]>([]);
  const [negocios, setNegocios] = useState<PlatformTenant[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const dlq = await cargarDlq(api);
      setError(null);
      setEntradas(dlq.entries);
      if (esMaster) {
        const pagina = await cargarNegocios(api).catch(() => null);
        setNegocios(pagina?.items ?? []);
      }
    } catch {
      setError("No pudimos cargar las herramientas. Revisa tu conexión.");
    }
  }, [api, esMaster]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial: los setState ocurren después del await (no síncronos)
    void cargar().finally(() => setCargando(false));
  }, [cargar]);

  const reintentar = (entrada: DlqEntry) => {
    void reintentarDlq(api, entrada.entry_id)
      .then(cargar)
      .catch(() => setError("No se pudo reintentar el evento."));
  };

  const confirmarAccionNegocio = (t: PlatformTenant) => {
    const suspender = t.status === "active";
    Alert.alert(
      `${suspender ? "Suspender" : "Activar"} negocio`,
      `${t.name} ${suspender ? "dejará de operar hasta que lo reactives." : "volverá a operar."}`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: suspender ? "Suspender" : "Activar",
          style: suspender ? "destructive" : "default",
          onPress: () => {
            const db = baseActual();
            if (db) {
              void registrarAccionCritica(db, {
                accion: suspender ? "suspender_negocio" : "activar_negocio",
                entidad: "tenant",
                entidadId: t.id,
                payload: { slug: t.slug },
              }).catch(() => undefined);
            }
            void accionNegocio(api, t.id, suspender ? "deactivate" : "activate")
              .then(cargar)
              .catch(() => setError("No se pudo cambiar el negocio."));
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.contenedor, { backgroundColor: colores.fondo }]}>
      <View style={[styles.pestanas, { borderColor: colores.borde }]}>
        {(esMaster ? (["fallos", "negocios"] as Pestana[]) : (["fallos"] as Pestana[])).map((p) => (
          <Pressable
            key={p}
            testID={`herramientas-${p}`}
            onPress={() => setPestana(p)}
            style={[
              styles.pestana,
              pestana === p && { borderBottomColor: colores.acento, borderBottomWidth: 2 },
            ]}
          >
            <Text
              style={{
                color: pestana === p ? colores.texto : colores.textoSuave,
                fontWeight: "600",
              }}
            >
              {p === "fallos" ? "Bandeja de fallos" : "Negocios"}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <Text testID="herramientas-error" style={{ color: colores.peligro, marginBottom: 8 }}>
          {error}
        </Text>
      ) : null}

      {cargando ? (
        <ActivityIndicator size="large" style={{ marginTop: 30 }} />
      ) : pestana === "fallos" ? (
        <FlatList
          testID="herramientas-lista-dlq"
          data={entradas}
          keyExtractor={(e) => e.entry_id}
          ListEmptyComponent={
            <Text style={{ color: colores.textoSuave, textAlign: "center", marginTop: 20 }}>
              Sin eventos fallidos. 🎉
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              testID={`dlq-${item.entry_id}`}
              onPress={() => reintentar(item)}
              style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: colores.texto, fontSize: 13 }} numberOfLines={2}>
                  {item.content}
                </Text>
                <Text style={{ color: colores.textoSuave, fontSize: 11 }}>
                  {item.external_message_id ?? item.entry_id}
                </Text>
              </View>
              <Text style={{ color: colores.acento, fontSize: 12 }}>Reintentar</Text>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          testID="herramientas-lista-negocios"
          data={negocios}
          keyExtractor={(t) => t.id}
          ListEmptyComponent={
            <Text style={{ color: colores.textoSuave, textAlign: "center", marginTop: 20 }}>
              Sin negocios.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              testID={`negocio-plataforma-${item.slug}`}
              onPress={() => confirmarAccionNegocio(item)}
              style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: colores.texto, fontWeight: "600" }}>{item.name}</Text>
                <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                  {item.slug} · plan {item.plan_name} ({item.plan_status})
                </Text>
              </View>
              <Text
                style={{
                  color: item.status === "active" ? colores.acento : colores.peligro,
                  fontSize: 12,
                }}
              >
                {item.status}
              </Text>
            </Pressable>
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
  fila: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
});
