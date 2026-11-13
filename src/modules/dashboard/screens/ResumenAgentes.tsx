import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { shSpace, shType } from "@core/theme/tokens";
import { Badge, KpiTile, NavGroup, useKit } from "@shared/ui";
import type { AgenteResumen, KpiResumen, ModuloResumen, ResumenPorAgente } from "../api";
import { SeccionResumen } from "../components/SeccionResumen";
import { propsDeKpi } from "../kpi";
import { agentesConTarjeta, cifrasDelTitulo, llevaInsignia, modulosSinAgente } from "../resumenAgente";

/**
 * Sección «Agentes» del Resumen (ADR-0171, SPEC-29): una tarjeta plegable por agente con lo que
 * gestiona. Plegada resume su módulo en dos cifras; abierta, trae sus cifras y su módulo. El negocio
 * entero («Agente general») y la evolución diaria van en sus propias secciones, más arriba.
 * Cada cifra con pantalla en la app (o en el panel) lleva a ella.
 */

const TIPO_DE_AGENTE: Record<string, string> = {
  specialist: "Especialista",
  backoffice: "Back-office",
  core: "Coordinador",
};

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

export function Grilla({
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
          <KpiTile testID={`${prefijo}-${k.id}`} {...propsDeKpi(k, { dias, tenantId })} />
        </View>
      ))}
    </View>
  );
}

export function Modulo({
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
      <Text accessibilityRole="header" style={[shType.label, { color: c.textStrong }]}>
        Módulo · {modulo.nombre}
      </Text>
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

/** Módulos que ningún agente gestiona todavía: cuelgan del General en el backend. */
export function ModulosSinAgente({
  datos,
  dias,
  tenantId,
}: {
  datos: ResumenPorAgente;
  dias: number;
  tenantId: string | null;
}) {
  const { c } = useKit();
  const modulos = modulosSinAgente(datos);
  if (modulos.length === 0) return null;
  return (
    <View testID="resumen-sin-agente" style={styles.bloque}>
      <Text style={[shType.dense, { color: c.textMuted }]}>Módulos que ningún agente gestiona todavía.</Text>
      {modulos.map((m) => (
        <Modulo key={m.id} modulo={m} prefijo="resumen-general" dias={dias} tenantId={tenantId} />
      ))}
    </View>
  );
}

function TituloPlegado({ agente }: { agente: AgenteResumen }) {
  const { c } = useKit();
  const cifras = cifrasDelTitulo(agente);
  const ultima = agente.ultima_actividad
    ? `Última actividad ${fechaCorta(agente.ultima_actividad)}`
    : "Sin actividad en el período";
  return (
    <View style={styles.titulo}>
      {cifras.length > 0 ? (
        <Text style={[shType.caption, styles.tabular, { color: c.textMuted }]}>
          {cifras.map((x) => `${x.label} ${x.valor}`).join(" · ")}
        </Text>
      ) : null}
      <Text style={[shType.caption, { color: c.textSoft }]}>{ultima}</Text>
    </View>
  );
}

function TarjetaDeAgente({
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
  const cifras = cifrasDelTitulo(agente);
  const hablado = [
    ...cifras.map((x) => `${x.label} ${x.valor}`),
    agente.ultima_actividad ? `Última actividad ${fechaCorta(agente.ultima_actividad)}` : "Sin actividad en el período",
  ].join(". ");
  return (
    <View testID={prefijo} style={[styles.tarjeta, { borderColor: c.borderSoft, backgroundColor: c.surface }]}>
      <NavGroup
        testID={`${prefijo}-cabecera`}
        label={agente.name}
        abierto={abierto}
        onToggle={alAlternar}
        resumen={<TituloPlegado agente={agente} />}
        resumenHablado={hablado}
      >
        <View style={styles.contenido}>
          {llevaInsignia(agente) ? <Badge label={TIPO_DE_AGENTE[agente.kind] ?? "Agente"} /> : null}
          <Text style={[shType.caption, { color: c.textMuted }]}>
            Últimos {dias} días ·{" "}
            {agente.ultima_actividad
              ? `última actividad ${fechaCorta(agente.ultima_actividad)}`
              : "sin actividad en el período"}
          </Text>
          {agente.kpis.length > 0 ? (
            <Grilla kpis={agente.kpis} prefijo={prefijo} dias={dias} tenantId={tenantId} />
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
    (datos.general.modulos_sin_agente?.length ?? 0) > 0 ||
    datos.agentes.some((a) => a.kpis.length > 0 || a.modulos.length > 0)
  );
}

export function ResumenAgentes({
  datos,
  dias,
  tenantId,
}: {
  datos: ResumenPorAgente;
  dias: number;
  tenantId: string | null;
}) {
  const agentes = agentesConTarjeta(datos);
  // El primero abierto; el resto, plegado, para que la pantalla no se haga interminable.
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>(() =>
    agentes[0] ? { [agentes[0].ref]: true } : {},
  );
  if (agentes.length === 0) return null;

  return (
    <SeccionResumen
      testID="resumen-agentes"
      titulo="Agentes"
      apoyo="Cada agente con lo que gestiona. Toca uno para ver el detalle de cada cifra."
    >
      <View style={styles.lista}>
        {agentes.map((a) => (
          <TarjetaDeAgente
            key={a.ref}
            agente={a}
            abierto={abiertos[a.ref] ?? false}
            alAlternar={() => setAbiertos((p) => ({ ...p, [a.ref]: !p[a.ref] }))}
            dias={dias}
            tenantId={tenantId}
          />
        ))}
      </View>
    </SeccionResumen>
  );
}

const styles = StyleSheet.create({
  lista: { gap: shSpace[2] },
  bloque: { gap: shSpace[2] },
  grilla: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[2] },
  celda: { minWidth: 140, flexGrow: 1, flexBasis: "45%" },
  tarjeta: { borderWidth: 1, borderRadius: 12, padding: shSpace[2] },
  titulo: { gap: 2 },
  tabular: { fontVariant: ["tabular-nums"] },
  contenido: { gap: shSpace[3], paddingTop: shSpace[2], paddingRight: shSpace[2] },
});
