import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  Switch,
  View,
} from "react-native";
import {
  abrirPestanaAjena,
  usePestanasDeEntrada,
  type EntradaPestanas,
  type SolicitudPestana,
} from "@shared/pestana-inicial";
import { useTheme } from "@core/theme/theme-context";
import { useAdminApi } from "@core/session/use-admin-api";
import { useAdminSession } from "@core/session/admin-session-context";
import { CLAVE_PUSH_HABILITADO, guardarAjuste, leerAjuste } from "@data/ajustes";
import { AjustesTab } from "../components/AjustesTab";
import { GoogleCalendarCard } from "../components/GoogleCalendarCard";
import { MetaChecklist } from "../components/MetaChecklist";
import {
  accionHabilidad,
  borrarPlantilla,
  cargarConexiones,
  cargarHabilidades,
  cargarPlantillas,
  sincronizarPlantillas,
  type PlantillaMeta,
  type ConnectionItem,
  type PluginSummary,
} from "../api";
import { EquipoTab } from "../equipo/EquipoTab";

type Pestana =
  | "colaboradores"
  | "habilidades"
  | "conexiones"
  | "ajustes"
  | "notificaciones";
const PESTANAS: readonly Pestana[] = ["colaboradores", "habilidades", "conexiones", "ajustes", "notificaciones"];

export function ConfiguracionScreen({
  pestanaInicial,
  entrada,
}: { pestanaInicial?: SolicitudPestana; entrada?: EntradaPestanas } = {}) {
  const { colores } = useTheme();
  const api = useAdminApi();
  const { sesion } = useAdminSession();
  const esMaster = sesion?.role === "master";
  const puedeEditarConexiones = esMaster || sesion?.permissions?.connections === "write";
  // Solo las pestañas de la entrada del cajón (Equipo, Conexiones, Configuración);
  // las de otra pantalla (Mensajes fallidos) se abren por el bus.
  const { pestana, setPestana, propias, ajenas } = usePestanasDeEntrada<Pestana>(
    "configuracion",
    "colaboradores",
    PESTANAS,
    pestanaInicial,
    entrada,
  );
  const [habilidades, setHabilidades] = useState<PluginSummary[]>([]);
  const [conexiones, setConexiones] = useState<ConnectionItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conexionPlantillas, setConexionPlantillas] = useState<ConnectionItem | null>(null);
  const [plantillas, setPlantillas] = useState<PlantillaMeta[]>([]);
  const [plantillasCargando, setPlantillasCargando] = useState(false);
  const [pushOn, setPushOn] = useState(true);
  const [subConexiones, setSubConexiones] = useState<"canales" | "meta">("canales");
  const google = conexiones.filter((conexion) => conexion.type_id === "google_calendar");
  const canales = conexiones.filter((conexion) => conexion.type_id !== "google_calendar");

  const cargar = useCallback(async () => {
    try {
      const [h, cx] = await Promise.all([
        cargarHabilidades(api),
        cargarConexiones(api),
      ]);
      setError(null);
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

  useEffect(() => {
    if (pestana === "notificaciones") {
      leerAjuste(CLAVE_PUSH_HABILITADO)
        .then((v) => setPushOn(v !== "0"))
        .catch(() => undefined);
    }
     
  }, [pestana, api]);

  const alternarPush = (valor: boolean) => {
    setPushOn(valor);
    void guardarAjuste(CLAVE_PUSH_HABILITADO, valor ? "1" : "0").catch(() => undefined);
  };

  const abrirPlantillas = (c: ConnectionItem) => {
    setConexionPlantillas(c);
    setPlantillasCargando(true);
    cargarPlantillas(api, c.id)
      .then((r) => setPlantillas(r.templates))
      .catch(() => setError("No pudimos cargar las plantillas."))
      .finally(() => setPlantillasCargando(false));
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
      {propias.length + ajenas.length > 1 ? (
        <View style={[styles.pestanas, { borderColor: colores.borde }]}>
          {propias.map((p) => (
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
                {p === "colaboradores"
                  ? "Equipo"
                  : p === "habilidades"
                    ? "Habil."
                    : p === "conexiones"
                      ? "Conex."
                      : p === "ajustes"
                        ? "Ajustes"
                        : "Push"}
              </Text>
            </Pressable>
          ))}
          {ajenas.map((a) => (
            <Pressable
              key={`${a.tab}-${a.pestana}`}
              testID={`config-${a.pestana}`}
              onPress={() => abrirPestanaAjena(a)}
              style={styles.pestana}
            >
              <Text style={{ color: colores.textoSuave, fontSize: 12, fontWeight: "600" }} numberOfLines={1}>
                {a.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {error && pestana !== "colaboradores" ? (
        <Text testID="config-error" style={{ color: colores.peligro, marginBottom: 8 }}>
          {error}
        </Text>
      ) : null}

      {pestana === "colaboradores" ? (
        <EquipoTab />
      ) : cargando ? (
        <ActivityIndicator size="large" style={{ marginTop: 30 }} />
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
      ) : pestana === "conexiones" ? (
        <View style={{ flex: 1 }}>
          <View style={[styles.chips, { marginBottom: 8 }]}>
            {(["canales", "meta"] as const).map((sc) => (
              <Pressable
                key={sc}
                testID={`subconex-${sc}`}
                onPress={() => setSubConexiones(sc)}
                style={[
                  styles.chip,
                  { borderColor: subConexiones === sc ? colores.acento : colores.borde },
                ]}
              >
                <Text
                  style={{
                    color: subConexiones === sc ? colores.acento : colores.textoSuave,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  {sc === "canales" ? "Canales" : "Meta"}
                </Text>
              </Pressable>
            ))}
          </View>
          {subConexiones === "meta" ? (
            <MetaChecklist />
          ) : (
            <FlatList
              testID="config-lista-conexiones"
              data={canales}
              keyExtractor={(c) => c.id}
              ListHeaderComponent={
                <GoogleCalendarCard
                  conexiones={google}
                  tenantId={sesion?.tenantId ?? null}
                  puedeEditar={puedeEditarConexiones}
                />
              }
              ListEmptyComponent={
                <Text style={{ color: colores.textoSuave, textAlign: "center", marginTop: 20 }}>
                  Sin otros canales.
                </Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  testID={`conexion-${item.id}`}
                  onPress={() => abrirPlantillas(item)}
                  style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
                >
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
                </Pressable>
              )}
            />
          )}
        </View>
      ) : pestana === "ajustes" ? (
        <AjustesTab />
      ) : (
        <View style={{ padding: 4 }}>
          <View style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colores.texto, fontWeight: "600" }}>Notificaciones push</Text>
              <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                Avisos de conversaciones, promesas y actividad del negocio.
              </Text>
            </View>
            <Switch
              testID="push-toggle"
              value={pushOn}
              onValueChange={alternarPush}
              trackColor={{ true: colores.acento, false: colores.borde }}
            />
          </View>
        </View>
      )}

      <Modal visible={conexionPlantillas !== null} transparent animationType="fade">
        <View style={styles.modalFondo}>
          <View style={[styles.modalCaja, { backgroundColor: colores.tarjeta }]}>
            <Text style={[styles.modalTitulo, { color: colores.texto }]}>
              Plantillas · {conexionPlantillas?.label ?? ""}
            </Text>
            <Pressable
              testID="plantillas-sync"
              onPress={() => {
                if (!conexionPlantillas) {
                  return;
                }
                void sincronizarPlantillas(api, conexionPlantillas.id)
                  .then(() => abrirPlantillas(conexionPlantillas))
                  .catch(() => setError("No se pudo sincronizar con Meta."));
              }}
              style={[styles.modalBoton, { backgroundColor: colores.primario, alignSelf: "flex-start" }]}
            >
              <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 12 }}>Sincronizar</Text>
            </Pressable>
            {plantillasCargando ? (
              <ActivityIndicator style={{ marginTop: 16 }} />
            ) : plantillas.length === 0 ? (
              <Text style={{ color: colores.textoSuave, marginTop: 12 }}>
                Sin plantillas. Las plantillas se crean en Meta Business y se sincronizan aquí.
              </Text>
            ) : (
              plantillas.map((plantilla) => (
                <View
                  key={plantilla.id}
                  style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.fondo }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colores.texto, fontWeight: "600" }}>{plantilla.name}</Text>
                    <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                      {plantilla.language} · {plantilla.status}
                      {plantilla.quality_score ? ` · calidad ${plantilla.quality_score}` : ""}
                    </Text>
                  </View>
                  <Pressable
                    testID={`plantilla-borrar-${plantilla.id}`}
                    onPress={() => {
                      if (!conexionPlantillas) {
                        return;
                      }
                      Alert.alert(
                        "Borrar plantilla",
                        "Se borran todas las versiones de idioma.",
                        [
                          { text: "Cancelar", style: "cancel" },
                          {
                            text: "Borrar",
                            style: "destructive",
                            onPress: () => {
                              void borrarPlantilla(api, conexionPlantillas.id, plantilla.id)
                                .then(() => abrirPlantillas(conexionPlantillas))
                                .catch(() => setError("No se pudo borrar la plantilla."));
                            },
                          },
                        ],
                      );
                    }}
                    style={{ padding: 6 }}
                  >
                    <Text style={{ color: colores.peligro, fontSize: 12 }}>Borrar</Text>
                  </Pressable>
                </View>
              ))
            )}
            <Pressable
              testID="plantillas-cerrar"
              onPress={() => setConexionPlantillas(null)}
              style={[styles.modalBoton, { backgroundColor: colores.borde, alignSelf: "flex-end" }]}
            >
              <Text style={{ color: colores.texto, fontWeight: "700" }}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  modalFondo: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modalCaja: { borderRadius: 14, padding: 18, gap: 10 },
  modalTitulo: { fontSize: 16, fontWeight: "700" },
  chips: { flexDirection: "row", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  modalBoton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
});
