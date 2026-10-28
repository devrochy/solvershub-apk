import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Avatar, Icono, useKit, type AvatarStatus } from "@shared/ui";
import type { ConversationSummary } from "../api";
import { BadgeEstado } from "./BadgeEstado";
import {
  actividadDe,
  conexionDelChat,
  estadoDeConversacion,
  formatearHoraChat,
  iconoDelCanal,
  nombreDelChat,
  PREFIJO_REMITENTE,
  tipoDelChat,
} from "../presentacion";

function estadoDelAvatar(chat: ConversationSummary): AvatarStatus | undefined {
  if (chat.status === "escalated") return { tone: "danger", label: "Escalada" };
  if (chat.bot_paused) return { tone: "warning", label: "Agente pausado" };
  return undefined;
}

function vistaPrevia(chat: ConversationSummary): string {
  if (chat.last_message == null) return "Sin mensajes";
  const prefijo = PREFIJO_REMITENTE[chat.last_message_sender ?? ""] ?? "";
  return `${prefijo}${chat.last_message || "(sin texto)"}`;
}

/** Tarjeta de la bandeja: quién escribe, qué dijo, por dónde y en qué estado. */
export function TarjetaConversacion({
  chat,
  onPress,
}: {
  chat: ConversationSummary;
  onPress: () => void;
}) {
  const { c, ripple } = useKit();
  const nombre = nombreDelChat(chat);
  const estado = estadoDeConversacion(chat.status);
  const tipo = tipoDelChat(chat);
  const sinMensajes = chat.last_message == null;
  const etiqueta = [
    nombre,
    estado.label,
    chat.bot_paused ? "agente pausado" : null,
    vistaPrevia(chat),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Pressable
      testID={`conversacion-${chat.id}`}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityHint="Abrir conversación"
      onPress={onPress}
      android_ripple={{ color: ripple.superficie }}
      style={({ pressed }) => [
        styles.tarjeta,
        { backgroundColor: pressed ? c.hover : c.surface, borderColor: c.borderSoft },
        pressed && Platform.OS === "ios" && styles.presionado,
      ]}
    >
      <Avatar name={nombre} size="md" status={estadoDelAvatar(chat)} />
      <View style={styles.cuerpo}>
        <View style={styles.filaSuperior}>
          <Text style={[shType.label, styles.nombre, { color: c.text }]} numberOfLines={1}>
            {nombre}
          </Text>
          <Text
            style={[shType.caption, styles.hora, { color: c.textSoft }]}
            maxFontSizeMultiplier={1.6}
          >
            {formatearHoraChat(actividadDe(chat))}
          </Text>
        </View>

        <Text
          style={[shType.dense, { color: sinMensajes ? c.textSoft : c.textMuted }, sinMensajes && styles.sinMensajes]}
          numberOfLines={2}
        >
          {vistaPrevia(chat)}
        </Text>

        <View style={styles.meta}>
          <View style={styles.canal}>
            <Icono name={iconoDelCanal(tipo)} size={14} color={c.textSoft} />
            <Text style={[shType.caption, styles.conexion, { color: c.textSoft }]} numberOfLines={1}>
              {conexionDelChat(chat)}
            </Text>
          </View>
          <View style={styles.badges}>
            <BadgeEstado label={estado.label} tone={estado.tone} icon={estado.icon} />
            {chat.bot_paused && (
              <BadgeEstado label="Agente pausado" tone="warning" icon="pause-circle-outline" />
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    flexDirection: "row",
    gap: shSpace[3],
    borderWidth: 1,
    borderRadius: shRadius.md,
    padding: shSpace[3],
  },
  presionado: { opacity: 0.86 },
  cuerpo: { flex: 1, gap: 2 },
  filaSuperior: { flexDirection: "row", alignItems: "baseline", gap: shSpace[2] },
  nombre: { flex: 1, fontFamily: shType.block.fontFamily, fontSize: shType.label.fontSize },
  hora: { fontVariant: ["tabular-nums"] },
  sinMensajes: { fontStyle: "italic" },
  meta: { flexDirection: "row", alignItems: "center", gap: shSpace[2], marginTop: 2, flexWrap: "wrap" },
  canal: { flexDirection: "row", alignItems: "center", gap: shSpace[1], flexShrink: 1, minWidth: 96 },
  conexion: { flexShrink: 1 },
  badges: { flexDirection: "row", alignItems: "center", gap: shSpace[1], flexWrap: "wrap" },
});
