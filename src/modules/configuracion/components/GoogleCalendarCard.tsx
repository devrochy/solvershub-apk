import { Linking, StyleSheet, Text, View } from "react-native";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Badge, Button, useKit } from "@shared/ui";
import { emitirNavegacion } from "@shared/navegacion-evento";
import { urlPanelAgenda, urlPanelConexion } from "@shared/panel-urls";

import type { ConnectionItem } from "../api";

/**
 * Google Calendar en el canal de Conexiones (HU-CAL-08): una cuenta = una agenda.
 * La app abre el OAuth y la ficha en el panel; la agenda se edita en Agenda › Ajustes.
 */
export function GoogleCalendarCard({
  conexiones,
  tenantId,
  puedeEditar,
}: {
  conexiones: ConnectionItem[];
  tenantId: string | null;
  puedeEditar: boolean;
}) {
  const { c } = useKit();

  return (
    <View testID="google-calendar" style={[styles.tarjeta, { borderColor: c.border, backgroundColor: c.surface }]}>
      <View style={styles.encabezado}>
        <View style={styles.tituloZona}>
          <Text style={[shType.label, { color: c.text }]}>Google Calendar</Text>
          <Text style={[shType.caption, { color: c.textMuted }]}>
            Cada cuenta de Google es una agenda del módulo de Agenda.
          </Text>
        </View>
        {puedeEditar ? (
          <Button size="sm" variant="secondary" onPress={() => void Linking.openURL(urlPanelAgenda(tenantId, "agendas"))} testID="google-conectar">
            {conexiones.length ? "Conectar otra cuenta" : "Conectar con Google"}
          </Button>
        ) : null}
      </View>

      {conexiones.length === 0 ? (
        <Text style={[shType.dense, { color: c.textMuted }]}>
          Sin cuentas conectadas. Conecta una para que el asistente agende en tu calendario.
        </Text>
      ) : (
        <View style={styles.lista}>
          {conexiones.map((conexion) => (
            <View key={conexion.id} style={[styles.fila, { borderColor: c.borderSoft }]}>
              <View style={styles.principal}>
                <Text style={[shType.label, { color: c.text }]} numberOfLines={1}>
                  {conexion.label || "Google Calendar"}
                </Text>
                <Text style={[shType.caption, { color: c.textMuted }]} numberOfLines={1}>
                  {conexion.external_id}
                </Text>
                <View style={styles.badges}>
                  {conexion.active ? (
                    <Badge label="Conectada" tone="success" icon="check-circle" />
                  ) : (
                    <Badge label="Pausada" />
                  )}
                  {conexion.is_primary ? <Badge label="Principal" tone="accent" /> : null}
                </View>
              </View>
              <View style={styles.acciones}>
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() =>
                    emitirNavegacion({ tab: "calendario", pestana: "agenda", ajustes: "agendas" })
                  }
                  testID={`google-agenda-${conexion.id}`}
                >
                  Editar agenda
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => void Linking.openURL(urlPanelConexion(conexion.id))}
                  testID={`google-gestionar-${conexion.id}`}
                >
                  Gestionar ↗
                </Button>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: shRadius.sm, padding: shSpace[3], gap: shSpace[3] },
  encabezado: { flexDirection: "row", alignItems: "flex-start", gap: shSpace[3], flexWrap: "wrap" },
  tituloZona: { flex: 1, minWidth: 180, gap: 2 },
  lista: { gap: shSpace[2] },
  fila: { borderTopWidth: 1, paddingTop: shSpace[2], gap: shSpace[2] },
  principal: { gap: 1 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[1], marginTop: 2 },
  acciones: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[2] },
});
