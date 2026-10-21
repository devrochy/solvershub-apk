import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "@core/theme/theme-context";
import { useAdminApi } from "@core/session/use-admin-api";
import {
  agregarNota,
  borrarNota,
  historiaDelCliente,
  notasDelCliente,
  TIPO_DE_EVENTO,
  type EventoDelCliente,
  type NotaDelCliente,
} from "../api";

/**
 * Notas del equipo e historia del cliente en la ficha de la app (HU-CRM-04). Misma API que el
 * panel: la nota la ve todo el equipo y el agente la tiene en cuenta.
 */
export function NotasYHistoria({
  leadId,
  onAbrirConversacion,
}: {
  leadId: string;
  onAbrirConversacion: (conversacionId: string) => void;
}) {
  const { colores } = useTheme();
  const api = useAdminApi();
  const [notas, setNotas] = useState<NotaDelCliente[]>([]);
  const [eventos, setEventos] = useState<EventoDelCliente[]>([]);
  const [siguiente, setSiguiente] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [n, h] = await Promise.all([notasDelCliente(api, leadId), historiaDelCliente(api, leadId)]);
      setNotas(n);
      setEventos(h.items);
      setSiguiente(h.next_cursor);
      setError(null);
    } catch {
      setError("No pudimos cargar las notas y la historia.");
    }
  }, [api, leadId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial: los setState ocurren después del await (no síncronos)
    void cargar();
  }, [cargar]);

  const guardar = async () => {
    const limpio = texto.trim();
    if (!limpio || guardando) return;
    setGuardando(true);
    try {
      await agregarNota(api, leadId, limpio);
      setTexto("");
      await cargar();
    } catch {
      setError("No se pudo guardar la nota.");
    } finally {
      setGuardando(false);
    }
  };

  const quitar = async (id: string) => {
    try {
      await borrarNota(api, leadId, id);
      await cargar();
    } catch {
      setError("No se pudo borrar la nota.");
    }
  };

  const verMas = async () => {
    if (!siguiente) return;
    try {
      const h = await historiaDelCliente(api, leadId, siguiente);
      setEventos((prev) => [...prev, ...h.items]);
      setSiguiente(h.next_cursor);
    } catch {
      setError("No se pudo cargar más historia.");
    }
  };

  return (
    <View style={styles.contenedor}>
      {error && <Text style={{ color: colores.peligro, fontSize: 13 }}>{error}</Text>}

      <Text style={[styles.seccion, { color: colores.texto }]}>Notas del equipo</Text>
      <TextInput
        testID="nota-nueva"
        value={texto}
        onChangeText={setTexto}
        maxLength={2000}
        multiline
        placeholder="Ej.: prefiere entregas en la tarde"
        placeholderTextColor={colores.textoSuave}
        style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]}
      />
      <Text style={{ color: colores.textoSuave, fontSize: 11 }}>
        La ve todo el equipo y el agente la tiene en cuenta. No anotes datos de salud, de pago ni contraseñas.
      </Text>
      <Pressable
        testID="nota-guardar"
        accessibilityRole="button"
        disabled={!texto.trim() || guardando}
        onPress={() => void guardar()}
        style={[styles.boton, { backgroundColor: colores.primario, opacity: !texto.trim() || guardando ? 0.5 : 1 }]}
      >
        <Text style={{ color: colores.sobrePrimario, fontWeight: "700" }}>{guardando ? "Guardando…" : "Guardar nota"}</Text>
      </Pressable>
      {notas.map((n) => (
        <View
          key={n.id}
          testID={`nota-${n.id}`}
          style={[styles.tarjeta, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
        >
          <Text style={{ color: colores.texto }}>{n.text}</Text>
          <View style={styles.pie}>
            <Text style={{ color: colores.textoSuave, fontSize: 11 }}>
              {n.author} · {n.created_at.slice(0, 10)}
            </Text>
            {n.puede_borrar && (
              <Pressable accessibilityRole="button" onPress={() => void quitar(n.id)}>
                <Text style={{ color: colores.primario, fontSize: 12 }}>Borrar</Text>
              </Pressable>
            )}
          </View>
        </View>
      ))}

      <Text style={[styles.seccion, { color: colores.texto }]}>Historia</Text>
      {eventos.length === 0 && <Text style={{ color: colores.textoSuave }}>Sin movimientos todavía.</Text>}
      {eventos.map((e, i) => {
        const conversacion = e.link_kind === "conversation" && e.link_id ? e.link_id : null;
        return (
          <Pressable
            key={`${e.kind}-${e.at}-${i}`}
            testID={`evento-${i}`}
            disabled={!conversacion}
            onPress={() => conversacion && onAbrirConversacion(conversacion)}
            style={[styles.evento, { borderColor: colores.borde }]}
          >
            <Text style={{ color: colores.textoSuave, fontSize: 11 }}>
              {TIPO_DE_EVENTO[e.kind] ?? e.kind} · {e.at.slice(0, 16).replace("T", " ")}
            </Text>
            <Text style={{ color: conversacion ? colores.primario : colores.texto }}>{e.title}</Text>
            {e.detail ? <Text style={{ color: colores.textoSuave, fontSize: 12 }}>{e.detail}</Text> : null}
          </Pressable>
        );
      })}
      {siguiente && (
        <Pressable testID="historia-mas" accessibilityRole="button" onPress={() => void verMas()} style={styles.mas}>
          <Text style={{ color: colores.primario, fontWeight: "600" }}>Ver más</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: 8 },
  seccion: { fontSize: 15, fontWeight: "700", marginTop: 8 },
  campo: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, minHeight: 60 },
  boton: { alignSelf: "flex-end", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  tarjeta: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 4 },
  pie: { flexDirection: "row", justifyContent: "space-between" },
  evento: { borderLeftWidth: 2, paddingLeft: 10, paddingVertical: 4 },
  mas: { paddingVertical: 8 },
});
