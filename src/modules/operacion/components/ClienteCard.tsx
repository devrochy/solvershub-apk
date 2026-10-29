import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { shSpace, shType } from "@core/theme/tokens";
import { Avatar, Badge, Card, IconButton, Icono, useKit, type IconName } from "@shared/ui";
import {
  enlaceTelefono,
  enlaceWhatsApp,
  etiquetaCanal,
  etiquetaClasificacion,
  telefonoVisible,
  ubicacionVisible,
  urlAvatarCliente,
} from "@shared/domain/formato-clientes";
import type { LeadAgentOut, LeadRow } from "../api";
import { AgentIcon, ChannelIcon } from "./iconos-clientes";
import { BotonDelBot } from "./BotonDelBot";

type Tono = "neutral" | "accent" | "success" | "warning" | "danger";

const CLASIFICACION: Record<string, { tone: Tono; icon: IconName }> = {
  nuevo: { tone: "accent", icon: "fiber-new" },
  prospecto: { tone: "neutral", icon: "person-outline" },
  cliente: { tone: "success", icon: "check-circle" },
  vip: { tone: "accent", icon: "star" },
  inactivo: { tone: "warning", icon: "schedule" },
  bloqueado: { tone: "danger", icon: "block" },
};

/** Metadatos visuales de la clasificación del cliente, compartidos con la ficha. */
export function metaDeClasificacion(valor: string | null | undefined, label?: string | null) {
  const meta = CLASIFICACION[valor ?? ""] ?? {
    tone: "neutral" as Tono,
    icon: "person-outline" as IconName,
  };
  return { ...meta, etiqueta: etiquetaClasificacion(valor, label) };
}

export interface ClienteCardProps {
  item: LeadRow;
  agentes?: LeadAgentOut[];
  puedeEscribir: boolean;
  puedeEnviarPlantilla: boolean;
  botPendiente?: boolean;
  onAbrir: () => void;
  onEditar: () => void;
  onAlternarBot: () => void;
  onEnviarPlantilla?: () => void;
}

/**
 * Tarjeta de Clientes (CRM): lo que el panel muestra en su tabla, pero con la
 * gramática de una mano. La tarjeta abre la ficha; las acciones son controles
 * independientes de 48 dp. El color nunca va solo: cada estado lleva icono y
 * texto.
 */
export function ClienteCard({
  item,
  agentes,
  puedeEscribir,
  puedeEnviarPlantilla,
  botPendiente = false,
  onAbrir,
  onEditar,
  onAlternarBot,
  onEnviarPlantilla,
}: ClienteCardProps) {
  const { c, tonos } = useKit();
  const perfil = item.perfil ?? null;
  const nombre = perfil?.nombre_visible || item.cliente || "Cliente";
  const alias = perfil?.alias && perfil.alias !== nombre ? perfil.alias : null;
  const clasificacion = metaDeClasificacion(
    perfil?.clasificacion,
    perfil?.clasificacion_label,
  );
  const etiquetaDeClasificacion = clasificacion.etiqueta;
  const telefono = perfil ? telefonoVisible(perfil) : item.telefono ?? "—";
  const ubicacion = perfil ? ubicacionVisible(perfil) : "—";
  const mapa = perfil?.mapa_url ?? null;
  const whatsapp = enlaceWhatsApp(telefono, nombre);
  const llamar = enlaceTelefono(telefono);
  const delCliente = new Set(item.agentes ?? []);
  const activo = !(item.bot_paused ?? false);
  const tono = tonos[clasificacion.tone === "accent" ? "accent" : clasificacion.tone];
  const nombresAgentes = (agentes ?? [])
    .filter((a) => delCliente.has(a.key))
    .map((a) => a.name);

  const etiquetaAccesible = [
    nombre,
    alias ? `alias ${alias}` : null,
    etiquetaDeClasificacion,
    etiquetaCanal(item.canal),
    telefono !== "—" ? telefono : null,
    ubicacion !== "—" ? ubicacion : null,
    nombresAgentes.length > 0 ? `Agentes: ${nombresAgentes.join(", ")}` : null,
    activo ? "Bot activo" : "Bot pausado",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Card
      testID={`lead-${item.id}`}
      accessibilityLabel={etiquetaAccesible}
      accessibilityHint="Abre la ficha del cliente"
      accentColor={tono.border}
      onPress={onAbrir}
    >
      <View style={styles.superior}>
        <Avatar name={nombre} src={urlAvatarCliente(perfil?.avatar_url)} size="md" />
        <View style={styles.textos}>
          <Text style={[shType.block, { color: c.text }]} numberOfLines={1}>
            {nombre}
          </Text>
          {alias ? (
            <Text style={[shType.caption, { color: c.textMuted }]} numberOfLines={1}>
              Alias: {alias}
            </Text>
          ) : null}
          <BadgeDeClasificacion
            tone={clasificacion.tone}
            icon={clasificacion.icon}
            label={etiquetaDeClasificacion}
            testID={`lead-clasificacion-${item.id}`}
          />
        </View>
      </View>

      <View style={styles.detalles}>
        <View style={styles.filaDetalle}>
          <ChannelIcon canal={item.canal} size={24} />
          <Text style={[shType.dense, { color: c.textMuted }]}>{etiquetaCanal(item.canal)}</Text>
          {telefono !== "—" ? (
            <Text style={[shType.dense, styles.telefono, { color: c.text }]} numberOfLines={1}>
              {telefono}
            </Text>
          ) : null}
        </View>
        {ubicacion !== "—" ? (
          <View style={styles.filaDetalle}>
            <Icono name="place" size={16} color={c.textMuted} />
            <Text style={[shType.dense, styles.flex, { color: c.textMuted }]} numberOfLines={1}>
              {ubicacion}
            </Text>
            {mapa ? (
              <Pressable
                testID={`lead-mapa-${item.id}`}
                accessibilityRole="link"
                accessibilityLabel={`Abrir el mapa de ${nombre}`}
                hitSlop={8}
                onPress={() => void Linking.openURL(mapa).catch(() => undefined)}
              >
                <Text style={[shType.caption, { color: c.link }]}>Ver mapa</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {agentes && agentes.length > 0 ? (
        <View style={styles.agentes}>
          <Text style={[shType.caption, { color: c.textMuted }]}>Agentes</Text>
          {agentes.map((agente) => (
            <AgentIcon
              key={agente.key}
              agentKey={agente.key}
              size={24}
              muted={!delCliente.has(agente.key)}
            />
          ))}
        </View>
      ) : null}

      <View style={[styles.pie, { borderTopColor: c.borderSoft }]}>
        <BotonDelBot
          testID={`lead-bot-${item.id}`}
          activo={activo}
          nombre={nombre}
          onToggle={onAlternarBot}
          pendiente={botPendiente}
          disabled={!puedeEscribir}
        />
        <View style={styles.acciones}>
          {whatsapp ? (
            <IconButton
              testID={`lead-whatsapp-${item.id}`}
              icon="chat"
              label={`Escribir a ${nombre} por WhatsApp`}
              tone="accent"
              size="sm"
              onPress={() => void Linking.openURL(whatsapp).catch(() => undefined)}
            />
          ) : null}
          {llamar ? (
            <IconButton
              testID={`lead-llamar-${item.id}`}
              icon="call"
              label={`Llamar a ${nombre}`}
              tone="accent"
              size="sm"
              onPress={() => void Linking.openURL(llamar).catch(() => undefined)}
            />
          ) : null}
          {puedeEnviarPlantilla && onEnviarPlantilla && delCliente.has("ventas") ? (
            <IconButton
              testID={`lead-plantilla-${item.id}`}
              icon="send"
              label={`Enviar plantilla a ${nombre}`}
              size="sm"
              onPress={onEnviarPlantilla}
            />
          ) : null}
          {puedeEscribir ? (
            <IconButton
              testID={`lead-editar-${item.id}`}
              icon="edit"
              label={`Editar los datos de ${nombre}`}
              size="sm"
              onPress={onEditar}
            />
          ) : null}
        </View>
      </View>
    </Card>
  );
}

export function BadgeDeClasificacion({
  tone,
  icon,
  label,
  testID,
}: {
  tone: Tono;
  icon: IconName;
  label: string;
  testID: string;
}) {
  if (tone === "neutral" || tone === "accent") {
    return <Badge size="sm" tone={tone} icon={icon} label={label} testID={testID} />;
  }
  return <Badge size="sm" tone={tone} icon={icon} label={label} testID={testID} />;
}

const styles = StyleSheet.create({
  superior: { flexDirection: "row", alignItems: "flex-start", gap: shSpace[3] },
  textos: { flex: 1, gap: 2, alignItems: "flex-start" },
  detalles: { gap: shSpace[1] },
  filaDetalle: { flexDirection: "row", alignItems: "center", gap: shSpace[1] },
  telefono: { marginLeft: shSpace[1], fontVariant: ["tabular-nums"] },
  flex: { flex: 1 },
  agentes: { flexDirection: "row", alignItems: "center", gap: shSpace[1], flexWrap: "wrap" },
  pie: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: shSpace[2],
    flexWrap: "wrap",
    borderTopWidth: 1,
    paddingTop: shSpace[2],
    marginTop: shSpace[1],
  },
  acciones: { flexDirection: "row", alignItems: "center", marginLeft: "auto" },
});
