import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { shSpace, shType } from "@core/theme/tokens";
import { Badge, Button, Card, ListItem, PageHeader, useKit } from "@shared/ui";
import {
  cargarAcciones,
  cargarCuentasDePago,
  cargarHabilidades,
  type AccionDeAgente,
  type CuentaDePago,
  type HabilidadDeAgente,
} from "../api";
import {
  PAGOS,
  estadoDeAccion,
  agruparAcciones,
  cuentaDelAgente,
  estadoDeHabilidad,
  etiquetaDeCuenta,
  nombreDeAccion,
  textoDeHabilidad,
  type EstadoDeHabilidad,
} from "../habilidades";

type Datos = {
  habilidades: HabilidadDeAgente[];
  acciones: AccionDeAgente[];
  cuentas: CuentaDePago[] | null;
};

const ESTADO: Record<EstadoDeHabilidad, { texto: string; tono: "success" | "warning" | null }> = {
  sin_agregar: { texto: "Sin agregar", tono: null },
  lista: { texto: "Lista", tono: "success" },
  falta_configurar: { texto: "Falta configurar", tono: "warning" },
};

/**
 * Ficha del agente, de solo lectura (ADR-0190, HU-AOS-66): sus habilidades —Pagos en línea con la cuenta Wompi
 * elegida y Conocimiento— y sus acciones agrupadas por lo que hacen. Se edita en el panel web.
 */
export function FichaDeAgente({
  agentId,
  nombre,
  onVolver,
}: {
  agentId: string;
  nombre: string;
  onVolver: () => void;
}) {
  const api = useAdminApi();
  const { c, tonos } = useKit();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const reintentar = useCallback(() => {
    setError(null);
    setIntento((n) => n + 1);
  }, []);

  useEffect(() => {
    let vivo = true;
    // Las cuentas piden otro permiso: si no llegan, la ficha se muestra igual, sin el nombre de la cuenta.
    Promise.all([
      cargarHabilidades(api, agentId),
      cargarAcciones(api, agentId),
      cargarCuentasDePago(api).catch(() => null),
    ])
      .then(([habilidades, acciones, cuentas]) => vivo && setDatos({ habilidades, acciones, cuentas }))
      .catch(() => vivo && setError("No pudimos cargar este agente. Revisa tu conexión e inténtalo de nuevo."));
    return () => {
      vivo = false;
    };
  }, [api, agentId, intento]);

  const encabezado = <PageHeader title={nombre} onBack={onVolver} backLabel="Volver a agentes" testID="ficha-agente" />;

  if (error) {
    return (
      <View style={styles.centro}>
        {encabezado}
        <Text style={[shType.body, { color: tonos.danger.fg }]} accessibilityRole="alert">
          {error}
        </Text>
        <Button variant="secondary" onPress={reintentar}>
          Reintentar
        </Button>
      </View>
    );
  }
  if (!datos) {
    return (
      <View style={styles.centro}>
        {encabezado}
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const grupos = agruparAcciones(datos.acciones);
  return (
    <ScrollView contentContainerStyle={styles.contenido} testID="ficha-agente-contenido">
      {encabezado}

      <Text accessibilityRole="header" style={[shType.block, { color: c.text }]}>
        Habilidades
      </Text>
      {datos.habilidades.length === 0 ? (
        <Text style={[shType.body, { color: c.textMuted }]}>Este agente no tiene habilidades para agregar.</Text>
      ) : (
        datos.habilidades.map((h) => {
          const { nombre: titulo, descripcion } = textoDeHabilidad(h.pack_id);
          const estado = ESTADO[estadoDeHabilidad(h)];
          return (
            <Card key={h.pack_id} testID={`habilidad-${h.pack_id}`}>
              <View style={styles.fila}>
                <Text style={[shType.body, styles.flex, { color: c.text }]}>{titulo}</Text>
                {estado.tono ? (
                  <Badge
                    tone={estado.tono}
                    icon={estado.tono === "success" ? "check-circle" : "warning"}
                    label={estado.texto}
                  />
                ) : (
                  <Badge label={estado.texto} />
                )}
              </View>
              {descripcion ? <Text style={[shType.dense, { color: c.textMuted }]}>{descripcion}</Text> : null}
              {h.pack_id === PAGOS && h.installed ? (
                <Text style={[shType.dense, { color: c.text }]}>{textoDeCuenta(h, datos.cuentas)}</Text>
              ) : null}
            </Card>
          );
        })
      )}

      <Text accessibilityRole="header" style={[shType.block, { color: c.text }]}>
        Acciones
      </Text>
      {grupos.length === 0 ? (
        <Text style={[shType.body, { color: c.textMuted }]}>Este agente todavía no tiene acciones.</Text>
      ) : (
        grupos.map((g) => (
          <View key={g.id} style={styles.grupo} testID={`grupo-${g.id}`}>
            <Text accessibilityRole="header" style={[shType.caption, { color: c.textMuted }]}>
              {g.titulo}
            </Text>
            {g.acciones.map((a) => (
              <ListItem
                key={a.tool}
                title={nombreDeAccion(a.tool)}
                subtitle={a.requires_confirmation ? "Pide confirmación antes de hacerlo" : undefined}
                badge={
                  estadoDeAccion(a) === "encendida" ? (
                    <Badge tone="success" icon="check-circle" label="Encendida" />
                  ) : estadoDeAccion(a) === "por_superpoder" ? (
                    <Badge tone="success" icon="check-circle" label="La usa un superpoder" />
                  ) : (
                    <Badge label="Apagada" />
                  )
                }
              />
            ))}
          </View>
        ))
      )}

      <Text style={[shType.caption, { color: c.textMuted }]}>
        Para cambiar las habilidades o las acciones de este agente, entra al panel web.
      </Text>
    </ScrollView>
  );
}

function textoDeCuenta(h: HabilidadDeAgente, cuentas: CuentaDePago[] | null): string {
  if (!h.config?.["cuenta_id"]) return "Todavía no tiene una cuenta Wompi elegida.";
  if (!cuentas) return "Cobra con una cuenta Wompi del negocio.";
  const cuenta = cuentaDelAgente(h, cuentas);
  return cuenta ? `Cobra con: ${etiquetaDeCuenta(cuenta)}` : "La cuenta Wompi elegida ya no existe.";
}

const styles = StyleSheet.create({
  contenido: { padding: shSpace["4"], gap: shSpace["3"] },
  centro: {
    flex: 1,
    padding: shSpace["6"],
    gap: shSpace["4"],
    justifyContent: "center",
  },
  fila: { flexDirection: "row", alignItems: "center", gap: shSpace["2"] },
  flex: { flex: 1 },
  grupo: { gap: shSpace["2"] },
});
