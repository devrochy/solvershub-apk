import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useIsFocused } from "@react-navigation/native";
import { shSpace, shType } from "@core/theme/tokens";
import { AdminApiError } from "@core/api/admin";
import { useAdminApi } from "@core/session/use-admin-api";
import { Button, EmptyState, Sheet, useKit } from "@shared/ui";
import {
  agregarNotaConversacion,
  alternarBot,
  detalleConversacion,
  devolverAlAgente,
  resolverConversacion,
  responderConversacion,
  tomarConversacion,
  type ConversationDetail,
} from "../api";
import { nombreDelChat } from "../presentacion";
import { useDetalleEnVivo } from "../use-en-vivo";
import { ChatHeader } from "../components/ChatHeader";
import { Composer } from "../components/Composer";
import { HiloMensajes } from "../components/HiloMensajes";
import { NotasInternas } from "../components/NotasInternas";
import { SelectorPlantilla } from "../components/SelectorPlantilla";
import { TicketEscalacion } from "../components/TicketEscalacion";
import type { OperacionStackParamList } from "../navigation";

type Props = NativeStackScreenProps<OperacionStackParamList, "ConversacionDetalle">;

function mensajeDeError(error: unknown, porDefecto: string): string {
  if (error instanceof AdminApiError) {
    if (error.code === "already_taken" || error.code === "no_escalation") return error.message;
    if (error.code === "connection_paused") return error.message;
    return error.message || porDefecto;
  }
  return porDefecto;
}

/** Carga inicial del detalle; una vez listo, el contenido se actualiza solo. */
export function ConversacionDetalleScreen({ route, navigation }: Props) {
  const { c } = useKit();
  const api = useAdminApi();
  const { id } = route.params;
  const [detalle, setDetalle] = useState<ConversationDetail | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setDetalle(await detalleConversacion(api, id));
      setError(null);
    } catch {
      setError("No pudimos cargar la conversación. Revisa tu conexión.");
    } finally {
      setCargando(false);
    }
  }, [api, id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la carga inicial ocurre tras el await
    void cargar();
  }, [cargar]);

  if (cargando) {
    return (
      <View style={[styles.centro, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.link} />
        <Text style={[shType.caption, { color: c.textSoft }]}>Cargando conversación…</Text>
      </View>
    );
  }

  if (!detalle) {
    return (
      <View style={[styles.centro, { backgroundColor: c.bg }]}>
        <EmptyState
          icon="wifi-off"
          title="No pudimos abrir la conversación"
          description={error ?? "Intenta de nuevo."}
          action={{ label: "Reintentar", onPress: () => void cargar() }}
          testID="detalle-error-vacio"
        />
      </View>
    );
  }

  return <ConversacionDetalleContenido inicial={detalle} id={id} navigation={navigation} />;
}

function ConversacionDetalleContenido({
  inicial,
  id,
  navigation,
}: {
  inicial: ConversationDetail;
  id: string;
  navigation: Props["navigation"];
}) {
  const { c } = useKit();
  const insets = useSafeAreaInsets();
  const api = useAdminApi();
  const enfocada = useIsFocused();
  const { detalle, recargar } = useDetalleEnVivo(api, id, inicial, enfocada);

  const [respuesta, setRespuesta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [accionEnCurso, setAccionEnCurso] = useState(false);
  const [ventanaVencida, setVentanaVencida] = useState(false);
  const [accionesAbiertas, setAccionesAbiertas] = useState(false);
  const [notasAbiertas, setNotasAbiertas] = useState(false);
  const [plantillasAbiertas, setPlantillasAbiertas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const nombre = nombreDelChat(detalle);
  const atiendePersona = detalle.escalation?.status === "asignada";
  const puedeResponder = atiendePersona || detalle.bot_paused;

  function limpiarMensajes() {
    setError(null);
    setExito(null);
  }

  async function enviar() {
    const texto = respuesta.trim();
    if (!texto || enviando) return;
    limpiarMensajes();
    setEnviando(true);
    try {
      await responderConversacion(api, id, texto);
      setRespuesta("");
      setVentanaVencida(false);
      setExito("Mensaje enviado.");
      await recargar();
    } catch (fallo) {
      if (fallo instanceof AdminApiError && fallo.code === "window_expired") {
        setVentanaVencida(true);
      } else {
        setError(mensajeDeError(fallo, "No se pudo enviar el mensaje."));
      }
    } finally {
      setEnviando(false);
    }
  }

  async function alternar() {
    if (accionEnCurso) return;
    limpiarMensajes();
    setAccionEnCurso(true);
    setAccionesAbiertas(false);
    try {
      await alternarBot(api, id);
      await recargar();
      setExito(detalle.bot_paused ? "Agente reanudado." : "Agente pausado.");
    } catch (fallo) {
      setError(mensajeDeError(fallo, "No se pudo cambiar el estado del agente."));
    } finally {
      setAccionEnCurso(false);
    }
  }

  function resolver() {
    setAccionesAbiertas(false);
    Alert.alert(
      "Resolver conversación",
      "Se cerrará la conversación y el cliente dejará de recibir respuestas del asistente.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Resolver",
          style: "destructive",
          onPress: () => {
            limpiarMensajes();
            setAccionEnCurso(true);
            void resolverConversacion(api, id)
              .then(async () => {
                await recargar();
                setExito("Conversación resuelta.");
              })
              .catch((fallo: unknown) =>
                setError(mensajeDeError(fallo, "No se pudo resolver la conversación.")),
              )
              .finally(() => setAccionEnCurso(false));
          },
        },
      ],
    );
  }

  async function tomar() {
    if (accionEnCurso) return;
    limpiarMensajes();
    setAccionEnCurso(true);
    try {
      await tomarConversacion(api, id);
      await recargar();
      setExito("Tomaste la conversación. El agente queda en pausa en este chat.");
    } catch (fallo) {
      setError(mensajeDeError(fallo, "No se pudo tomar la conversación."));
      if (fallo instanceof AdminApiError && fallo.code === "already_taken") {
        await recargar().catch(() => undefined);
      }
    } finally {
      setAccionEnCurso(false);
    }
  }

  function devolver() {
    Alert.alert(
      "Devolver al agente",
      "Se cierra la atención de una persona y el agente vuelve a responder en esta conversación.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Devolver al agente",
          style: "destructive",
          onPress: () => {
            limpiarMensajes();
            setAccionEnCurso(true);
            void devolverAlAgente(api, id)
              .then(async () => {
                await recargar();
                setExito("El agente vuelve a atender esta conversación.");
              })
              .catch((fallo: unknown) =>
                setError(mensajeDeError(fallo, "No se pudo devolver al agente.")),
              )
              .finally(() => setAccionEnCurso(false));
          },
        },
      ],
    );
  }

  async function guardarNota(texto: string) {
    await agregarNotaConversacion(api, id, texto);
    await recargar();
    setExito("Nota guardada.");
  }

  function abrirNotas() {
    setAccionesAbiertas(false);
    setNotasAbiertas(true);
  }

  function abrirPlantillas() {
    limpiarMensajes();
    setVentanaVencida(true);
    setPlantillasAbiertas(true);
  }

  function verFicha() {
    setAccionesAbiertas(false);
    if (!detalle.customer_id) return;
    navigation.navigate("ClienteDetalle", { id: detalle.customer_id, titulo: nombre });
  }

  return (
    <KeyboardAvoidingView
      style={[styles.raiz, { backgroundColor: c.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ChatHeader detalle={detalle} onAbrirMas={() => setAccionesAbiertas(true)} />

      {detalle.escalation ? (
        <View style={styles.ticket}>
          <TicketEscalacion
            detalle={detalle}
            onTomar={() => void tomar()}
            onDevolver={devolver}
            ocupado={accionEnCurso}
          />
        </View>
      ) : null}

      {error ? (
        <Text
          testID="detalle-error"
          accessibilityLiveRegion="polite"
          style={[shType.caption, styles.aviso, { color: c.statusDangerFg }]}
        >
          {error}
        </Text>
      ) : null}
      {exito ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[shType.caption, styles.aviso, { color: c.statusSuccessFg }]}
        >
          {exito}
        </Text>
      ) : null}

      <HiloMensajes mensajes={detalle.messages} />

      <View
        style={[
          styles.pie,
          {
            borderColor: c.borderSoft,
            paddingBottom: insets.bottom + shSpace[2],
          },
        ]}
      >
        {!puedeResponder ? (
          <View style={styles.sinComposer}>
            <Text style={[shType.caption, styles.textoSinComposer, { color: c.textSoft }]}>
              {detalle.escalation
                ? "Toma la conversación para responder como persona."
                : "El agente está atendiendo esta conversación."}
            </Text>
            {!detalle.escalation ? (
              <Button
                size="sm"
                variant="secondary"
                onPress={() => void alternar()}
                disabled={accionEnCurso}
                testID="detalle-pausar-agente"
              >
                Pausar agente
              </Button>
            ) : null}
          </View>
        ) : null}

        {ventanaVencida ? (
          <View style={[styles.avisoPlantilla, { backgroundColor: c.statusWarningBg, borderColor: c.statusWarningBorder }]}>
            <Text style={[shType.caption, { color: c.statusWarningFg }]}>
              La ventana de 24 h expiró: WhatsApp solo permite responder con una plantilla aprobada.
            </Text>
            <Button size="sm" variant="secondary" onPress={abrirPlantillas} testID="detalle-abrir-plantilla">
              Elegir plantilla
            </Button>
          </View>
        ) : null}

        {puedeResponder ? (
          <Composer
            valor={respuesta}
            onChange={setRespuesta}
            onEnviar={() => void enviar()}
            enviando={enviando}
          />
        ) : null}
      </View>

      <SheetAcciones
        visible={accionesAbiertas}
        onClose={() => setAccionesAbiertas(false)}
        detalle={detalle}
        accionEnCurso={accionEnCurso}
        onAlternar={() => void alternar()}
        onResolver={resolver}
        onNotas={abrirNotas}
        onPlantilla={abrirPlantillas}
        onVerFicha={verFicha}
      />

      <NotasInternas
        visible={notasAbiertas}
        onClose={() => setNotasAbiertas(false)}
        notas={detalle.notes ?? []}
        onGuardar={guardarNota}
      />

      <SelectorPlantilla
        visible={plantillasAbiertas}
        onClose={() => setPlantillasAbiertas(false)}
        conversationId={id}
        onEnviado={() => {
          setVentanaVencida(false);
          setRespuesta("");
          setExito("Plantilla enviada.");
          void recargar();
        }}
      />
    </KeyboardAvoidingView>
  );
}

function SheetAcciones({
  visible,
  onClose,
  detalle,
  accionEnCurso,
  onAlternar,
  onResolver,
  onNotas,
  onPlantilla,
  onVerFicha,
}: {
  visible: boolean;
  onClose: () => void;
  detalle: ConversationDetail;
  accionEnCurso: boolean;
  onAlternar: () => void;
  onResolver: () => void;
  onNotas: () => void;
  onPlantilla: () => void;
  onVerFicha: () => void;
}) {
  const { c } = useKit();
  const notas = detalle.notes?.length ?? 0;
  const etiquetaNotas = notas ? `Notas internas (${notas})` : "Notas internas";

  return (
    <Sheet visible={visible} onClose={onClose} title="Acciones de la conversación" testID="sheet-acciones">
      <Button
        variant="secondary"
        fullWidth
        iconLeft={detalle.bot_paused ? "play-arrow" : "pause"}
        onPress={onAlternar}
        disabled={accionEnCurso}
        testID="detalle-toggle-bot"
      >
        {detalle.bot_paused ? "Reanudar agente" : "Pausar agente"}
      </Button>
      <Button
        variant="secondary"
        fullWidth
        iconLeft="check-circle-outline"
        onPress={onResolver}
        disabled={detalle.status === "closed" || accionEnCurso}
        testID="detalle-resolver"
      >
        Resolver conversación
      </Button>
      <Button
        variant="secondary"
        fullWidth
        iconLeft="note"
        onPress={onNotas}
        testID="detalle-notas"
      >
        {etiquetaNotas}
      </Button>
      <Button
        variant="secondary"
        fullWidth
        iconLeft="description"
        onPress={onPlantilla}
        testID="detalle-plantilla"
      >
        Responder con plantilla
      </Button>
      {detalle.customer_id ? (
        <Button
          variant="secondary"
          fullWidth
          iconLeft="person"
          onPress={onVerFicha}
          testID="detalle-ver-ficha"
        >
          Ver ficha del cliente
        </Button>
      ) : null}
      <Text style={[shType.caption, { color: c.textSoft }]}>
        El agente {detalle.bot_paused ? "está pausado" : "está activo"} en este chat.
      </Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", gap: shSpace[2] },
  ticket: { paddingHorizontal: shSpace[3], paddingTop: shSpace[3] },
  aviso: { paddingHorizontal: shSpace[4], paddingTop: shSpace[1] },
  pie: { borderTopWidth: 1 },
  sinComposer: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[2],
    paddingHorizontal: shSpace[3],
    paddingTop: shSpace[2],
  },
  textoSinComposer: { flex: 1 },
  avisoPlantilla: {
    gap: shSpace[2],
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: shSpace[3],
    marginTop: shSpace[2],
    padding: shSpace[3],
  },
});
