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
import { useTheme } from "@core/theme/theme-context";
import { useAdminApi } from "@core/session/use-admin-api";
import {
  accionHabilidad,
  alternarColaborador,
  cargarColaboradores,
  cargarConexiones,
  cargarHabilidades,
  type CollaboratorItem,
  type ConnectionItem,
  type PluginSummary,
} from "../api";

type Pestana = "colaboradores" | "habilidades" | "conexiones";

export function ConfiguracionScreen() {
  const { colores } = useTheme();
  const api = useAdminApi();
  const [pestana, setPestana] = useState<Pestana>("colaboradores");
  const [colaboradores, setColaboradores] = useState<CollaboratorItem[]>([]);
  const [habilidades, setHabilidades] = useState<PluginSummary[]>([]);
  const [conexiones, setConexiones] = useState<ConnectionItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [c, h, cx] = await Promise.all([
        cargarColaboradores(api),
        cargarHabilidades(api),
        cargarConexiones(api),
      ]);
      setError(null);
      setColaboradores(c);
      setHabilidades(h);
      setConexiones(cx.items);
    } catch {
      setError("No pudimos cargar la configuración. Revisa tu conexión.");
    }
  }, [api]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial: los setState ocurren después del await (no síncronos)
    void cargar().finally(() => setCargando(false));
  }, [cargar]);

  const confirmarToggleColaborador = (c: CollaboratorItem) => {
    const accion = c.active ? "desactivar" : "activar";
    Alert.alert(
      `${accion === "desactivar" ? "Desactivar" : "Activar"} cuenta`,
      `${c.email} ${accion === "desactivar" ? "no podrá iniciar sesión." : "podrá volver a entrar."}`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: accion,
          style: c.active ? "destructive" : "default",
          onPress: () => {
            void alternarColaborador(api, c.id)
              .then(cargar)
              .catch(() => setError("No se pudo cambiar la cuenta."));
          },
        },
      ],
    );
  };

  const toggleHabilidad = (h: PluginSummary) => {
    const accion = h.enabled_for_tenant ? "deactivate" : "activate";
    Alert.alert(
      `${h.enabled_for_tenant ? "Desactivar" : "Activar"} ${h.display_name ?? h.name}`,
      h.enabled_for_tenant
        ? "El asistente dejará de usar esta habilidad en tu negocio."
        : "El asistente podrá volver a usar esta habilidad.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: () => {
            void accionHabilidad(api, h.id, accion)
              .then(cargar)
              .catch(() => setError("No se pudo cambiar la habilidad."));
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.contenedor, { backgroundColor: colores.fondo }]}>
      <View style={[styles.pestanas, { borderColor: colores.borde }]}>
        {(["colaboradores", "habilidades", "conexiones"] as Pestana[]).map((p) => (
          <Pressable
            key={p}
            testID={`config-${p}`}
            onPress={() => setPestana(p)}
            style={[
              styles.pestana,
              pestana === p && { borderBottomColor: colores.acento, borderBottomWidth: 2 },
            ]}
          >
            <Text
              style={{
                color: pestana === p ? colores.texto : colores.textoSuave,
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              {p === "colaboradores" ? "Colaboradores" : p === "habilidades" ? "Habilidades" : "Conexiones"}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <Text testID="config-error" style={{ color: colores.peligro, marginBottom: 8 }}>
          {error}
        </Text>
      ) : null}

      {cargando ? (
        <ActivityIndicator size="large" style={{ marginTop: 30 }} />
      ) : pestana === "colaboradores" ? (
        <FlatList
          testID="config-lista-colaboradores"
          data={colaboradores}
          keyExtractor={(c) => c.id}
          ListEmptyComponent={
            <Text style={{ color: colores.textoSuave, textAlign: "center", marginTop: 20 }}>
              Sin colaboradores.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              testID={`colaborador-${item.email}`}
              onPress={() => confirmarToggleColaborador(item)}
              style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: colores.texto, fontWeight: "600" }} numberOfLines={1}>
                  {item.email}
                  {item.is_platform_master ? " · master" : ""}
                </Text>
                <Text style={{ color: colores.textoSuave, fontSize: 12 }}>{item.role}</Text>
              </View>
              <Text style={{ color: item.active ? colores.acento : colores.peligro, fontSize: 12 }}>
                {item.active ? "activa" : "inactiva"}
              </Text>
            </Pressable>
          )}
        />
      ) : pestana === "habilidades" ? (
        <FlatList
          testID="config-lista-habilidades"
          data={habilidades}
          keyExtractor={(h) => h.id}
          ListEmptyComponent={
            <Text style={{ color: colores.textoSuave, textAlign: "center", marginTop: 20 }}>
              Sin habilidades.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              testID={`habilidad-${item.id}`}
              onPress={() => toggleHabilidad(item)}
              style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: colores.texto, fontWeight: "600" }}>
                  {item.display_name ?? item.name}
                </Text>
                <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                  v{item.version} · {item.status}
                  {item.error_message ? ` · ${item.error_message}` : ""}
                </Text>
              </View>
              <Text
                style={{
                  color: item.enabled_for_tenant ? colores.acento : colores.textoSuave,
                  fontSize: 12,
                }}
              >
                {item.enabled_for_tenant ? "activa" : "inactiva"}
              </Text>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          testID="config-lista-conexiones"
          data={conexiones}
          keyExtractor={(c) => c.id}
          ListEmptyComponent={
            <Text style={{ color: colores.textoSuave, textAlign: "center", marginTop: 20 }}>
              Sin conexiones.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colores.texto, fontWeight: "600" }}>
                  {item.label}
                  {item.is_primary ? " · principal" : ""}
                </Text>
                <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                  {item.channel} · {item.external_id}
                </Text>
              </View>
              <Text style={{ color: item.active ? colores.acento : colores.peligro, fontSize: 12 }}>
                {item.active ? "activa" : "inactiva"}
              </Text>
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
  fila: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
});
