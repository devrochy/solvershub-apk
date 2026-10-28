import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Icono, useKit } from "@shared/ui";
import type { MessageItem } from "../api";
import { formatearFechaHora } from "../presentacion";

const REMITENTE: Record<string, string> = {
  customer: "Cliente",
  agent: "Agente",
  human: "Equipo",
};

/** Una burbuja del hilo: entrante a la izquierda, saliente a la derecha. */
export function BurbujaMensaje({ mensaje }: { mensaje: MessageItem }) {
  const { c, relleno } = useKit();
  const [herramientasAbiertas, setHerramientasAbiertas] = useState(false);
  const entrante = mensaje.direction === "inbound" || mensaje.direction === "in";
  const herramientas = mensaje.tool_calls ?? [];
  const fallida = mensaje.status === "failed";
  const remitente = REMITENTE[mensaje.sender_type] ?? mensaje.sender_type;

  return (
    <View style={[styles.fila, entrante ? styles.izquierda : styles.derecha]}>
      <Text style={[shType.caption, { color: c.textSoft }]} maxFontSizeMultiplier={1.6}>
        {remitente} · {formatearFechaHora(mensaje.created_at)}
      </Text>

      <View
        style={[
          styles.burbuja,
          {
            backgroundColor: entrante ? c.surface2 : relleno.primario,
            borderColor: entrante ? c.borderSoft : relleno.primario,
            borderBottomLeftRadius: entrante ? shRadius.sm : shRadius.lg,
            borderBottomRightRadius: entrante ? shRadius.lg : shRadius.sm,
          },
        ]}
      >
        <Text style={[shType.body, { color: entrante ? c.text : relleno.sobrePrimario }]}>
          {mensaje.content || "(sin texto)"}
        </Text>
      </View>

      {herramientas.length > 0 ? (
        <View style={styles.herramientas}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: herramientasAbiertas }}
            accessibilityLabel={
              herramientas.length === 1 ? "Usó 1 herramienta" : `Usó ${herramientas.length} herramientas`
            }
            onPress={() => setHerramientasAbiertas((abiertas) => !abiertas)}
            style={styles.botonHerramientas}
            testID={`herramientas-${mensaje.id}`}
          >
            <Icono name="build" size={13} color={c.textSoft} />
            <Text style={[shType.caption, { color: c.textSoft }]}>
              {herramientas.length === 1 ? "Usó 1 herramienta" : `Usó ${herramientas.length} herramientas`}
            </Text>
            <Icono
              name={herramientasAbiertas ? "expand-less" : "expand-more"}
              size={16}
              color={c.textSoft}
            />
          </Pressable>
          {herramientasAbiertas ? (
            <View style={[styles.listaHerramientas, { backgroundColor: c.surface2, borderColor: c.borderSoft }]}>
              {herramientas.map((nombre, i) => (
                <Text key={`${nombre}-${i}`} style={[shType.caption, styles.herramienta, { color: c.textMuted }]}>
                  {nombre}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {mensaje.template_name ? (
        <Text style={[shType.caption, { color: c.textSoft }]}>Plantilla: {mensaje.template_name}</Text>
      ) : null}

      {fallida ? (
        <Text style={[shType.caption, { color: c.statusDangerFg }]}>
          {mensaje.error_reason === "sin_plantilla"
            ? "No enviado: el cliente llevaba más de 24 h sin escribir y el aviso no tiene plantilla."
            : "No enviado."}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { maxWidth: "84%", gap: 2 },
  izquierda: { alignSelf: "flex-start", alignItems: "flex-start" },
  derecha: { alignSelf: "flex-end", alignItems: "flex-end" },
  burbuja: {
    borderWidth: 1,
    borderRadius: shRadius.lg,
    paddingHorizontal: shSpace[3],
    paddingVertical: shSpace[2],
  },
  herramientas: { gap: shSpace[1] },
  botonHerramientas: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[1],
    minHeight: 32,
    paddingHorizontal: shSpace[1],
  },
  listaHerramientas: {
    borderWidth: 1,
    borderRadius: shRadius.sm,
    paddingHorizontal: shSpace[3],
    paddingVertical: shSpace[2],
    gap: 2,
  },
  herramienta: { fontFamily: shType.mono.fontFamily },
});
