import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "@core/theme/theme-context";
import { useAdminApi } from "@core/session/use-admin-api";
import { Modal, TextInput } from "react-native";
import {
  cargarBloqueos,
  cargarSemana,
  cargarTipos,
  crearBloqueo,
  crearTipo,
  type BlockOut,
  type TypeOut,
  type WeekItem,
} from "../api";

type Pestana = "semana" | "tipos" | "bloqueos";

function fechaCorta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CalendarioScreen() {
  const { colores } = useTheme();
  const api = useAdminApi();
  const [pestana, setPestana] = useState<Pestana>("semana");
  const [items, setItems] = useState<WeekItem[]>([]);
  const [inicio, setInicio] = useState<string>("");
  const [tipos, setTipos] = useState<TypeOut[]>([]);
  const [bloqueos, setBloqueos] = useState<BlockOut[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalNuevo, setModalNuevo] = useState<"tipo" | "bloqueo" | null>(null);
  const [campoNombre, setCampoNombre] = useState("");
  const [campoDuracion, setCampoDuracion] = useState("");
  const [campoInicio, setCampoInicio] = useState("");
  const [campoFin, setCampoFin] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [semana, t, b] = await Promise.all([
        cargarSemana(api),
        cargarTipos(api),
        cargarBloqueos(api),
      ]);
      setError(null);
      setItems(semana.items);
      setInicio(semana.start);
      setTipos(t);
      setBloqueos(b);
    } catch {
      setError("No pudimos cargar la agenda. Revisa tu conexión.");
    }
  }, [api]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial: los setState ocurren después del await (no síncronos)
    void cargar().finally(() => setCargando(false));
  }, [cargar]);

  const crearNuevo = async () => {
    setEnviando(true);
    try {
      if (modalNuevo === "tipo") {
        await crearTipo(api, { name: campoNombre.trim(), duration_minutes: Number(campoDuracion) || 30 });
      } else {
        await crearBloqueo(api, {
          start_at: new Date(campoInicio.trim()).toISOString(),
          end_at: new Date(campoFin.trim()).toISOString(),
          reason: campoNombre.trim() || "Bloqueo",
        });
      }
      setModalNuevo(null);
      setCampoNombre("");
      setCampoDuracion("");
      setCampoInicio("");
      setCampoFin("");
      await cargar();
    } catch {
      setError("No se pudo crear. Revisa las fechas (formato AAAA-MM-DD HH:MM).");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={[styles.contenedor, { backgroundColor: colores.fondo }]}>
      <View style={[styles.pestanas, { borderColor: colores.borde }]}>
        {(["semana", "tipos", "bloqueos"] as Pestana[]).map((p) => (
          <Pressable
            key={p}
            testID={`calendario-${p}`}
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
              {p === "semana" ? "Semana" : p === "tipos" ? "Tipos" : "Bloqueos"}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <Text testID="calendario-error" style={{ color: colores.peligro, marginBottom: 8 }}>
          {error}
        </Text>
      ) : null}

      {pestana !== "semana" ? (
        <Pressable
          testID="calendario-nuevo"
          onPress={() => setModalNuevo(pestana === "tipos" ? "tipo" : "bloqueo")}
          style={[styles.fab, { backgroundColor: colores.primario }]}
        >
          <Text style={{ color: "#ffffff", fontWeight: "700" }}>+ Nuevo</Text>
        </Pressable>
      ) : null}

      <Modal visible={modalNuevo !== null} transparent animationType="fade">
        <View style={styles.modalFondo}>
          <View style={[styles.modalCaja, { backgroundColor: colores.tarjeta }]}>
            <Text style={[styles.modalTitulo, { color: colores.texto }]}>
              {modalNuevo === "tipo" ? "Nuevo tipo de cita" : "Nuevo bloqueo"}
            </Text>
            {modalNuevo === "tipo" ? (
              <>
                <TextInput testID="modal-nombre" value={campoNombre} onChangeText={setCampoNombre}
                  placeholder="Nombre" placeholderTextColor={colores.textoSuave}
                  style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]} />
                <TextInput testID="modal-duracion" value={campoDuracion} onChangeText={setCampoDuracion}
                  placeholder="Duración (minutos)" placeholderTextColor={colores.textoSuave} keyboardType="numeric"
                  style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]} />
              </>
            ) : (
              <>
                <TextInput testID="modal-inicio" value={campoInicio} onChangeText={setCampoInicio}
                  placeholder="Inicio (AAAA-MM-DD HH:MM)" placeholderTextColor={colores.textoSuave}
                  style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]} />
                <TextInput testID="modal-fin" value={campoFin} onChangeText={setCampoFin}
                  placeholder="Fin (AAAA-MM-DD HH:MM)" placeholderTextColor={colores.textoSuave}
                  style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]} />
                <TextInput testID="modal-nombre" value={campoNombre} onChangeText={setCampoNombre}
                  placeholder="Motivo" placeholderTextColor={colores.textoSuave}
                  style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]} />
              </>
            )}
            <View style={styles.modalBotones}>
              <Pressable onPress={() => setModalNuevo(null)} style={{ padding: 10 }}>
                <Text style={{ color: colores.textoSuave }}>Cancelar</Text>
              </Pressable>
              <Pressable testID="modal-crear" disabled={enviando} onPress={() => void crearNuevo()}
                style={[styles.modalBoton, { backgroundColor: colores.primario }]}>
                <Text style={{ color: "#ffffff", fontWeight: "700" }}>Crear</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {cargando ? (
        <ActivityIndicator size="large" style={{ marginTop: 30 }} />
      ) : pestana === "semana" ? (
        <FlatList
          testID="calendario-lista-semana"
          data={[...items].sort((a, b) => a.start_at.localeCompare(b.start_at))}
          keyExtractor={(i) => `${i.kind}-${i.id}`}
          ListHeaderComponent={
            inicio ? (
              <Text style={{ color: colores.textoSuave, fontSize: 12, marginBottom: 8 }}>
                Semana del {inicio}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <Text style={{ color: colores.textoSuave, textAlign: "center", marginTop: 20 }}>
              Sin citas ni bloqueos esta semana.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colores.texto, fontWeight: "600" }} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                  {fechaCorta(item.start_at)} → {fechaCorta(item.end_at)} · {item.status}
                </Text>
              </View>
              <Text
                style={{
                  color: item.kind === "bloqueo" ? colores.peligro : colores.acento,
                  fontSize: 12,
                }}
              >
                {item.kind}
              </Text>
            </View>
          )}
        />
      ) : pestana === "tipos" ? (
        <FlatList
          testID="calendario-lista-tipos"
          data={tipos}
          keyExtractor={(t) => t.id}
          ListEmptyComponent={
            <Text style={{ color: colores.textoSuave, textAlign: "center", marginTop: 20 }}>
              Sin tipos de cita.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colores.texto, fontWeight: "600" }}>{item.name}</Text>
                <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                  {item.duration_minutes} min
                </Text>
              </View>
              <Text style={{ color: item.active ? colores.acento : colores.textoSuave, fontSize: 12 }}>
                {item.active ? "activo" : "inactivo"}
              </Text>
            </View>
          )}
        />
      ) : (
        <FlatList
          testID="calendario-lista-bloqueos"
          data={bloqueos}
          keyExtractor={(b) => b.id}
          ListEmptyComponent={
            <Text style={{ color: colores.textoSuave, textAlign: "center", marginTop: 20 }}>
              Sin bloqueos.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colores.texto, fontWeight: "600" }}>
                  {fechaCorta(item.start_at)} → {fechaCorta(item.end_at)}
                </Text>
                <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                  {item.reason || "Sin motivo"}
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
  modalBotones: { flexDirection: "row", justifyContent: "flex-end", gap: 16, marginTop: 4 },
  modalBoton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
});
