import { StyleSheet, Text, View } from "react-native";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { Avatar, IconButton, Icono, Switch, useKit } from "@shared/ui";
import type { ConversationDetail } from "../api";
import { BadgeEstado } from "./BadgeEstado";
import {
  colorDelCanal,
  conexionDelChat,
  ESTADO_AGENTE,
  estadoDeConversacion,
  formatearCostoYTokens,
  iconoDelCanal,
  nombreDelChat,
  tipoDelChat,
} from "../presentacion";

/**
 * Cabecera del chat: identidad, canal, estado, uso y las acciones de la conversación
 * arriba a la derecha (tomar/devolver, interruptor del agente, notas y más).
 */
export function ChatHeader({
  detalle,
  onTomar,
  onDevolver,
  onAlternarAgente,
  onAbrirNotas,
  onAbrirMas,
  hayMasAcciones = true,
  notas = 0,
  ocupado = false,
}: {
  detalle: ConversationDetail;
  onTomar: () => void;
  onDevolver: () => void;
  onAlternarAgente: () => void;
  onAbrirNotas: () => void;
  onAbrirMas: () => void;
  hayMasAcciones?: boolean;
  notas?: number;
  ocupado?: boolean;
}) {
  const { c, relleno } = useKit();
  const nombre = nombreDelChat(detalle);
  const estado = estadoDeConversacion(detalle.status);
  const agente = detalle.bot_paused ? ESTADO_AGENTE.pausado : ESTADO_AGENTE.activo;
  const tipo = tipoDelChat(detalle);
  const uso = detalle.usage;
  const tokens = uso ? uso.input_tokens + uso.output_tokens : 0;
  const pendiente = detalle.escalation?.status === "pendiente";
  const asignada = detalle.escalation?.status === "asignada";
  const puedeAlternar = detalle.escalation == null && detalle.status !== "closed";

  return (
    <View style={[styles.cabecera, { borderColor: c.borderSoft, backgroundColor: c.surface }]}>
      <View style={styles.identidadFila}>
        <Avatar name={nombre} size="md" />
        <View style={styles.identidad}>
          <Text accessibilityRole="header" style={[shType.block, { color: c.text }]} numberOfLines={1}>
            {nombre}
          </Text>
          <View style={styles.canal}>
            <Icono name={iconoDelCanal(tipo)} size={14} color={colorDelCanal(tipo, c)} />
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
      </View>

      <View style={styles.acciones}>
        {pendiente ? (
          <IconButton
            icon="pan-tool"
            label="Tomar la conversación"
            tone="accent"
            onPress={onTomar}
            disabled={ocupado}
            testID="detalle-tomar"
          />
        ) : null}
        {asignada ? (
          <IconButton
            icon="smart-toy"
            label="Devolver al agente"
            onPress={onDevolver}
            disabled={ocupado}
            testID="detalle-devolver"
          />
        ) : null}
        {puedeAlternar ? (
          <View
            style={[styles.toggle, { borderColor: c.borderSoft, backgroundColor: c.surface }]}
          >
            <Icono
              name="smart-toy"
              size={18}
              color={detalle.bot_paused ? c.textSoft : c.statusSuccessFg}
            />
            <Switch
              compact
              label={detalle.bot_paused ? "Reanudar el agente" : "Pausar el agente"}
              value={!detalle.bot_paused}
              onValueChange={() => onAlternarAgente()}
              disabled={ocupado}
              testID="detalle-toggle-bot"
            />
          </View>
        ) : null}
        <View>
          <IconButton
            icon="note"
            label={`Notas internas${notas ? ` (${notas})` : ""}`}
            onPress={onAbrirNotas}
            testID="detalle-notas"
          />
          {notas > 0 ? (
            <View
              pointerEvents="none"
              accessible={false}
              style={[styles.badge, { backgroundColor: relleno.primario }]}
            >
              <Text style={[styles.badgeTexto, { color: relleno.sobrePrimario }]}>
                {notas > 9 ? "9+" : notas}
              </Text>
            </View>
          ) : null}
        </View>
        {hayMasAcciones ? (
          <IconButton
            icon="more-vert"
            label="Más acciones de la conversación"
            onPress={onAbrirMas}
            testID="detalle-mas-acciones"
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cabecera: {
    gap: shSpace[2],
    borderBottomWidth: 1,
    paddingHorizontal: shSpace[3],
    paddingVertical: shSpace[3],
  },
  identidadFila: { flexDirection: "row", alignItems: "flex-start", gap: shSpace[3] },
  identidad: { flex: 1, gap: 2 },
  canal: { flexDirection: "row", alignItems: "center", gap: shSpace[1] },
  conexion: { flexShrink: 1 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[1], marginTop: 2 },
  uso: { fontVariant: ["tabular-nums"], marginTop: 2 },
  acciones: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: shSpace[1],
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: shDensity.controlLg,
    borderWidth: 1,
    borderRadius: shRadius.pill,
    paddingLeft: shSpace[2],
    paddingRight: 2,
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: shRadius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeTexto: { fontSize: 10, lineHeight: 12, fontWeight: "700", fontVariant: ["tabular-nums"] },
});
