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
import type { ClienteAdmin } from "@core/api/admin";
import {
  cargarGestores,
  cargarPermisosGestor,
  crearGestor,
  editarGestor,
  eliminarGestor,
  guardarPermisosGestor,
  type GestorOut,
} from "../api";
import { PasswordField } from "@shared/ui";

const ETIQUETAS_PERMISO: Record<string, string> = {
  registrar_prestamo: "Registrar préstamo",
  registrar_pago: "Registrar pago",
  registrar_abono: "Registrar abono",
  registrar_gasto: "Registrar gasto",
  registrar_no_pago: "Registrar no pago",
  anotar_notas_cartera: "Notas de cartera",
  actualizar_cliente: "Actualizar cliente",
  eliminar_prestamo: "Eliminar préstamo",
  eliminar_pago: "Eliminar pago",
  eliminar_abono: "Eliminar abono",
  eliminar_gasto: "Eliminar gasto",
  registrar_inyeccion: "Registrar inyección",
  ver_cartera: "Ver cartera",
  generar_reporte: "Generar reporte",
};

export function GestoresTab({ api }: { api: ClienteAdmin }) {
  const { colores } = useTheme();
  const [gestores, setGestores] = useState<GestorOut[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<GestorOut | null>(null);
  const [creando, setCreando] = useState(false);
  const [campoNombre, setCampoNombre] = useState("");
  const [campoTelefono, setCampoTelefono] = useState("");
  const [campoCorreo, setCampoCorreo] = useState("");
  const [campoPassword, setCampoPassword] = useState("");
  const [catalogoPermisos, setCatalogoPermisos] = useState<string[]>([]);
  const [permisosActivos, setPermisosActivos] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setError(null);
      setGestores(await cargarGestores(api));
    } catch {
      setError("No pudimos cargar los gestores.");
    }
  }, [api]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial: setState tras await
    void cargar().finally(() => setCargando(false));
  }, [cargar]);

  const abrirEditor = (gestor: GestorOut | null) => {
    setEditando(gestor);
    setCreando(gestor === null);
    setCampoNombre(gestor?.nombre ?? "");
    setCampoTelefono(gestor?.telefono ?? "");
    setCampoCorreo(gestor?.correo ?? "");
    setCampoPassword("");
    setCatalogoPermisos([]);
    setPermisosActivos([]);
    if (gestor) {
      cargarPermisosGestor(api, gestor.id)
        .then((p) => {
          setCatalogoPermisos(p.catalogo);
          setPermisosActivos(p.activos);
        })
        .catch(() => setError("No pudimos cargar los permisos del gestor."));
    }
  };

  const alternarPermiso = (permiso: string) => {
    setPermisosActivos((previas) =>
      previas.includes(permiso) ? previas.filter((p) => p !== permiso) : [...previas, permiso],
    );
  };

  const guardar = async () => {
    if (!campoNombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setEnviando(true);
    try {
      if (creando) {
        const res = await crearGestor(api, {
          nombre: campoNombre.trim(),
          correo: campoCorreo.trim(),
          telefono: campoTelefono.trim(),
          password: campoPassword || undefined,
        });
        if (res.resultado === "invitado") {
          Alert.alert("Invitación enviada", "Ya existía un colaborador con ese correo: se invitó al equipo.");
        }
      } else if (editando) {
        await editarGestor(api, editando.id, {
          nombre: campoNombre.trim(),
          correo: campoCorreo.trim(),
          telefono: campoTelefono.trim(),
        });
        await guardarPermisosGestor(api, editando.id, permisosActivos);
      }
      setEditando(null);
      setCreando(false);
      await cargar();
    } catch {
      setError("No se pudo guardar. Revisa los datos.");
    } finally {
      setEnviando(false);
    }
  };

  const eliminar = (gestor: GestorOut) => {
    Alert.alert("Eliminar gestor", `${gestor.nombre} dejará de operar en campo.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => {
          void eliminarGestor(api, gestor.id)
            .then(cargar)
            .catch(() => setError("No se pudo eliminar el gestor."));
        },
      },
    ]);
  };

  return (
    <View style={styles.contenedor}>
      {error ? (
        <Text testID="gestores-error" style={{ color: colores.peligro, marginBottom: 8 }}>
          {error}
        </Text>
      ) : null}

      <Pressable
        testID="gestores-nuevo"
        onPress={() => abrirEditor(null)}
        style={[styles.botonNuevo, { backgroundColor: colores.primario }]}
      >
        <Text style={{ color: "#ffffff", fontWeight: "700" }}>+ Nuevo gestor</Text>
      </Pressable>

      {cargando ? (
        <ActivityIndicator size="large" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          testID="gestores-lista"
          data={gestores}
          keyExtractor={(g) => g.id}
          ListEmptyComponent={<Text style={styles.vacio}>Sin gestores.</Text>}
          renderItem={({ item }) => (
            <Pressable
              testID={`gestor-${item.id}`}
              onPress={() => abrirEditor(item)}
              style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: colores.texto, fontWeight: "600" }}>{item.nombre}</Text>
                <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                  {item.telefono || "sin teléfono"} · {item.correo || "sin correo"}
                </Text>
              </View>
              <Text style={{ color: item.estatus === "activo" ? colores.acento : colores.peligro, fontSize: 11 }}>
                {item.estatus}
              </Text>
            </Pressable>
          )}
        />
      )}

      <Modal visible={editando !== null || creando} transparent animationType="fade">
        <View style={styles.modalFondo}>
          <View style={[styles.modalCaja, { backgroundColor: colores.tarjeta }]}>
            <Text style={[styles.modalTitulo, { color: colores.texto }]}>
              {creando ? "Nuevo gestor" : "Editar gestor"}
            </Text>
            <TextInput testID="gestor-nombre" value={campoNombre} onChangeText={setCampoNombre}
              placeholder="Nombre" placeholderTextColor={colores.textoSuave}
              style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]} />
            <TextInput testID="gestor-telefono" value={campoTelefono} onChangeText={setCampoTelefono}
              placeholder="Teléfono" placeholderTextColor={colores.textoSuave} keyboardType="phone-pad"
              style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]} />
            <TextInput testID="gestor-correo" value={campoCorreo} onChangeText={setCampoCorreo}
              placeholder="Correo" placeholderTextColor={colores.textoSuave} autoCapitalize="none"
              style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]} />
            {creando ? (
              <PasswordField testID="gestor-password" value={campoPassword} onChangeText={setCampoPassword}
                placeholder="Contraseña (si va a entrar a la app)"
                style={[styles.campo, { borderColor: colores.borde, color: colores.texto, backgroundColor: "transparent" }]} />
            ) : null}

            {!creando && catalogoPermisos.length > 0 ? (
              <>
                <Text style={[styles.seccion, { color: colores.texto }]}>Permisos de campo</Text>
                <View style={styles.chips}>
                  {catalogoPermisos.map((p) => (
                    <Pressable
                      key={p}
                      testID={`permiso-${p}`}
                      onPress={() => alternarPermiso(p)}
                      style={[
                        styles.chip,
                        {
                          borderColor: permisosActivos.includes(p) ? colores.acento : colores.borde,
                          backgroundColor: permisosActivos.includes(p) ? colores.acento : "transparent",
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: permisosActivos.includes(p) ? "#ffffff" : colores.textoSuave,
                          fontSize: 12,
                        }}
                      >
                        {ETIQUETAS_PERMISO[p] ?? p}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            <View style={styles.modalBotones}>
              {!creando && editando ? (
                <Pressable testID="gestor-eliminar" onPress={() => eliminar(editando)} style={{ padding: 10 }}>
                  <Text style={{ color: colores.peligro }}>Eliminar</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => {
                  setEditando(null);
                  setCreando(false);
                }}
                style={{ padding: 10 }}
              >
                <Text style={{ color: colores.textoSuave }}>Cancelar</Text>
              </Pressable>
              <Pressable testID="gestor-guardar" disabled={enviando} onPress={() => void guardar()}
                style={[styles.modalBoton, { backgroundColor: colores.primario }]}>
                <Text style={{ color: "#ffffff", fontWeight: "700" }}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  botonNuevo: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, alignSelf: "center", marginBottom: 8 },
  fila: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: "row", alignItems: "center" },
  vacio: { color: "#8695B0", textAlign: "center", marginTop: 20 },
  modalFondo: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modalCaja: { borderRadius: 14, padding: 18, gap: 10 },
  modalTitulo: { fontSize: 16, fontWeight: "700" },
  campo: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10 },
  seccion: { fontSize: 14, fontWeight: "700", marginTop: 4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  modalBotones: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 4 },
  modalBoton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
});
