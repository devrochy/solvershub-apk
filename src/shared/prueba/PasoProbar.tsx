import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AdminApiError } from "@core/api/admin";
import { useAdminApi } from "@core/session/use-admin-api";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Button, Chip, TextField, useKit } from "@shared/ui";
import { cargarPrueba, cerrarPrueba, enviarPrueba, reiniciarPrueba, type DestinoDePrueba, type TurnoDePrueba } from "./api";

export interface PasoProbarProps {
  /** Conexión de pruebas (bienvenida) o borrador del agente (Nuevo agente). */
  destino: DestinoDePrueba;
  nombre: string;
  sugerencias: readonly string[];
  /** Llega una respuesta del agente que no pasó a una persona: cuenta como prueba. */
  alRecibir?: (turnos: TurnoDePrueba[]) => void;
  /** Prefijo de los testID (`onb` en la bienvenida, `asistente` en Nuevo agente). */
  prefijo?: string;
}

/**
 * Chat de prueba real de la estación 5 (HU-APP-23; antes dentro de `RecorridoScreen`): habla con el agente por
 * `/admin/playground`. Las frases sugeridas se tocan para enviarlas y «Empezar de nuevo» limpia la conversación.
 */
export function PasoProbar({ destino, nombre, sugerencias, alRecibir, prefijo = "prueba" }: PasoProbarProps) {
  const api = useAdminApi();
  const { c, tonos } = useKit();
  const [turnos, setTurnos] = useState<TurnoDePrueba[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  // El historial del servidor trae solo las respuestas del agente: lo escrito aquí se muestra en su turno.
  const [mios, setMios] = useState<string[]>([]);
  // Respuestas que ya había al abrir el paso: lo escrito aquí empieza después de ellas.
  const [previos, setPrevios] = useState(0);
  const clave = JSON.stringify(destino);

  useEffect(() => {
    let vivo = true;
    const d = JSON.parse(clave) as DestinoDePrueba;
    cargarPrueba(api, d)
      .then((t) => {
        if (!vivo) return;
        setPrevios(t.length);
        setTurnos(t);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
      void cerrarPrueba(api, d).catch(() => undefined);
    };
  }, [api, clave]);

  async function enviar(mensaje: string) {
    const limpio = mensaje.trim();
    if (!limpio || enviando) return;
    setEnviando(true);
    setAviso(null);
    setTexto("");
    setMios((m) => [...m, limpio]);
    try {
      await enviarPrueba(api, destino, limpio);
      const t = await cargarPrueba(api, destino);
      setTurnos(t);
      // Solo cuenta una respuesta del agente: si pasó a una persona (falló el modelo, p. ej.) no hubo prueba.
      if (t.some((x) => !x.escalated)) alRecibir?.(t);
    } catch (e) {
      setAviso(e instanceof AdminApiError ? e.message : "No pudimos enviar tu mensaje. Inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={styles.bloque}>
      <Text style={[shType.body, { color: c.textMuted }]}>
        Escríbele a {nombre} como lo haría un cliente. Es un chat de prueba: nadie más lo ve.
      </Text>
      <View style={styles.chips}>
        {sugerencias.map((s) => (
          <Chip key={s} titulo={s} rol="button" elegido={false} onPress={() => void enviar(s)} testID={`${prefijo}-prueba-${s}`} />
        ))}
      </View>
      <View style={styles.bloque} testID={`${prefijo}-chat`}>
        {turnos.map((t, i) => (
          <View key={i} style={styles.bloque}>
            {i >= previos && mios[i - previos] ? (
              <View
                style={[styles.burbuja, styles.mia, { borderColor: c.link }]}
                accessible
                accessibilityLabel={`Tú: ${mios[i - previos]}`}
              >
                <Text style={[shType.body, { color: c.text }]}>{mios[i - previos]}</Text>
              </View>
            ) : null}
            <View
              style={[styles.burbuja, { borderColor: c.border, backgroundColor: c.surface2 }]}
              accessible
              accessibilityLabel={`${nombre}: ${t.text}`}
            >
              <Text style={[shType.body, { color: c.text }]}>{t.text}</Text>
            </View>
          </View>
        ))}
        {enviando ? <ActivityIndicator accessibilityLabel={`${nombre} está escribiendo`} /> : null}
      </View>
      {aviso ? (
        <Text style={[shType.body, { color: tonos.danger.fg }]} accessibilityRole="alert">
          {aviso}
        </Text>
      ) : null}
      <TextField
        testID={`${prefijo}-prueba-texto`}
        accessibilityLabel="Mensaje de prueba"
        placeholder="Escribe un mensaje"
        value={texto}
        onChangeText={setTexto}
        returnKeyType="send"
        onSubmitEditing={() => void enviar(texto)}
      />
      <View style={styles.acciones}>
        <Button testID={`${prefijo}-prueba-enviar`} onPress={() => void enviar(texto)} loading={enviando} disabled={!texto.trim()}>
          Enviar
        </Button>
        <Button
          variant="ghost"
          onPress={() => {
            void reiniciarPrueba(api, destino)
              .then(() => {
                setTurnos([]);
                setMios([]);
                setPrevios(0);
              })
              .catch(() => undefined);
          }}
          disabled={enviando || turnos.length === 0}
        >
          Empezar de nuevo
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bloque: { gap: shSpace[3] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[2] },
  acciones: { flexDirection: "row", gap: shSpace[2], alignItems: "center" },
  mia: { alignSelf: "flex-end", maxWidth: "85%" },
  burbuja: { padding: shSpace[3], borderWidth: 1, borderRadius: shRadius.md },
});
