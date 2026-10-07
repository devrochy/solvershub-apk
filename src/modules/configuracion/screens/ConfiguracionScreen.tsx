import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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
  invitarColaborador,
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
  const [modalInvitar, setModalInvitar] = useState(false);
  const [campoEmail, setCampoEmail] = useState("");
  const [campoClave, setCampoClave] = useState("");
  const [campoRol, setCampoRol] = useState("colaborador");
  const [enviando, setEnviando] = useState(false);

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

  const enviarInvitacion = async () => {
    if (!campoEmail.trim() || campoClave.length < 6) {
      setError("Correo y contraseña (mín. 6) son obligatorios.");
      return;
    }
    setEnviando(true);
    try {
      await invitarColaborador(api, { email: campoEmail.trim(), password: campoClave, role: campoRol });
      setModalInvitar(false);
      setCampoEmail("");
      setCampoClave("");
      await cargar();
    } catch {
      setError("No se pudo invitar. Revisa los datos.");
    } finally {
      setEnviando(false);
    }
  };

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

      {pestana === "colaboradores" ? (
        <Pressable
          testID="config-invitar"
          onPress={() => setModalInvitar(true)}
          style={[styles.fab, { backgroundColor: colores.primario }]}
        >
          <Text style={{ color: "#ffffff", fontWeight: "700" }}>+ Invitar</Text>
        </Pressable>
      ) : null}

      <Modal visible={modalInvitar} transparent animationType="fade">
        <View style={styles.modalFondo}>
          <View style={[styles.modalCaja, { backgroundColor: colores.tarjeta }]}>
            <Text style={[styles.modalTitulo, { color: colores.texto }]}>Invitar colaborador</Text>
            <TextInput testID="modal-email" value={campoEmail} onChangeText={setCampoEmail}
              placeholder="Correo" placeholderTextColor={colores.textoSuave} autoCapitalize="none"
              style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]} />
            <TextInput testID="modal-clave" value={campoClave} onChangeText={setCampoClave}
              placeholder="Contraseña" placeholderTextColor={colores.textoSuave} secureTextEntry
              style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]} />
            <View style={styles.chips}>
              {["colaborador", "owner"].map((rol) => (
                <Pressable key={rol} onPress={() => setCampoRol(rol)} style={[styles.chip, { borderColor: campoRol === rol ? colores.acento : colores.borde }]}>
                  <Text style={{ color: campoRol === rol ? colores.acento : colores.textoSuave, fontSize: 12 }}>{rol}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.modalBotones}>
              <Pressable onPress={() => setModalInvitar(false)} style={{ padding: 10 }}>
                <Text style={{ color: colores.textoSuave }}>Cancelar</Text>
              </Pressable>
              <Pressable testID="modal-enviar" disabled={enviando}
                onPress={() => void enviarInvitacion()}
                style={[styles.modalBoton, { backgroundColor: colores.primario }]}
              >
                <Text style={{ color: "#ffffff", fontWeight: "700" }}>Enviar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
  fab: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, alignSelf: "center", marginTop: 4 },
  modalFondo: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modalCaja: { borderRadius: 14, padding: 18, gap: 10 },
  modalTitulo: { fontSize: 16, fontWeight: "700" },
  campo: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10 },
  chips: { flexDirection: "row", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  modalBotones: { flexDirection: "row", justifyContent: "flex-end", gap: 16, marginTop: 4 },
  modalBoton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
});
