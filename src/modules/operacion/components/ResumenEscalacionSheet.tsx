import { StyleSheet, Text, View } from "react-native";
import { shSpace, shType } from "@core/theme/tokens";
import { Button, Sheet, useKit } from "@shared/ui";
import type { EscalationItem } from "../api";
import {
  estadoDeEscalacion,
  etiquetaDelMotivo,
  formatearFechaHora,
  nombreDelChat,
  tonoDelMotivo,
} from "../presentacion";
import { BadgeEstado } from "./BadgeEstado";

/** Resumen completo de una escalación, sin salir de la pestaña. */
export function ResumenEscalacionSheet({
  escalacion,
  visible,
  onClose,
  onAbrir,
}: {
  escalacion: EscalationItem | null;
  visible: boolean;
  onClose: () => void;
  onAbrir: () => void;
}) {
  const { c } = useKit();
  if (!escalacion) return null;
  const estado = estadoDeEscalacion(escalacion.status);
  const motivo = etiquetaDelMotivo(escalacion);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={`Escalación de ${nombreDelChat(escalacion)}`}
      description={formatearFechaHora(escalacion.created_at)}
      testID="sheet-resumen-escalacion"
      footer={
        <Button variant="secondary" fullWidth onPress={onAbrir} testID="resumen-escalacion-abrir">
          Abrir conversación
        </Button>
      }
    >
      <View style={styles.fila}>
        <Text style={[shType.caption, styles.etiqueta, { color: c.textSoft }]}>Motivo</Text>
        <BadgeEstado label={motivo} tone={tonoDelMotivo(escalacion.reason_code)} icon="flag" />
      </View>
      <View style={styles.fila}>
        <Text style={[shType.caption, styles.etiqueta, { color: c.textSoft }]}>Estado</Text>
        <BadgeEstado label={estado.label} tone={estado.tone} icon={estado.icon} />
      </View>
      <View style={styles.bloque}>
        <Text style={[shType.caption, { color: c.textSoft }]}>Resumen</Text>
        <Text style={[shType.dense, { color: c.text }]}>
          {escalacion.summary || "Sin resumen."}
        </Text>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: "row", alignItems: "center", gap: shSpace[3] },
  etiqueta: { width: 64 },
  bloque: { gap: shSpace[1] },
});
