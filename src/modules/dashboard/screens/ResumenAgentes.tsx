import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { shSpace, shType } from "@core/theme/tokens";
import { Badge, KpiTile, NavGroup, useKit } from "@shared/ui";
import type { AgenteResumen, KpiResumen, ModuloResumen, ResumenPorAgente } from "../api";
import { propsDeKpi } from "../kpi";

/**
 * Resumen por agente (ADR-0171): el negocio entero (lo que gobierna el Coordinador), la
 * actividad diaria en «Tendencia de atención» y, al final, los módulos que gestiona cada agente.
 * Cada cifra con pantalla en la app (o en el panel) lleva a ella.
 */

const TIPO_DE_AGENTE: Record<string, string> = {
  specialist: "Especialista",
  backoffice: "Back-office",
  core: "Coordinador",
};

/** Los KPIs de actividad ya viven en la gráfica y en la tabla; no se repiten en las tarjetas. */
const EN_LA_TABLA = new Set(["turnos", "conversaciones", "costo"]);

function kpisDeTarjeta(kpis: KpiResumen[]): KpiResumen[] {
  return kpis.filter((k) => !EN_LA_TABLA.has(k.id));
}

function Grilla({
  kpis,
  prefijo,
  dias,
  tenantId,
}: {
  kpis: KpiResumen[];
  prefijo: string;
  dias: number;
  tenantId: string | null;
}) {
  return (
    <View style={styles.grilla}>
      {kpis.map((k) => (
        <View key={k.id} style={styles.celda}>
          <KpiTile
            testID={`${prefijo}-${k.id}`}
            {...propsDeKpi(k, { dias, tenantId })}
          />
        </View>
      ))}
    </View>
  );
}

function Modulo({
  modulo,
  prefijo,
  dias,
  tenantId,
}: {
  modulo: ModuloResumen;
  prefijo: string;
  dias: number;
  tenantId: string | null;
}) {
  const { c, tonos } = useKit();
  return (
    <View style={styles.bloque}>
      <Text style={[shType.label, { color: c.textStrong }]}>Módulo · {modulo.nombre}</Text>
      {modulo.error ? (
        <Text accessibilityRole="alert" style={[shType.dense, { color: tonos.danger.fg }]}>
          {modulo.error}
        </Text>
      ) : (
        <Grilla kpis={modulo.kpis} prefijo={`${prefijo}-${modulo.id}`} dias={dias} tenantId={tenantId} />
      )}
    </View>
  );
}

function SeccionDeAgente({
  agente,
  abierto,
  alAlternar,
  dias,
  tenantId,
}: {
  agente: AgenteResumen;
  abierto: boolean;
  alAlternar: () => void;
  dias: number;
  tenantId: string | null;
}) {
  const { c } = useKit();
  const prefijo = `resumen-${agente.ref}`;
  const kpis = kpisDeTarjeta(agente.kpis);
  return (
    <View testID={prefijo} style={[styles.seccionAgente, { borderColor: c.borderSoft }]}>
      <NavGroup
        testID={`${prefijo}-cabecera`}
        label={agente.name}
        abierto={abierto}
        onToggle={alAlternar}
      >
        <View style={styles.contenidoAgente}>
          <Badge label={TIPO_DE_AGENTE[agente.kind] ?? "Agente"} />
          <Text style={[shType.caption, { color: c.textMuted }]}>Últimos {dias} días</Text>
          {kpis.length > 0 ? (
            <Grilla kpis={kpis} prefijo={prefijo} dias={dias} tenantId={tenantId} />
          ) : null}
          {agente.modulos.map((m) => (
            <Modulo key={m.id} modulo={m} prefijo={prefijo} dias={dias} tenantId={tenantId} />
          ))}
        </View>
      </NavGroup>
    </View>
  );
}

/** Hay algo que mostrar: si no, el Resumen conserva las tarjetas de antes. */
export function tieneResumen(datos: ResumenPorAgente | null | undefined): datos is ResumenPorAgente {
  if (!datos?.general?.kpis || !Array.isArray(datos.agentes)) return false;
  return (
    datos.general.kpis.length > 0 ||
    datos.agentes.some((a) => a.kpis.length > 0 || a.modulos.length > 0)
  );
}

export function ResumenAgentes({
  datos,
  soloAgentes = false,
  dias,
  tenantId,
}: {
  datos: ResumenPorAgente;
  soloAgentes?: boolean;
  dias: number;
  tenantId: string | null;
}) {
  const { c } = useKit();
  const agentes = datos.agentes.filter(
    (a) =>
      a.key !== "general" &&
      (kpisDeTarjeta(a.kpis).length > 0 || a.modulos.length > 0),
  );
  // El primero abierto; el resto, plegado, para que la pantalla no se haga interminable.
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>(() =>
    agentes[0] ? { [agentes[0].ref]: true } : {},
  );

  return (
    <View testID="resumen-agentes" style={styles.raiz}>
      {!soloAgentes && datos.general.kpis.length > 0 ? (
        <View style={styles.bloque}>
          <Text accessibilityRole="header" style={[shType.h1, { color: c.textStrong }]}>
            Negocio
          </Text>
          <Text style={[shType.dense, { color: c.textMuted }]}>Todo el negocio, últimos {dias} días.</Text>
          <Grilla kpis={datos.general.kpis} prefijo="resumen-general" dias={dias} tenantId={tenantId} />
        </View>
      ) : null}
      {agentes.length > 0 ? (
        <View style={styles.bloque}>
          <Text accessibilityRole="header" style={[shType.h1, { color: c.textStrong }]}>
            Módulos por agente
          </Text>
          <Text style={[shType.dense, { color: c.textMuted }]}>
            Lo que gestiona cada agente, sin repetir la actividad de la tabla.
          </Text>
          {agentes.map((a) => (
            <SeccionDeAgente
              key={a.ref}
              agente={a}
              abierto={abiertos[a.ref] ?? false}
              alAlternar={() => setAbiertos((p) => ({ ...p, [a.ref]: !p[a.ref] }))}
              dias={dias}
              tenantId={tenantId}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { gap: shSpace[6] },
  bloque: { gap: shSpace[2] },
  grilla: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[2] },
  celda: { minWidth: 140, flexGrow: 1, flexBasis: "45%" },
  seccionAgente: { borderWidth: 1, borderRadius: 12, padding: shSpace[2] },
  contenidoAgente: { gap: shSpace[3], paddingTop: shSpace[2], paddingRight: shSpace[2] },
});
