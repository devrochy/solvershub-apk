import { Linking, StyleSheet, Text, View } from "react-native";
import { shSpace, shType } from "@core/theme/tokens";
import { Avatar, Badge, Card, IconButton, Icono, useKit, type IconName } from "@shared/ui";
import {
  enlaceTelefono,
  enlaceWhatsApp,
  etiquetaRiesgo,
  etiquetaTipoDocumento,
  formatearCop,
  tonoDeRiesgo,
} from "@shared/domain/formato-clientes";
import type { ClientRow } from "../api";

type Tono = "neutral" | "info" | "danger";

const RIESGO_ICONO: Record<string, IconName> = {
  blanco: "check-circle",
  azul: "info",
  rojo: "warning",
};

export interface ClienteCobranzaCardProps {
  item: ClientRow;
  puedeEscribir: boolean;
  onAbrir: () => void;
  onEditar: () => void;
  onEliminar: () => void;
}

/** Tarjeta de un cliente de cartera: datos de la tabla del panel y acciones de una mano. */
export function ClienteCobranzaCard({
  item,
  puedeEscribir,
  onAbrir,
  onEditar,
  onEliminar,
}: ClienteCobranzaCardProps) {
  const { c, tonos } = useKit();
  const nombre = `${item.nombre} ${item.apellido ?? ""}`.trim() || "Cliente";
  const telefono = item.telefono ?? "—";
  const documento = item.numero_documento
    ? `${etiquetaTipoDocumento(item.tipo_documento)} ${item.numero_documento}`.trim()
    : "—";
  const riesgo = tonoDeRiesgo(item.color_riesgo) as Tono;
  const tone = tonos[riesgo];
  const whatsapp = enlaceWhatsApp(telefono, nombre);
  const llamar = enlaceTelefono(telefono);
  const riesgoLabel = etiquetaRiesgo(item.color_riesgo);
  const riesgoIcono = RIESGO_ICONO[item.color_riesgo] ?? "help-outline";

  const etiquetaAccesible = [
    nombre,
    riesgoLabel,
    telefono !== "—" ? telefono : null,
    documento !== "—" ? documento : null,
    item.negocio,
    item.cartera,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Card
      testID={`cobranza-cliente-${item.id}`}
      accentColor={tone.border}
      accessibilityLabel={etiquetaAccesible}
      accessibilityHint="Abre la ficha del cliente"
      onPress={onAbrir}
    >
      <View style={styles.superior}>
        <Avatar name={nombre} size="md" />
        <View style={styles.textos}>
          <Text style={[shType.block, { color: c.text }]} numberOfLines={1}>
            {nombre}
          </Text>
          <Text style={[shType.caption, { color: c.textMuted }]} numberOfLines={1}>
            {item.cartera || "Sin cartera"}
          </Text>
          <BadgeDeRiesgo tone={riesgo} icon={riesgoIcono} label={riesgoLabel} testID={`cobranza-riesgo-${item.id}`} />
        </View>
      </View>

      <View style={styles.datos}>
        <Fila icon="call" valor={telefono} />
        <Fila icon="badge" valor={documento} />
        {item.negocio ? <Fila icon="storefront" valor={item.negocio} /> : null}
        {Number(item.tope_maximo_deuda ?? 0) > 0 ? (
          <Fila icon="account-balance-wallet" valor={`Tope ${formatearCop(item.tope_maximo_deuda)}`} />
        ) : null}
      </View>

      <View style={[styles.pie, { borderTopColor: c.borderSoft }]}>
        <View style={styles.acciones}>
          {whatsapp ? (
            <IconButton
              testID={`cobranza-whatsapp-${item.id}`}
              icon="chat"
              label={`Escribir a ${nombre} por WhatsApp`}
              tone="accent"
              size="sm"
              onPress={() => void Linking.openURL(whatsapp).catch(() => undefined)}
            />
          ) : null}
          {llamar ? (
            <IconButton
              testID={`cobranza-llamar-${item.id}`}
              icon="call"
              label={`Llamar a ${nombre}`}
              tone="accent"
              size="sm"
              onPress={() => void Linking.openURL(llamar).catch(() => undefined)}
            />
          ) : null}
          {puedeEscribir ? (
            <>
              <IconButton
                testID={`cobranza-editar-${item.id}`}
                icon="edit"
                label={`Editar a ${nombre}`}
                size="sm"
                onPress={onEditar}
              />
              <IconButton
                testID={`cobranza-eliminar-${item.id}`}
                icon="delete-outline"
                label={`Eliminar a ${nombre}`}
                tone="danger"
                size="sm"
                onPress={onEliminar}
              />
            </>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

function Fila({ icon, valor }: { icon: IconName; valor: string }) {
  const { c } = useKit();
  return (
    <View style={styles.fila}>
      <Icono name={icon} size={16} color={c.textMuted} />
      <Text style={[shType.dense, styles.valor, { color: c.text }]} numberOfLines={1}>
        {valor}
      </Text>
    </View>
  );
}

function BadgeDeRiesgo({
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
  if (tone === "neutral") {
    return <Badge size="sm" tone="neutral" icon={icon} label={label} testID={testID} />;
  }
  return <Badge size="sm" tone={tone} icon={icon} label={label} testID={testID} />;
}

const styles = StyleSheet.create({
  superior: { flexDirection: "row", alignItems: "flex-start", gap: shSpace[3] },
  textos: { flex: 1, gap: 2, alignItems: "flex-start" },
  datos: { gap: shSpace[1] },
  fila: { flexDirection: "row", alignItems: "center", gap: shSpace[1] },
  valor: { flex: 1 },
  pie: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: shSpace[2],
    marginTop: shSpace[1],
  },
  acciones: { flexDirection: "row", alignItems: "center", marginLeft: "auto" },
});
