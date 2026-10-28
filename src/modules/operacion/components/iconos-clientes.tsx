import { StyleSheet, View } from "react-native";
import { Icono, useKit, type IconName } from "@shared/ui";
import { etiquetaCanal } from "@shared/domain/formato-clientes";

type Colores = ReturnType<typeof useKit>["c"];
type Meta = { icon: IconName; color: (c: Colores) => string };

const CANALES: Record<string, Meta> = {
  whatsapp: { icon: "chat", color: (c) => c.statusSuccessFg },
  whatsapp_cloud: { icon: "chat", color: (c) => c.statusSuccessFg },
  whatsapp_waweb: { icon: "qr-code", color: (c) => c.statusSuccessFg },
  instagram: { icon: "photo-camera", color: (c) => c.statusDangerFg },
  messenger: { icon: "send", color: (c) => c.link },
  facebook: { icon: "send", color: (c) => c.link },
  email: { icon: "mail", color: (c) => c.dataCat2 },
  sms: { icon: "sms", color: (c) => c.link },
  webchat: { icon: "language", color: (c) => c.dataCat4 },
  web: { icon: "language", color: (c) => c.dataCat4 },
};

const AGENTES: Record<string, Meta> = {
  general: { icon: "smart-toy", color: (c) => c.dataCat2 },
  ventas: { icon: "shopping-cart", color: (c) => c.statusWarningFg },
  cobranza: { icon: "account-balance-wallet", color: (c) => c.statusDangerFg },
  agenda: { icon: "calendar-month", color: (c) => c.dataCat1 },
  suscripciones: { icon: "autorenew", color: (c) => c.dataCat4 },
  pagos: { icon: "payments", color: (c) => c.statusSuccessFg },
};

export function ChannelIcon({
  canal,
  size = 28,
  muted = false,
}: {
  canal: string | null | undefined;
  size?: number;
  muted?: boolean;
}) {
  const { c } = useKit();
  const meta = (canal && CANALES[canal]) || { icon: "public" as IconName, color: () => c.textMuted };
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.caja,
        {
          width: size,
          height: size,
          borderRadius: size / 3,
          backgroundColor: c.surfaceRaised,
          opacity: muted ? 0.45 : 1,
        },
      ]}
    >
      <Icono name={meta.icon} size={Math.round(size * 0.55)} color={meta.color(c)} />
    </View>
  );
}

export function AgentIcon({
  agentKey,
  size = 28,
  muted = false,
}: {
  agentKey: string | null | undefined;
  size?: number;
  muted?: boolean;
}) {
  const { c } = useKit();
  const meta = (agentKey && AGENTES[agentKey]) || {
    icon: "smart-toy" as IconName,
    color: () => c.textMuted,
  };
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.caja,
        {
          width: size,
          height: size,
          borderRadius: size / 3,
          backgroundColor: c.surfaceRaised,
          opacity: muted ? 0.35 : 1,
        },
      ]}
    >
      <Icono name={meta.icon} size={Math.round(size * 0.55)} color={meta.color(c)} />
    </View>
  );
}

/** Nombres de los agentes que tienen datos del cliente, para el nombre accesible de la tarjeta. */
export function nombresDeAgentes(
  todos: { key: string; name: string }[] | undefined,
  delCliente: string[] | undefined,
): string[] {
  const claves = new Set(delCliente ?? []);
  return (todos ?? []).filter((a) => claves.has(a.key)).map((a) => a.name);
}

/** Etiqueta del canal para textos accesibles. */
export { etiquetaCanal };

const styles = StyleSheet.create({
  caja: { alignItems: "center", justifyContent: "center" },
});
