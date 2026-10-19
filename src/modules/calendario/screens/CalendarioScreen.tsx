import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
 Modal, ScrollView, TextInput , Linking } from "react-native";
import { usePestanasDeEntrada, type EntradaPestanas, type SolicitudPestana } from "@shared/pestana-inicial";
import { useTheme } from "@core/theme/theme-context";
import { useAdminApi } from "@core/session/use-admin-api";
import { useAdminSession } from "@core/session/admin-session-context";
import { apiRoot } from "@core/config";
import {
  cargarBloqueos,
  cargarConfigPlugin,
  cargarEstadoConexion,
  cargarSemana,
  cargarTipos,
  crearBloqueo,
  crearTipo,
  guardarConfigPlugin,
  type BlockOut,
  type EstadoConexionCalendario,
  type TypeOut,
  type WeekItem,
} from "../api";

const DIAS_SEMANA: { key: string; label: string }[] = [
  { key: "mon", label: "Lunes" },
  { key: "tue", label: "Martes" },
  { key: "wed", label: "Miércoles" },
  { key: "thu", label: "Jueves" },
  { key: "fri", label: "Viernes" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
];

function parsearHorario(raw: unknown): Record<string, string> {
  let data: unknown = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw || "{}");
    } catch {
      data = {};
    }
  }
  const out: Record<string, string> = {};
  if (data && typeof data === "object") {
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      if (typeof v === "string") {
        out[k] = v;
      }
    }
  }
  return out;
}

type Pestana = "semana" | "tipos" | "bloqueos" | "horario" | "conexion";
const PESTANAS: readonly Pestana[] = ["semana", "tipos", "bloqueos", "horario", "conexion"];

function fechaCorta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Calendario del panel web para conectar Google (el OAuth vive en el panel, ADR-0093).
 * El panel usa el negocio de su propia sesión, que puede ser otro: `?tenant=` le dice
 * cuál está usando la app para que avise y ofrezca cambiar antes de conectar. El panel
 * y la API comparten host (la API cuelga de `/api`).
 */
export function urlConectarGoogle(tenantId: string | null): string {
  const base = `${apiRoot()}/calendario`;
  return tenantId ? `${base}?tenant=${encodeURIComponent(tenantId)}` : base;
}

export function CalendarioScreen({
  pestanaInicial,
  entrada,
}: { pestanaInicial?: SolicitudPestana; entrada?: EntradaPestanas } = {}) {
  const { colores } = useTheme();
  const api = useAdminApi();
  const { sesion } = useAdminSession();
  // Solo las pestañas de Agenda que el usuario puede ver (cada una tiene su sección RBAC).
  const { pestana, setPestana, propias } = usePestanasDeEntrada<Pestana>(
    "calendario",
    "semana",
    PESTANAS,
    pestanaInicial,
    entrada,
  );
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
  const [horario, setHorario] = useState<Record<string, string>>({});
  const [configPlugin, setConfigPlugin] = useState<Record<string, unknown> | null>(null);
  const [guardandoHorario, setGuardandoHorario] = useState(false);
  const [horarioGuardado, setHorarioGuardado] = useState(false);
  const [conexion, setConexion] = useState<EstadoConexionCalendario | null>(null);

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

  useEffect(() => {
    if (pestana === "conexion") {
      cargarEstadoConexion(api)
        .then(setConexion)
        .catch(() => setError("No pudimos cargar la conexión del calendario."));
    }
    if (pestana === "horario") {
      cargarConfigPlugin(api, "pack_calendar")
        .then((cfg) => {
          setConfigPlugin(cfg.values);
          setHorario(parsearHorario(cfg.values?.business_hours));
        })
        .catch(() => setError("No pudimos cargar el horario."));
    }
     
  }, [pestana, api]);

  const setRango = (dia: string, inicio: string, fin: string) => {
    setHorario((previo) => ({ ...previo, [dia]: inicio && fin ? `${inicio}-${fin}` : "" }));
    setHorarioGuardado(false);
  };

  const guardarHorario = async () => {
    setGuardandoHorario(true);
    setHorarioGuardado(false);
    try {
      const limpio: Record<string, string> = {};
      for (const [k, v] of Object.entries(horario)) {
        if (v && v.trim()) {
          limpio[k] = v.trim();
        }
      }
      const valores = {
        ...(configPlugin ?? {}),
        business_hours: JSON.stringify(limpio),
      };
      const res = await guardarConfigPlugin(api, "pack_calendar", valores);
      setConfigPlugin(res.values);
      setHorario(parsearHorario(res.values?.business_hours));
      setHorarioGuardado(true);
    } catch {
      setError("No se pudo guardar el horario.");
    } finally {
      setGuardandoHorario(false);
    }
  };

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
      {propias.length > 1 ? (
        <View style={[styles.pestanas, { borderColor: colores.borde }]}>
          {propias.map((p) => (
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
                {p === "semana"
                  ? "Semana"
                  : p === "tipos"
                    ? "Tipos"
                    : p === "bloqueos"
                      ? "Bloqueos"
                      : p === "horario"
                        ? "Horario"
                        : "Conexión"}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {error ? (
        <Text testID="calendario-error" style={{ color: colores.peligro, marginBottom: 8 }}>
          {error}
        </Text>
      ) : null}

      {pestana !== "semana" && pestana !== "horario" && pestana !== "conexion" ? (
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
      ) : pestana === "conexion" ? (
        <View testID="conexion-tarjeta" style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colores.texto, fontWeight: "700" }}>Google Calendar</Text>
            <Text style={{ color: colores.textoSuave, fontSize: 12, marginTop: 4 }}>
              {conexion?.connected
                ? `Conectado · ${conexion.account_email ?? conexion.connection_label ?? ""}`
                : conexion?.configured
                  ? "Configurado pero sin conectar."
                  : "Sin configurar."}
            </Text>
            {conexion?.timezone ? (
              <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                Zona horaria {conexion.timezone}
                {conexion.default_duration_minutes ? ` · citas de ${conexion.default_duration_minutes} min` : ""}
              </Text>
            ) : null}
          </View>
          <Text style={{ color: conexion?.connected ? colores.acento : colores.textoSuave, fontSize: 11 }}>
            {conexion?.connected ? "conectado" : "sin conectar"}
          </Text>
          <Pressable
            testID="conexion-google"
            onPress={() => {
              void Linking.openURL(urlConectarGoogle(sesion?.tenantId ?? null)).catch(() => undefined);
            }}
            style={[styles.modalBoton, { backgroundColor: colores.primario, alignSelf: "flex-start" }]}
          >
            <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 12 }}>
              {conexion?.connected ? "Gestionar" : "Conectar con Google"}
            </Text>
          </Pressable>
        </View>
      ) : pestana === "horario" ? (
        <ScrollView testID="calendario-horario">
          <Text style={{ color: colores.textoSuave, fontSize: 12, marginBottom: 10 }}>
            Días y horas en que el asistente puede agendar citas. Rango en formato HH:MM-HH:MM; vacío = cerrado.
          </Text>
          {DIAS_SEMANA.map((dia) => {
            const rango = horario[dia.key] ?? "";
            const [inicio = "", fin = ""] = rango.split("-");
            return (
              <View key={dia.key} style={[styles.filaHorario, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
                <Text style={{ color: colores.texto, width: 90, fontWeight: "600" }}>{dia.label}</Text>
                <TextInput
                  testID={`horario-inicio-${dia.key}`}
                  value={inicio}
                  onChangeText={(v) => setRango(dia.key, v, fin)}
                  placeholder="08:00"
                  placeholderTextColor={colores.textoSuave}
                  style={[styles.campoChico, { borderColor: colores.borde, color: colores.texto }]}
                />
                <Text style={{ color: colores.textoSuave }}>–</Text>
                <TextInput
                  testID={`horario-fin-${dia.key}`}
                  value={fin}
                  onChangeText={(v) => setRango(dia.key, inicio, v)}
                  placeholder="18:00"
                  placeholderTextColor={colores.textoSuave}
                  style={[styles.campoChico, { borderColor: colores.borde, color: colores.texto }]}
                />
              </View>
            );
          })}
          <Pressable
            testID="horario-guardar"
            disabled={guardandoHorario}
            onPress={() => void guardarHorario()}
            style={[styles.modalBoton, { backgroundColor: colores.primario, alignSelf: "center", marginTop: 10, paddingHorizontal: 24 }]}
          >
            <Text style={{ color: "#ffffff", fontWeight: "700" }}>Guardar horario</Text>
          </Pressable>
          {horarioGuardado ? (
            <Text
              testID="horario-mensaje"
              style={{ color: colores.acento, textAlign: "center", marginTop: 8 }}
            >
              Horario guardado.
            </Text>
          ) : null}
        </ScrollView>
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
  filaHorario: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  campoChico: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, textAlign: "center" },
});
