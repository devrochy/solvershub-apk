import { useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { AdminApiError } from "@core/api/admin";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Badge, Button, EmptyState, IconButton, useKit } from "@shared/ui";
import { useAdminApi } from "@core/session/use-admin-api";

import {
  cargarConfigPlugin,
  eliminarAgenda,
  guardarConfigPlugin,
  type CalendarListOut,
  type CalendarOut,
  type CollaboratorItem,
} from "../../api";
import { inicialDeAgenda } from "../../domain/agenda";
import { urlPanelAgenda, urlPanelConexion } from "@shared/panel-urls";
import { FormularioAgenda } from "./FormularioAgenda";

function Muestra({ color }: { color: string }) {
  const { c } = useKit();
  const serie = /^cat-[1-4]$/.test(color) ? Number(color.slice(4)) : null;
  const fondo = serie ? [c.dataCat1, c.dataCat2, c.dataCat3, c.dataCat4][serie - 1] : c.borderStrong;
  return <View style={[styles.muestra, { backgroundColor: fondo }]} />;
}

/** Agendas del negocio dentro del cajón de Ajustes (HU-CAL-08). */
export function SeccionAgendas({
  datos,
  colaboradores,
  zonaNegocio,
  tenantId,
  puedeEscribir,
  config,
  onRefrescar,
}: {
  datos: CalendarListOut;
  colaboradores: CollaboratorItem[];
  zonaNegocio: string;
  tenantId: string | null;
  puedeEscribir: boolean;
  config: Record<string, unknown> | null;
  onRefrescar: () => void;
}) {
  const { c } = useKit();
  const api = useAdminApi();
  const [editando, setEditando] = useState<string | "nueva" | null>(null);
  const [modo, setModo] = useState(datos.multi_agenda_modo);
  const [mover, setMover] = useState<{ agenda: CalendarOut; destino: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const activas = datos.calendars.filter((agenda) => agenda.active);

  async function cambiarModo(encendido: boolean) {
    const nuevo = encendido ? "cliente_elige" : "desactivado";
    const previo = modo;
    setModo(nuevo);
    setError(null);
    setMensaje(null);
    try {
      const actual = config ?? (await cargarConfigPlugin(api, "pack_calendar")).values;
      await guardarConfigPlugin(api, "pack_calendar", { ...actual, multi_agenda_modo: nuevo });
      setMensaje(encendido ? "El cliente elige la agenda." : "Se agenda siempre en la principal.");
      onRefrescar();
    } catch (fallo) {
      setModo(previo);
      setError(fallo instanceof Error ? fallo.message : "No se pudo guardar el cambio.");
    }
  }

  async function eliminar(agenda: CalendarOut, destino?: string) {
    const aceptado = await new Promise<boolean>((resolver) => {
      Alert.alert(
        `Eliminar «${agenda.name}»`,
        agenda.source === "google"
          ? "Se quita la agenda del módulo. La cuenta de Google sigue conectada: se desconecta desde Conexiones."
          : "Se quita la agenda. No se puede deshacer.",
        [
          { text: "Cancelar", style: "cancel", onPress: () => resolver(false) },
          { text: "Eliminar", style: "destructive", onPress: () => resolver(true) },
        ],
        { cancelable: true, onDismiss: () => resolver(false) },
      );
    });
    if (!aceptado) return;
    setError(null);
    try {
      await eliminarAgenda(api, agenda.id, destino);
      setMover(null);
      onRefrescar();
    } catch (fallo) {
      if (fallo instanceof AdminApiError && fallo.status === 409) {
        const otras = datos.calendars.filter((otra) => otra.id !== agenda.id && otra.active);
        if (otras.length > 0) {
          setMover({ agenda, destino: otras[0].id });
          setError("Tiene citas futuras: elige a qué agenda pasarlas para eliminarla.");
          return;
        }
      }
      setError(fallo instanceof Error ? fallo.message : "No se pudo eliminar la agenda.");
    }
  }

  return (
    <View style={styles.contenedor}>
      <View style={[styles.multi, { borderColor: c.border }]}>
        <View style={styles.multiTexto}>
          <Text style={[shType.label, { color: c.text }]}>El cliente elige la agenda</Text>
          <Text style={[shType.caption, { color: c.textMuted }]}>
            Con 2 o más agendas el asistente pregunta con quién quiere la cita. Apagado, agenda siempre en la principal.
          </Text>
          {activas.length < 2 && modo === "cliente_elige" ? (
            <Text style={[shType.caption, { color: c.textMuted }]}>Se activa cuando haya al menos 2 agendas activas.</Text>
          ) : null}
        </View>
        <Switch
          testID="agenda-multi"
          value={modo === "cliente_elige"}
          disabled={!puedeEscribir}
          onValueChange={(valor) => void cambiarModo(valor)}
          trackColor={{ true: c.link, false: c.controlBorder }}
          thumbColor={c.surface}
        />
      </View>

      {error ? (
        <Text accessibilityRole="alert" style={{ color: c.statusDangerFg }}>
          {error}
        </Text>
      ) : null}
      {mensaje ? (
        <Text testID="agenda-multi-mensaje" style={{ color: c.statusSuccessFg }}>
          {mensaje}
        </Text>
      ) : null}

      {datos.calendars.length === 0 ? (
        <EmptyState
          icon="event"
          title="Aún no hay agendas"
          description="Conecta una cuenta de Google Calendar o crea una agenda interna para empezar."
          action={{ label: "Agregar agenda interna", onPress: () => setEditando("nueva") }}
        />
      ) : (
        <View style={[styles.lista, { borderColor: c.border }]}>
          {datos.calendars.map((agenda) => (
            <View key={agenda.id} style={[styles.item, { borderColor: c.borderSoft }]}>
              <View style={styles.fila}>
                <View style={[styles.inicial, { borderColor: c.border }]}>
                  <Muestra color={agenda.color} />
                  <Text style={[shType.caption, { color: c.text }]}>{inicialDeAgenda(agenda.name)}</Text>
                </View>
                <View style={styles.principal}>
                  <Text style={[shType.label, { color: c.text }]} numberOfLines={1}>
                    {agenda.name}
                  </Text>
                  <Text style={[shType.caption, { color: c.textMuted }]} numberOfLines={1}>
                    {agenda.source === "google" ? agenda.account_email || "Google Calendar" : "Agenda interna"}
                    {agenda.description ? ` · ${agenda.description}` : ""}
                  </Text>
                  <View style={styles.badges}>
                    {agenda.is_default ? <Badge label="Principal" tone="accent" /> : null}
                    {!agenda.active ? <Badge label="Inactiva" /> : null}
                    {agenda.source === "google" && !agenda.connected ? (
                      <Badge label="Sin conexión" tone="warning" icon="cloud-off" />
                    ) : null}
                  </View>
                </View>
                {puedeEscribir ? (
                  <View style={styles.acciones}>
                    <IconButton
                      icon="edit"
                      label={`Editar ${agenda.name}`}
                      onPress={() => setEditando(editando === agenda.id ? null : agenda.id)}
                      testID={`agenda-editar-${agenda.id}`}
                    />
                    {!agenda.is_default ? (
                      <IconButton
                        icon="delete-outline"
                        label={`Eliminar ${agenda.name}`}
                        tone="danger"
                        onPress={() => void eliminar(agenda)}
                        testID={`agenda-eliminar-${agenda.id}`}
                      />
                    ) : null}
                  </View>
                ) : null}
              </View>

              {agenda.source === "google" && agenda.connection_id ? (
                <Pressable
                  accessibilityRole="link"
                  onPress={() => void Linking.openURL(urlPanelConexion(agenda.connection_id!))}
                >
                  <Text style={[shType.caption, { color: c.link }]}>Ver la conexión de Google ↗</Text>
                </Pressable>
              ) : null}

              {mover?.agenda.id === agenda.id ? (
                <View style={styles.mover}>
                  <Text style={[shType.caption, { color: c.textMuted }]}>Pasar las citas a:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.opciones}>
                    {datos.calendars
                      .filter((otra) => otra.id !== agenda.id && otra.active)
                      .map((otra) => (
                        <Pressable
                          key={otra.id}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: mover.destino === otra.id }}
                          onPress={() => setMover({ ...mover, destino: otra.id })}
                          style={[
                            styles.opcion,
                            {
                              borderColor: mover.destino === otra.id ? c.link : c.border,
                              backgroundColor: c.surface,
                            },
                          ]}
                        >
                          <Text style={[shType.label, { color: c.text }]}>{otra.name}</Text>
                        </Pressable>
                      ))}
                  </ScrollView>
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => void eliminar(agenda, mover.destino)}
                    testID={`agenda-mover-${agenda.id}`}
                  >
                    Pasar las citas y eliminar
                  </Button>
                </View>
              ) : null}

              {editando === agenda.id ? (
                <View style={[styles.formulario, { borderColor: c.borderSoft }]}>
                  <FormularioAgenda
                    key={agenda.id}
                    agenda={agenda}
                    colaboradores={colaboradores}
                    zonaNegocio={zonaNegocio}
                    puedeEscribir={puedeEscribir}
                    onGuardado={() => {
                      setEditando(null);
                      onRefrescar();
                    }}
                    onCancelar={() => setEditando(null)}
                  />
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {puedeEscribir ? (
        <View style={styles.botones}>
          <Button
            variant="secondary"
            size="sm"
            onPress={() => void Linking.openURL(urlPanelAgenda(tenantId, "agendas"))}
            testID="agenda-conectar-google"
          >
            Conectar otra cuenta de Google ↗
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onPress={() => setEditando(editando === "nueva" ? null : "nueva")}
            testID="agenda-nueva-interna"
          >
            Agregar agenda interna
          </Button>
        </View>
      ) : (
        <Text style={[shType.caption, { color: c.textMuted }]}>No tienes permiso para editar las agendas.</Text>
      )}

      {editando === "nueva" ? (
        <View style={[styles.formulario, { borderColor: c.border }]}>
          <FormularioAgenda
            key="nueva"
            colaboradores={colaboradores}
            zonaNegocio={zonaNegocio}
            puedeEscribir={puedeEscribir}
            onGuardado={() => {
              setEditando(null);
              onRefrescar();
            }}
            onCancelar={() => setEditando(null)}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: shSpace[3] },
  multi: { flexDirection: "row", alignItems: "flex-start", borderWidth: 1, borderRadius: 10, padding: shSpace[3], gap: shSpace[3] },
  multiTexto: { flex: 1, gap: 2 },
  lista: { borderWidth: 1, borderRadius: shRadius.sm, overflow: "hidden" },
  item: { borderTopWidth: 1, padding: shSpace[3], gap: shSpace[2] },
  fila: { flexDirection: "row", alignItems: "center", gap: shSpace[2] },
  inicial: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  principal: { flex: 1, gap: 1 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[1], marginTop: 2 },
  acciones: { flexDirection: "row" },
  muestra: { width: 10, height: 4, borderRadius: 2 },
  mover: { gap: shSpace[2] },
  opciones: { gap: shSpace[2], paddingRight: shSpace[2] },
  opcion: { borderWidth: 1, borderRadius: 999, paddingHorizontal: shSpace[3], paddingVertical: shSpace[2] },
  formulario: { borderTopWidth: 1, paddingTop: shSpace[3] },
  botones: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[2] },
});
