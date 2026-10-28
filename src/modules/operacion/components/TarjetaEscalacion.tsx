import { Pressable, StyleSheet, Text, View } from "react-native";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Avatar, Button, useKit } from "@shared/ui";
import type { EscalationItem } from "../api";
import {
  estadoDeEscalacion,
  etiquetaDelMotivo,
  formatearFechaHora,
  nombreDelChat,
  tonoDelMotivo,
} from "../presentacion";
import { BadgeEstado } from "./BadgeEstado";

/** Tarjeta de una escalación: cliente, motivo, resumen, estado y fecha. */
export function TarjetaEscalacion({
  escalacion,
  onAbrir,
  onVerResumen,
}: {
  escalacion: EscalationItem;
  onAbrir: () => void;
  onVerResumen: () => void;
}) {
  const { c, ripple } = useKit();
  const nombre = nombreDelChat(escalacion);
  const estado = estadoDeEscalacion(escalacion.status);
  const motivo = etiquetaDelMotivo(escalacion);
  const tono = tonoDelMotivo(escalacion.reason_code);

  return (
    <View style={[styles.tarjeta, { borderColor: c.borderSoft, backgroundColor: c.surface }]}>
      <Pressable
        testID={`escalacion-${escalacion.conversation_id}`}
        accessibilityRole="button"
        accessibilityLabel={`${nombre}, ${motivo}, ${estado.label}`}
        accessibilityHint="Abrir la conversación"
        onPress={onAbrir}
        android_ripple={{ color: ripple.superficie }}
        style={({ pressed }) => [styles.principal, pressed && { backgroundColor: c.hover }]}
      >
        <Avatar name={nombre} size="md" />
        <View style={styles.cuerpo}>
          <View style={styles.fila}>
            <Text style={[shType.label, styles.nombre, { color: c.text }]} numberOfLines={1}>
              {nombre}
            </Text>
            <BadgeEstado label={estado.label} tone={estado.tone} icon={estado.icon} />
          </View>
          <View style={styles.fila}>
            <BadgeEstado label={motivo} tone={tono} icon="flag" />
            <Text style={[shType.caption, { color: c.textSoft }]} maxFontSizeMultiplier={1.6}>
              {formatearFechaHora(escalacion.created_at)}
            </Text>
          </View>
          <Text style={[shType.dense, { color: c.textMuted }]} numberOfLines={2}>
            {escalacion.summary || "Sin resumen."}
          </Text>
        </View>
      </Pressable>
      <View style={[styles.pie, { borderTopColor: c.borderSoft }]}>
        <Button variant="link" size="sm" onPress={onVerResumen} testID={`escalacion-resumen-${escalacion.conversation_id}`}>
          Ver resumen
        </Button>
        <Button variant="link" size="sm" iconRight="arrow-forward" onPress={onAbrir}>
          Abrir conversación
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    borderWidth: 1,
    borderRadius: shRadius.md,
    overflow: "hidden",
  },
  principal: {
    flexDirection: "row",
    gap: shSpace[3],
    padding: shSpace[3],
  },
  cuerpo: { flex: 1, gap: 4 },
  fila: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: shSpace[2] },
  nombre: { flexShrink: 1 },
  pie: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: shSpace[1],
    borderTopWidth: 1,
    paddingHorizontal: shSpace[2],
  },
});
