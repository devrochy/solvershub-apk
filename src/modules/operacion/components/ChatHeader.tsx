import { StyleSheet, Text, View } from "react-native";
import { shSpace, shType } from "@core/theme/tokens";
import { Avatar, IconButton, Icono, useKit } from "@shared/ui";
import type { ConversationDetail } from "../api";
import { BadgeEstado } from "./BadgeEstado";
import {
  conexionDelChat,
  ESTADO_AGENTE,
  estadoDeConversacion,
  formatearCostoYTokens,
  iconoDelCanal,
  nombreDelChat,
  tipoDelChat,
} from "../presentacion";

/** Cabecera del chat: identidad, canal, estado, uso del agente y acceso a más acciones. */
export function ChatHeader({
  detalle,
  onAbrirMas,
}: {
  detalle: ConversationDetail;
  onAbrirMas: () => void;
}) {
  const { c } = useKit();
  const nombre = nombreDelChat(detalle);
  const estado = estadoDeConversacion(detalle.status);
  const agente = detalle.bot_paused ? ESTADO_AGENTE.pausado : ESTADO_AGENTE.activo;
  const uso = detalle.usage;
  const tokens = uso ? uso.input_tokens + uso.output_tokens : 0;

  return (
    <View style={[styles.cabecera, { borderColor: c.borderSoft }]}>
      <Avatar name={nombre} size="md" />
      <View style={styles.identidad}>
        <Text accessibilityRole="header" style={[shType.block, { color: c.text }]} numberOfLines={1}>
          {nombre}
        </Text>
        <View style={styles.canal}>
          <Icono name={iconoDelCanal(tipoDelChat(detalle))} size={14} color={c.textSoft} />
          <Text style={[shType.caption, styles.conexion, { color: c.textSoft }]} numberOfLines={1}>
            {conexionDelChat(detalle)}
            {detalle.external_id ? ` · ${detalle.external_id}` : ""}
          </Text>
        </View>
        <View style={styles.badges}>
          <BadgeEstado label={estado.label} tone={estado.tone} icon={estado.icon} />
          <BadgeEstado label={agente.label} tone={agente.tone} icon={agente.icon} />
        </View>
        {uso ? (
          <Text style={[shType.caption, styles.uso, { color: c.textSoft }]} maxFontSizeMultiplier={1.6}>
            {formatearCostoYTokens(uso.cost_usd, tokens)}
          </Text>
        ) : null}
      </View>
      <IconButton
        icon="more-vert"
        label="Más acciones de la conversación"
        onPress={onAbrirMas}
        testID="detalle-mas-acciones"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cabecera: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: shSpace[3],
    borderBottomWidth: 1,
    paddingHorizontal: shSpace[3],
    paddingVertical: shSpace[3],
  },
  identidad: { flex: 1, gap: 2 },
  canal: { flexDirection: "row", alignItems: "center", gap: shSpace[1] },
  conexion: { flexShrink: 1 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[1], marginTop: 2 },
  uso: { fontVariant: ["tabular-nums"], marginTop: 2 },
});
