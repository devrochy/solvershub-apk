import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { shSpace, shType } from "@core/theme/tokens";
import { Badge, Button, Field, Icono, Sheet, TextField, useKit } from "@shared/ui";

import {
  actualizarBloqueo,
  actualizarCita,
  cancelarCita,
  cargarActividades,
  crearBloqueo,
  crearCita,
  eliminarBloqueo,
  marcarAsistencia,
  type ActivityOut,
} from "../api";
import { useAdminApi } from "@core/session/use-admin-api";
import {
  codigoPorDefecto,
  type Borrador,
  type EventoAgenda,
  type LeyendaAgenda,
  type TipoLeyenda,
} from "../domain/agenda";
import { describirAviso } from "../domain/notificacion";
import { fechaDePared, isoDePared, partesEnZona } from "../domain/zona";
import { SelectorFechaHora } from "./SelectorFechaHora";

type QueCrear = "cita" | "bloqueo";

const DURACIONES = [30, 45, 60, 90];

function confirmar(titulo: string, mensaje: string, etiqueta: string): Promise<boolean> {
  return new Promise((resolver) => {
    Alert.alert(
      titulo,
      mensaje,
      [
        { text: "Cancelar", style: "cancel", onPress: () => resolver(false) },
        { text: etiqueta, style: "destructive", onPress: () => resolver(true) },
      ],
      { cancelable: true, onDismiss: () => resolver(false) },
    );
  });
}

function addMinutos(fecha: Date, minutos: number): Date {
  return new Date(fecha.getTime() + minutos * 60_000);
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const { c } = useKit();
  return (
    <View style={styles.seccion}>
      <Text accessibilityRole="header" style={[shType.label, { color: c.text }]}>
        {titulo}
      </Text>
      {children}
    </View>
  );
}

/** Hoja de alta, detalle y edición de una cita o un bloqueo (HU-CAL-03/08). */
export function HojaEvento({
  visible,
  evento,
  borrador,
  zona,
  tipos,
  agendas,
  multiActivo,
  agendaInicial,
  onCerrar,
  onGuardado,
}: {
  visible: boolean;
  evento: EventoAgenda | null;
  borrador: Borrador | null;
  zona: string;
  tipos: TipoLeyenda[];
  agendas: LeyendaAgenda[];
  multiActivo: boolean;
  agendaInicial?: string;
  onCerrar: () => void;
  onGuardado: (mensaje?: string) => void;
}) {
  const { c } = useKit();
  const api = useAdminApi();
  const [queCrear, setQueCrear] = useState<QueCrear>("cita");
  const [agendaId, setAgendaId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [tipoId, setTipoId] = useState("");
  const [email, setEmail] = useState("");
  const [notas, setNotas] = useState("");
  const [inicio, setInicio] = useState<Date>(() => new Date());
  const [fin, setFin] = useState<Date>(() => addMinutos(new Date(), 60));
  const [notify, setNotify] = useState(true);
  const [ahora, setAhora] = useState(() => Date.now());
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actividades, setActividades] = useState<ActivityOut[]>([]);
  const claveFormulario = `${visible}|${evento?.id ?? ""}|${borrador?.start ?? ""}|${borrador?.end ?? ""}`;
  const claveRef = useRef<string | null>(null);

  const esEdicion = Boolean(evento);
  const esBloqueo = evento ? evento.kind === "block" : queCrear === "bloqueo";
  const apptId = evento?.id.startsWith("appt-") ? evento.id.slice(5) : null;
  const blockId = evento?.id.startsWith("block-") ? evento.id.slice(6) : null;

  useEffect(() => {
    if (!visible) {
      claveRef.current = null;
      return;
    }
    // Solo se rellena al abrirse o al cambiar de evento/hueco: una recarga de agendas
    // no debe borrar lo que la persona está escribiendo.
    if (claveRef.current === claveFormulario) return;
    claveRef.current = claveFormulario;
    setError(null);
    setCargando(false);
    setActividades([]);
    setNotify(true);
    setAhora(Date.now());
    const cita = evento && evento.kind !== "block" ? evento : null;
    const bloqueo = evento && evento.kind === "block" ? evento : null;
    const baseInicio = cita?.start ?? bloqueo?.start ?? borrador?.start ?? new Date().toISOString();
    const baseFin = cita?.end ?? bloqueo?.end ?? borrador?.end ?? addMinutos(new Date(baseInicio), 60).toISOString();
    const pInicio = partesEnZona(baseInicio, zona);
    const pFin = partesEnZona(baseFin, zona);
    setInicio(fechaDePared(pInicio));
    setFin(fechaDePared(pFin));
    setQueCrear(bloqueo ? "bloqueo" : "cita");
    setAgendaId(evento?.calendar_id ?? agendaInicial ?? agendas[0]?.id ?? "");
    setTitulo(cita?.title ?? "");
    setMotivo(bloqueo?.title ?? "");
    setTipoId(cita?.appointment_type_id ?? "");
    setEmail(cita?.attendee_email ?? "");
    setNotas(cita?.notes ?? "");
  }, [visible, claveFormulario, evento, borrador?.start, borrador?.end, zona, agendaInicial, agendas]);

  useEffect(() => {
    if (!visible || !apptId) return;
    let vigente = true;
    cargarActividades(api, apptId)
      .then((filas) => {
        if (vigente) setActividades(filas);
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [visible, apptId, api]);

  function cambiarInicio(valor: Date) {
    const duracion = Math.max(15, Math.round((fin.getTime() - inicio.getTime()) / 60_000));
    setInicio(valor);
    setFin(addMinutos(valor, duracion));
  }

  function cambiarTipo(id: string) {
    setTipoId(id);
    if (!esEdicion && id) {
      const tipo = tipos.find((t) => t.id === id);
      const duracion = tipo ? tipo.duration_minutes ?? 60 : 60;
      setFin(addMinutos(inicio, duracion));
    }
  }

  async function guardarCita() {
    if (!titulo.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    if (multiActivo && agendas.length >= 2 && !agendaId) {
      setError("Elige la agenda.");
      return;
    }
    if (fin <= inicio) {
      setError("La hora de fin debe ser posterior al inicio.");
      return;
    }
    setCargando(true);
    setError(null);
    const body = {
      title: titulo.trim(),
      attendee_email: email.trim(),
      notes: notas.trim(),
      appointment_type_id: tipoId || null,
      start_at: isoDePared(inicio, zona),
      end_at: isoDePared(fin, zona),
    };
    try {
      if (esEdicion && apptId) {
        const cita = await actualizarCita(api, apptId, { ...body, notify });
        onGuardado(describirAviso("Cita guardada.", cita.notification));
      } else {
        const cita = await crearCita(api, {
          ...body,
          ...(multiActivo && agendaId ? { calendar_id: agendaId } : {}),
        });
        onGuardado(describirAviso("Cita creada.", cita.notification));
      }
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo guardar la cita.");
    } finally {
      setCargando(false);
    }
  }

  async function guardarBloqueo() {
    if (multiActivo && agendas.length >= 2 && !agendaId) {
      setError("Elige la agenda.");
      return;
    }
    if (fin <= inicio) {
      setError("La hora de fin debe ser posterior al inicio.");
      return;
    }
    setCargando(true);
    setError(null);
    const body = {
      start_at: isoDePared(inicio, zona),
      end_at: isoDePared(fin, zona),
      reason: motivo.trim(),
    };
    try {
      if (esEdicion && blockId) {
        await actualizarBloqueo(api, blockId, body);
        onGuardado("Bloqueo guardado.");
      } else {
        await crearBloqueo(api, {
          ...body,
          ...(multiActivo && agendaId ? { calendar_id: agendaId } : {}),
        });
        onGuardado("Bloqueo creado.");
      }
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo guardar el bloqueo.");
    } finally {
      setCargando(false);
    }
  }

  async function cancelar() {
    if (!apptId) return;
    const aceptado = await confirmar(
      "Cancelar cita",
      notify
        ? "Se cancelará la cita y avisaremos al cliente por correo y WhatsApp. No se puede deshacer."
        : "Se cancelará la cita sin avisar al cliente. No se puede deshacer.",
      "Cancelar cita",
    );
    if (!aceptado) return;
    setCargando(true);
    try {
      const resultado = await cancelarCita(api, apptId, notify);
      onGuardado(describirAviso("Cita cancelada.", resultado.notification));
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo cancelar la cita.");
    } finally {
      setCargando(false);
    }
  }

  async function eliminar() {
    if (!blockId) return;
    const aceptado = await confirmar(
      "Eliminar bloqueo",
      "Se eliminará el bloqueo de la agenda. No se puede deshacer.",
      "Eliminar",
    );
    if (!aceptado) return;
    setCargando(true);
    try {
      await eliminarBloqueo(api, blockId);
      onGuardado("Bloqueo eliminado.");
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo eliminar el bloqueo.");
    } finally {
      setCargando(false);
    }
  }

  async function asistencia(asistio: boolean) {
    if (!apptId) return;
    setCargando(true);
    try {
      await marcarAsistencia(api, apptId, asistio);
      onGuardado(asistio ? "Marcada como asistida." : "Marcada como no asistida.");
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo marcar la asistencia.");
    } finally {
      setCargando(false);
    }
  }

  const puedeAsistencia =
    Boolean(evento && evento.kind === "appointment") &&
    ["scheduled", "asistio", "no_asistio"].includes(evento?.status ?? "") &&
    new Date(evento?.end ?? 0).getTime() <= ahora;
  const hayVarias = multiActivo && agendas.length >= 2;
  const agendaDelEvento = agendas.find((a) => a.id === evento?.calendar_id);

  return (
    <Sheet
      visible={visible}
      onClose={onCerrar}
      title={
        !esEdicion
          ? "Nuevo en la agenda"
          : esBloqueo
            ? "Bloqueo"
            : evento?.title || "Cita"
      }
      description={
        !esEdicion
          ? "Elige si este hueco es una cita o un bloqueo."
          : esBloqueo
            ? "Franja en que el asistente no agenda (fuera de oficina)."
            : "Cambiar el horario envía el aviso de reagenda si lo confirmas."
      }
      testID="hoja-evento"
      footer={
        <View style={styles.pie}>
          {esEdicion ? (
            <Button
              variant="ghost"
              onPress={() => void (esBloqueo ? eliminar() : cancelar())}
              disabled={cargando}
            >
              {esBloqueo ? "Eliminar" : "Cancelar cita"}
            </Button>
          ) : (
            <View />
          )}
          <Button
            loading={cargando}
            onPress={() => void (esBloqueo ? guardarBloqueo() : guardarCita())}
            testID="hoja-evento-guardar"
          >
            {!esEdicion ? (esBloqueo ? "Crear bloqueo" : "Crear cita") : "Guardar"}
          </Button>
        </View>
      }
    >
      {error ? (
        <Text accessibilityRole="alert" style={{ color: c.statusDangerFg }}>
          {error}
        </Text>
      ) : null}

      {!esEdicion ? (
        <View style={styles.segmento} accessibilityRole="radiogroup">
          {(["cita", "bloqueo"] as const).map((opcion) => {
            const activo = queCrear === opcion;
            return (
              <Pressable
                key={opcion}
                testID={`hoja-que-${opcion}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: activo }}
                onPress={() => {
                  setQueCrear(opcion);
                  setError(null);
                }}
                style={[
                  styles.segmentoOpcion,
                  {
                    borderColor: activo ? c.link : c.border,
                    backgroundColor: activo ? c.surfaceRaised : c.surface,
                  },
                ]}
              >
                <Text style={[shType.label, { color: activo ? c.link : c.text }]}>
                  {opcion === "cita" ? "Cita" : "Bloqueo"}
                </Text>
                <Text style={[shType.caption, { color: c.textMuted }]}>
                  {opcion === "cita" ? "Con un cliente y su tipo." : "El asistente no agenda aquí."}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <Text style={[shType.caption, { color: c.textMuted }]}>Horarios en {zona}.</Text>

      {hayVarias && !esEdicion ? (
        <Field label="Agenda" required>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.opciones}>
            {agendas.map((agenda) => (
              <Pressable
                key={agenda.id}
                testID={`hoja-agenda-${agenda.id}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: agendaId === agenda.id }}
                onPress={() => setAgendaId(agenda.id)}
                style={[
                  styles.opcion,
                  {
                    borderColor: agendaId === agenda.id ? c.link : c.border,
                    backgroundColor: agendaId === agenda.id ? c.surfaceRaised : c.surface,
                  },
                ]}
              >
                <Text style={[shType.label, { color: c.text }]}>{agenda.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Field>
      ) : esEdicion && agendaDelEvento ? (
        <Text style={[shType.dense, { color: c.textMuted }]}>
          Agenda: <Text style={{ color: c.text }}>{agendaDelEvento.name}</Text>
        </Text>
      ) : null}

      {esBloqueo ? (
        <>
          <Field label="Motivo">
            <TextField value={motivo} onChangeText={setMotivo} placeholder="Almuerzo, vacaciones…" testID="hoja-motivo" />
          </Field>
          <SelectorFechaHora label="Inicio" valor={inicio} onChange={cambiarInicio} required testID="hoja-inicio" />
          <SelectorFechaHora label="Fin" valor={fin} onChange={setFin} required testID="hoja-fin" />
        </>
      ) : (
        <>
          <Field label="Título" required>
            <TextField value={titulo} onChangeText={setTitulo} testID="hoja-titulo" />
          </Field>

          <Field label="Tipo de cita">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.opciones}>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: !tipoId }}
                onPress={() => cambiarTipo("")}
                style={[
                  styles.opcion,
                  { borderColor: !tipoId ? c.link : c.border, backgroundColor: c.surface },
                ]}
              >
                <Text style={[shType.label, { color: c.text }]}>Sin tipo</Text>
              </Pressable>
              {tipos.map((tipo) => (
                <Pressable
                  key={tipo.id}
                  testID={`hoja-tipo-${tipo.id}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: tipoId === tipo.id }}
                  onPress={() => cambiarTipo(tipo.id)}
                  style={[
                    styles.opcion,
                    {
                      borderColor: tipoId === tipo.id ? c.link : c.border,
                      backgroundColor: tipoId === tipo.id ? c.surfaceRaised : c.surface,
                    },
                  ]}
                >
                  <Text style={[shType.label, { color: c.text }]}>
                    {tipo.codigo || codigoPorDefecto(tipo.name)} · {tipo.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Field>

          <Field label="Cliente (email)" hint="Opcional. Con email le llega la confirmación.">
            <TextField
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              testID="hoja-email"
            />
          </Field>

          <SelectorFechaHora label="Inicio" valor={inicio} onChange={cambiarInicio} required testID="hoja-inicio" />
          <SelectorFechaHora label="Fin" valor={fin} onChange={setFin} required testID="hoja-fin" />
          <View style={styles.duraciones}>
            {DURACIONES.map((minutos) => (
              <Pressable
                key={minutos}
                testID={`hoja-duracion-${minutos}`}
                accessibilityRole="button"
                accessibilityLabel={`${minutos} minutos`}
                onPress={() => setFin(addMinutos(inicio, minutos))}
                style={[styles.duracion, { borderColor: c.border }]}
              >
                <Text style={[shType.caption, { color: c.link }]}>{minutos} min</Text>
              </Pressable>
            ))}
          </View>

          <Field label="Notas">
            <TextField value={notas} onChangeText={setNotas} multiline numberOfLines={3} testID="hoja-notas" />
          </Field>

          <View style={[styles.aviso, { borderColor: c.border }]}>
            <View style={styles.avisoTexto}>
              <Text style={[shType.label, { color: c.text }]}>Avisar al cliente</Text>
              <Text style={[shType.caption, { color: c.textMuted }]}>
                Correo y WhatsApp; a los colaboradores, por correo.
              </Text>
            </View>
            <Switch
              testID="hoja-aviso"
              value={notify}
              onValueChange={setNotify}
              trackColor={{ true: c.link, false: c.controlBorder }}
              thumbColor={c.surface}
            />
          </View>
        </>
      )}

      {puedeAsistencia ? (
        <Seccion titulo="¿El cliente asistió?">
          <View style={styles.fila}>
            <Button variant="secondary" size="sm" onPress={() => void asistencia(true)} disabled={cargando}>
              Asistió
            </Button>
            <Button variant="secondary" size="sm" onPress={() => void asistencia(false)} disabled={cargando}>
              No asistió
            </Button>
          </View>
        </Seccion>
      ) : null}

      {actividades.length > 0 ? (
        <Seccion titulo="Historial">
          {actividades.map((actividad, indice) => (
            <View key={`${actividad.created_at}-${indice}`} style={styles.fila}>
              <Badge
                label={actividad.action}
                tone={actividad.action === "cancelada" ? "danger" : actividad.action === "reprogramada" ? "info" : "success"}
                icon="event-note"
              />
              <Text style={[shType.caption, { color: c.textMuted }]}>
                {actividad.actor === "panel" ? "panel" : "asistente"}
              </Text>
            </View>
          ))}
        </Seccion>
      ) : null}

      {esEdicion && evento?.source === "google" ? (
        <View style={styles.fila}>
          <Icono name="cloud-done" size={16} color={c.textMuted} />
          <Text style={[shType.caption, { color: c.textMuted }]}>También está en Google Calendar.</Text>
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  pie: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flex: 1 },
  segmento: { flexDirection: "row", gap: shSpace[2] },
  segmentoOpcion: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: shSpace[3],
    gap: 2,
  },
  opciones: { gap: shSpace[2], paddingRight: shSpace[2] },
  opcion: { borderWidth: 1, borderRadius: 999, paddingHorizontal: shSpace[3], paddingVertical: shSpace[2] },
  duraciones: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[2] },
  duracion: { borderWidth: 1, borderRadius: 999, paddingHorizontal: shSpace[3], paddingVertical: shSpace[2] },
  aviso: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, padding: shSpace[3], gap: shSpace[3] },
  avisoTexto: { flex: 1, gap: 2 },
  seccion: { gap: shSpace[2], borderTopWidth: 1, borderTopColor: "transparent", paddingTop: shSpace[2] },
  fila: { flexDirection: "row", alignItems: "center", gap: shSpace[2] },
});
