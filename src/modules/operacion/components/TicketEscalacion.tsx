import { StyleSheet, Text, View } from "react-native";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { useKit } from "@shared/ui";
import type { ConversationDetail } from "../api";
import { BadgeEstado } from "./BadgeEstado";
import { etiquetaDelMotivo, tonoDelMotivo } from "../presentacion";

/** Ticket de la escalación activa: motivo, quién atiende y el resumen. Las acciones viven en la cabecera. */
export function TicketEscalacion({ detalle }: { detalle: ConversationDetail }) {
  const { tonos } = useKit();
  const esc = detalle.escalation;
  if (!esc) return null;

  const atendida = esc.status === "asignada";
  const quien = esc.assigned_admin_email ?? "una persona del equipo";
  const tono = tonos[tonoDelMotivo(esc.reason_code)];

  return (
    <View
      accessibilityLabel={`Escalación: ${etiquetaDelMotivo(esc)}`}
      style={[
        styles.tarjeta,
        { backgroundColor: tono.bg, borderColor: tono.border },
      ]}
    >
      <View style={styles.fila}>
        <BadgeEstado
          label={etiquetaDelMotivo(esc)}
          tone={tonoDelMotivo(esc.reason_code)}
          icon="flag"
          testID="detalle-motivo"
        />
        <Text style={[shType.dense, styles.quien, { color: tono.fg }]}>
          {atendida ? `La atiende ${quien}` : "Esperando a una persona del equipo"}
        </Text>
      </View>

      {esc.summary ? (
        <Text style={[shType.dense, { color: tono.fg }]} numberOfLines={4}>
          {esc.summary}
        </Text>
      ) : null}

    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    gap: shSpace[2],
    borderWidth: 1,
    borderRadius: shRadius.md,
    padding: shSpace[3],
  },
  fila: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: shSpace[2] },
  quien: { flexShrink: 1 },
});
