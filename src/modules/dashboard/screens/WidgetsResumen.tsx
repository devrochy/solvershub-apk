import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { shSpace, shType } from "@core/theme/tokens";
import { emitirNavegacion } from "@shared/navegacion-evento";
import { Badge, Button, Card, EmptyState, Icono, KpiTile, ListItem, Skeleton, useKit } from "@shared/ui";
import type { DashboardResponse } from "../api";
import { alertasDe, antiguedad, consumoDe } from "../datos";
import type { EstadoCarga } from "../use-carga";
import type { components } from "@core/api/schema";

export type EscalacionResumen = components["schemas"]["EscalationItem"];

/** Caja de un widget de lista: título y contenido (el ritmo vertical del Resumen). */
export function CajaWidget({ clave, titulo, children }: { clave: string; titulo: string; children: ReactNode }) {
  const { c } = useKit();
  return (
    <View testID={`widget-${clave}`} style={styles.caja}>
      <Text accessibilityRole="header" style={[shType.block, { color: c.textStrong }]}>
        {titulo}
      </Text>
      {children}
    </View>
  );
}

/** Falla aislada de un widget: lo dice y deja reintentar sin tumbar el resto. */
export function WidgetConError({ clave, titulo, alReintentar }: { clave: string; titulo: string; alReintentar: () => void }) {
  const { tonos } = useKit();
  return (
    <Card testID={`widget-${clave}-error`} accentColor={tonos.danger.fg}>
      <View style={styles.errorFila}>
        <Icono name="error-outline" size={20} color={tonos.danger.fg} />
        <Text accessibilityRole="alert" style={[shType.dense, styles.flex, { color: tonos.danger.fg }]}>
          No pudimos cargar «{titulo}».
        </Text>
      </View>
      <Button variant="secondary" size="sm" onPress={alReintentar} testID={`widget-${clave}-reintentar`}>
        Reintentar
      </Button>
    </Card>
  );
}

export function EsqueletoLista() {
  return (
    <View style={styles.lista}>
      <Skeleton shape="rect" height={48} />
      <Skeleton shape="rect" height={48} />
    </View>
  );
}

export function WidgetAlertas({ dashboard }: { dashboard: DashboardResponse | null }) {
  const { tonos } = useKit();
  const alertas = alertasDe(dashboard);
  if (alertas.length === 0) return null;
  return (
    <CajaWidget clave="lista.alertas" titulo="Alertas">
      {alertas.map((a) => (
        <Card
          key={a.id}
          testID={`alerta-${a.id}`}
          accentColor={tonos.warning.fg}
          onPress={a.destino ? () => emitirNavegacion(a.destino!) : undefined}
          accessibilityLabel={a.texto}
        >
          <View style={styles.errorFila}>
            <Icono name="warning-amber" size={20} color={tonos.warning.fg} />
            <Text style={[shType.dense, styles.flex, { color: tonos.warning.fg }]}>{a.texto}</Text>
          </View>
        </Card>
      ))}
    </CajaWidget>
  );
}

export function WidgetConsumo({ dashboard }: { dashboard: DashboardResponse | null }) {
  const consumo = consumoDe(dashboard);
  if (!consumo) return null;
  return (
    <KpiTile
      testID="kpi-consumo"
      label={consumo.label}
      value={consumo.value}
      hint={consumo.hint}
      onPress={() => emitirNavegacion({ tab: "negocio", pestana: "consumo" })}
    />
  );
}

export function WidgetActividad({ dashboard, estado, alReintentar }: { dashboard: DashboardResponse | null; estado: EstadoCarga; alReintentar: () => void }) {
  if (estado === "error") return <WidgetConError clave="lista.actividad" titulo="Actividad reciente" alReintentar={alReintentar} />;
  if (estado === "cargando") {
    return (
      <CajaWidget clave="lista.actividad" titulo="Actividad reciente">
        <EsqueletoLista />
      </CajaWidget>
    );
  }
  const recientes = dashboard?.recent ?? [];
  return (
    <CajaWidget clave="lista.actividad" titulo="Actividad reciente">
      {recientes.length === 0 ? (
        <EmptyState
          testID="actividad-vacia"
          icon="chat-bubble-outline"
          title="Aún no hay conversaciones"
          description="Conecta WhatsApp para empezar a ver conversaciones."
          action={{ label: "Ir a Conexiones", onPress: () => emitirNavegacion({ tab: "configuracion", pestana: "conexiones" }) }}
        />
      ) : (
        <View style={styles.lista}>
          {recientes.slice(0, 5).map((conv) => (
            <ListItem
              key={conv.id}
              title={conv.customer_name ?? conv.external_id ?? "Cliente"}
              badge={<Badge label={conv.status} />}
              onPress={() => emitirNavegacion({ tab: "conversaciones", pestana: "conversaciones" })}
            />
          ))}
        </View>
      )}
    </CajaWidget>
  );
}

export function WidgetEscalaciones({
  items,
  estado,
  alReintentar,
}: {
  items: EscalacionResumen[];
  estado: EstadoCarga;
  alReintentar: () => void;
}) {
  if (estado === "error") return <WidgetConError clave="lista.escalaciones" titulo="Cola de escalaciones" alReintentar={alReintentar} />;
  if (estado === "cargando") {
    return (
      <CajaWidget clave="lista.escalaciones" titulo="Cola de escalaciones">
        <EsqueletoLista />
      </CajaWidget>
    );
  }
  return (
    <CajaWidget clave="lista.escalaciones" titulo="Cola de escalaciones">
      {items.length === 0 ? (
        <EmptyState
          testID="escalaciones-vacia"
          icon="check-circle-outline"
          title="Nada por atender"
          description="Cuando una conversación necesite a una persona, aparece aquí."
          action={{ label: "Ver conversaciones", onPress: () => emitirNavegacion({ tab: "conversaciones", pestana: "conversaciones" }) }}
        />
      ) : (
        <View style={styles.lista}>
          {items.map((e) => (
            <ListItem
              key={e.conversation_id}
              testID={`escalacion-${e.conversation_id}`}
              title={e.customer_name ?? e.external_id ?? "Cliente"}
              subtitle={e.reason_label}
              meta={antiguedad(e.created_at)}
              onPress={() => emitirNavegacion({ tab: "conversaciones", pestana: "escalaciones" })}
            />
          ))}
        </View>
      )}
    </CajaWidget>
  );
}

export function WidgetEstado({ dashboard }: { dashboard: DashboardResponse | null }) {
  const { c } = useKit();
  if (!dashboard) return null;
  const filas: [string, ReactNode][] = [
    [
      "Asistente",
      dashboard.bot_paused ? (
        <Badge tone="danger" icon="pause-circle-filled" label="Pausado" />
      ) : (
        <Badge tone="success" icon="check-circle" label="Activo" />
      ),
    ],
    ["Modelo", <Text key="m" style={[shType.dense, { color: c.text }]}>{dashboard.llm_label}</Text>],
    [
      "Habilidades activas",
      <Text key="h" style={[shType.dense, { color: c.text }]}>
        {dashboard.kpi.active_plugins}
      </Text>,
    ],
  ];
  return (
    <CajaWidget clave="estado.sistema" titulo="Estado del sistema">
      <Card>
        {filas.map(([etiqueta, valor]) => (
          <View key={etiqueta} style={styles.filaEstado}>
            <Text style={[shType.dense, { color: c.textMuted }]}>{etiqueta}</Text>
            {valor}
          </View>
        ))}
      </Card>
    </CajaWidget>
  );
}

export interface AccionesProps {
  botPausado: boolean;
  puedePausar: boolean;
  puedeVerEscalaciones: boolean;
  guardando: boolean;
  alAlternarBot: () => void;
}

export function WidgetAcciones({ botPausado, puedePausar, puedeVerEscalaciones, guardando, alAlternarBot }: AccionesProps) {
  if (!puedePausar && !puedeVerEscalaciones) return null;
  return (
    <CajaWidget clave="acciones.rapidas" titulo="Acciones rápidas">
      <View style={styles.lista}>
        {puedePausar ? (
          <Button
            testID="accion-pausar-asistente"
            variant={botPausado ? "primary" : "secondary"}
            iconLeft={botPausado ? "play-arrow" : "pause"}
            loading={guardando}
            fullWidth
            onPress={alAlternarBot}
          >
            {botPausado ? "Reanudar asistente" : "Pausar asistente"}
          </Button>
        ) : null}
        {puedeVerEscalaciones ? (
          <Button
            testID="accion-ver-escalaciones"
            variant="secondary"
            iconLeft="support-agent"
            fullWidth
            onPress={() => emitirNavegacion({ tab: "conversaciones", pestana: "escalaciones" })}
          >
            Ver escalaciones
          </Button>
        ) : null}
      </View>
    </CajaWidget>
  );
}

const styles = StyleSheet.create({
  caja: { gap: shSpace[2] },
  lista: { gap: shSpace[2] },
  errorFila: { flexDirection: "row", alignItems: "center", gap: shSpace[2], marginBottom: shSpace[2] },
  flex: { flexShrink: 1 },
  filaEstado: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 40 },
});
