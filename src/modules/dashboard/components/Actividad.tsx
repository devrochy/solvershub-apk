import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { emitirNavegacion } from "@shared/navegacion-evento";
import { urlPanelDestino } from "@shared/panel-urls";
import { Card, EmptyState, Icono, useKit } from "@shared/ui";
import type { AgenteResumen, PuntoActividad, ResumenPorAgente } from "../api";
import { DIAS_DEL_RESUMEN, etiquetaDeDias, rangoDePeriodo } from "../periodos";
import { CajaWidget } from "../screens/WidgetsResumen";

export type Metrica = "turnos" | "conversaciones" | "costo";

const METRICAS: { id: Metrica; label: string }[] = [
  { id: "turnos", label: "Turnos" },
  { id: "conversaciones", label: "Conversaciones" },
  { id: "costo", label: "Costo IA" },
];

const CLAVE_OTROS = "__otros";
const MAX_SERIES = 4;

const numero = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const dolares = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatoDe(metrica: Metrica): (v: number) => string {
  return metrica === "costo" ? (v) => `US$ ${dolares.format(v)}` : (v) => numero.format(v);
}

function valorDe(punto: PuntoActividad | undefined, metrica: Metrica): number | null {
  if (!punto) return null;
  return punto[metrica] ?? null;
}

function serieDe(agente: AgenteResumen | undefined): PuntoActividad[] {
  return agente?.serie ?? [];
}

function totalDe(agente: AgenteResumen | undefined, metrica: Metrica): number {
  return serieDe(agente).reduce((suma, p) => suma + (valorDe(p, metrica) ?? 0), 0);
}

function sinActividad(agente: AgenteResumen): boolean {
  return serieDe(agente).every(
    (p) => p.turnos === 0 && p.conversaciones === 0 && (p.costo ?? 0) === 0,
  );
}

function esNumero(v: number | null | undefined): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** Línea de actividad con un solo eje Y, sin animación de entrada. */
export function LineChartActividad({
  etiqueta,
  series,
  data,
  formato,
  entero = true,
  height = 190,
}: {
  etiqueta: string;
  series: { key: string; label: string; color: string }[];
  data: { x: string; values: Record<string, number | null> }[];
  formato: (v: number) => string;
  entero?: boolean;
  height?: number;
}) {
  const { c } = useKit();
  const [ancho, setAncho] = useState(0);
  const izquierda = 44;
  const derecha = 8;
  const arriba = 10;
  const abajo = 22;
  const util = Math.max(10, ancho - izquierda - derecha);
  const altoUtil = height - arriba - abajo;
  const n = data.length;
  const valores = data.flatMap((d) => series.map((s) => d.values[s.key])).filter(esNumero);
  const maximo = Math.max(0, ...valores);
  const paso = maximo <= 0 ? 1 : entero ? Math.max(1, Math.ceil(maximo / 3)) : maximo / 3;
  const techo = paso * 3;
  const ticks = [0, paso, paso * 2, techo];
  const x = (i: number) => izquierda + (n <= 1 ? util / 2 : (i / (n - 1)) * util);
  const y = (v: number) => arriba + altoUtil - (v / techo) * altoUtil;

  const pathDe = (key: string): string => {
    let d = "";
    let abierto = false;
    data.forEach((punto, i) => {
      const v = punto.values[key];
      if (!esNumero(v)) {
        abierto = false;
        return;
      }
      d += `${abierto ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      abierto = true;
    });
    return d.trim();
  };

  const ultimoDe = (key: string): { i: number; v: number } | null => {
    for (let i = n - 1; i >= 0; i--) {
      const v = data[i]?.values[key];
      if (esNumero(v)) return { i, v };
    }
    return null;
  };

  const indicesEtiqueta = n <= 1 ? [0] : [0, Math.floor((n - 1) / 2), n - 1];

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setAncho(Math.round(e.nativeEvent.layout.width))}
      accessible
      accessibilityRole="image"
      accessibilityLabel={etiqueta}
      testID="actividad-grafica"
    >
      {ancho > 0 && (
        <Svg width={ancho} height={height}>
          {ticks.map((t) => (
            <Line
              key={`grid-${t}`}
              x1={izquierda}
              x2={ancho - derecha}
              y1={y(t)}
              y2={y(t)}
              stroke={c.dataGrid}
              strokeWidth={1}
            />
          ))}
          {ticks.map((t) => (
            <SvgText
              key={`tick-${t}`}
              x={izquierda - 6}
              y={y(t) + 3}
              fontSize={10}
              fill={c.textSoft}
              textAnchor="end"
            >
              {formato(t)}
            </SvgText>
          ))}
          {indicesEtiqueta.map((i) => (
            <SvgText
              key={`x-${i}`}
              x={x(i)}
              y={height - 4}
              fontSize={10}
              fill={c.textSoft}
              textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
            >
              {data[i]?.x.slice(5).replace("-", "/")}
            </SvgText>
          ))}
          {series.map((s) => {
            return (
              <Path
                key={s.key}
                d={pathDe(s.key)}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            );
          })}
          {series.map((s) => {
            const ultimo = ultimoDe(s.key);
            return ultimo ? (
              <Circle
                key={`punto-${s.key}`}
                cx={x(ultimo.i)}
                cy={y(ultimo.v)}
                r={3}
                fill={s.color}
                stroke={c.surface}
                strokeWidth={2}
              />
            ) : null;
          })}
        </Svg>
      )}
    </View>
  );
}

/** Mini tendencia para una fila de la tabla. Decorativa: las cifras ya están escritas. */
export function SparklineActividad({
  values,
  color,
  height = 24,
}: {
  values: (number | null)[];
  color: string;
  height?: number;
}) {
  const ancho = 88;
  const validos = values.filter(esNumero);
  const maximo = Math.max(0, ...validos) || 1;
  const n = values.length;
  const x = (i: number) => (n <= 1 ? ancho / 2 : (i / (n - 1)) * ancho);
  const y = (v: number) => 2 + (height - 4) * (1 - v / maximo);
  let d = "";
  let abierto = false;
  values.forEach((v, i) => {
    if (!esNumero(v)) {
      abierto = false;
      return;
    }
    d += `${abierto ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
    abierto = true;
  });
  return (
    <Svg width={ancho} height={height}>
      <Path d={d.trim()} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  );
}

function Chip({
  label,
  activo,
  onPress,
  testID,
}: {
  label: string;
  activo: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const { c } = useKit();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: activo ? c.focus : c.border, backgroundColor: activo ? c.hover : c.surface },
      ]}
    >
      <Text style={[shType.caption, { color: activo ? c.textStrong : c.textMuted }]}>{label}</Text>
    </Pressable>
  );
}

function FilaDeAgente({
  agente,
  metrica,
  color,
  tenantId,
  verCosto,
}: {
  agente: AgenteResumen;
  metrica: Metrica;
  color: string;
  tenantId: string | null;
  verCosto: boolean;
}) {
  const { c } = useKit();
  const formato = formatoDe(metrica);
  const total = totalDe(agente, metrica);
  const turnos = totalDe(agente, "turnos");
  const conversaciones = totalDe(agente, "conversaciones");
  const costo = totalDe(agente, "costo");
  const url = urlPanelDestino(
    { ruta: "agente", params: { ref: agente.ref, pestana: "conversaciones" } },
    tenantId,
  );
  const ultima = agente.ultima_actividad
    ? new Date(agente.ultima_actividad).toLocaleDateString("es-CO", { day: "numeric", month: "short" })
    : "sin actividad";
  const resumen = [
    agente.name,
    `${turnos} turnos`,
    `${conversaciones} conversaciones`,
    verCosto ? `US$ ${dolares.format(costo)}` : null,
    `última actividad ${ultima}`,
  ]
    .filter(Boolean)
    .join(", ");

  const contenido = (
    <View style={[styles.fila, { borderColor: c.borderSoft }]}>
      <View style={styles.filaTexto}>
        <Text style={[shType.label, { color: c.textStrong }]} numberOfLines={1}>
          {agente.name}
        </Text>
        <Text style={[shType.caption, { color: c.textMuted }]} numberOfLines={1}>
          {agente.key === "general" ? "Coordinación y sin asignar" : agente.kind === "specialist" ? "Especialista" : agente.kind}
          {sinActividad(agente) ? " · Sin actividad" : ""}
        </Text>
        <Text style={[shType.caption, styles.tabular, { color: c.textMuted }]} numberOfLines={1}>
          {`${numero.format(turnos)} turnos · ${numero.format(conversaciones)} conv.`}
          {verCosto ? ` · US$ ${dolares.format(costo)}` : ""}
          {` · ${ultima}`}
        </Text>
      </View>
      <View style={styles.filaDerecha}>
        <Text style={[shType.label, styles.tabular, { color: c.textStrong }]}>
          {total > 0 ? formato(total) : "—"}
        </Text>
        {sinActividad(agente) ? (
          <Text style={[shType.caption, { color: c.textSoft }]}>Sin actividad</Text>
        ) : (
          <SparklineActividad
            values={serieDe(agente).map((p) => valorDe(p, metrica))}
            color={color}
          />
        )}
      </View>
      {url ? <Icono name="open-in-new" size={16} color={c.textSoft} /> : null}
    </View>
  );

  return url ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={resumen}
      accessibilityHint="Abre el agente en el panel web"
      onPress={() => void Linking.openURL(url)}
    >
      {contenido}
    </Pressable>
  ) : (
    <View accessible accessibilityLabel={resumen}>
      {contenido}
    </View>
  );
}

/** Selector de ventana del Resumen (7/15/30), compartido por todos los perfiles. */
export function SelectorPeriodo({
  dias,
  alCambiar,
  periodo,
}: {
  dias: number;
  alCambiar: (dias: number) => void;
  periodo: { desde?: string; hasta?: string };
}) {
  const { c } = useKit();
  return (
    <View style={styles.controles}>
      <View style={styles.grupo} accessibilityRole="toolbar" accessibilityLabel="Período del resumen">
        {DIAS_DEL_RESUMEN.map((d) => (
          <Chip
            key={d}
            testID={`periodo-${d}`}
            label={etiquetaDeDias(d)}
            activo={d === dias}
            onPress={() => alCambiar(d)}
          />
        ))}
      </View>
      <Text style={[shType.caption, styles.tabular, { color: c.textMuted }]}>
        {rangoDePeriodo(periodo)}
      </Text>
    </View>
  );
}

/**
 * Actividad de los agentes en el tiempo (ADR-0171, adenda). El período cambia todo el Resumen;
 * la métrica es una decisión de lectura local. La tabla incluye a los agentes configurados sin
 * actividad para que se note quién está quieto.
 */
export function ActividadDeAgentes({
  datos,
  dias,
  tenantId,
}: {
  datos: ResumenPorAgente;
  dias: number;
  tenantId: string | null;
}) {
  const { c } = useKit();
  const [metricaElegida, setMetricaElegida] = useState<Metrica>("turnos");
  const agentes = datos.agentes ?? [];
  const verCosto = agentes.some((a) => serieDe(a).some((p) => typeof p.costo === "number"));
  const metrica: Metrica = metricaElegida === "costo" && !verCosto ? "turnos" : metricaElegida;

  const activos = agentes
    .filter((a) => totalDe(a, "turnos") > 0)
    .sort((a, b) => totalDe(b, "turnos") - totalDe(a, "turnos") || a.name.localeCompare(b.name));
  const top = activos.slice(0, MAX_SERIES);
  const otros = activos.slice(MAX_SERIES);
  const colores = [c.dataCat1, c.dataCat2, c.dataCat3, c.dataCat4];
  const series = top.map((a, i) => ({ key: a.ref, label: a.name, color: colores[i] }));
  if (otros.length > 0) {
    series.push({ key: CLAVE_OTROS, label: "Otros", color: c.dataAxis });
  }

  const base = serieDe(activos[0] ?? agentes[0]);
  const data = base.map((punto, i) => {
    const values: Record<string, number | null> = {};
    for (const s of series) {
      if (s.key === CLAVE_OTROS) {
        const sumandos = otros
          .map((a) => valorDe(serieDe(a)[i], metrica))
          .filter((v): v is number => v !== null);
        values[s.key] = sumandos.length ? sumandos.reduce((a, b) => a + b, 0) : null;
        continue;
      }
      const agente = activos.find((a) => a.ref === s.key);
      values[s.key] = agente ? valorDe(serieDe(agente)[i], metrica) : null;
    }
    return { x: punto.fecha, values };
  });

  const formato = formatoDe(metrica);
  const etiquetaMetrica = METRICAS.find((m) => m.id === metrica)?.label ?? "Turnos";
  const colorDe = (key: string) => series.find((s) => s.key === key)?.color ?? c.dataAxis;
  const totalDeSerie = (key: string) =>
    key === CLAVE_OTROS
      ? otros.reduce((suma, a) => suma + totalDe(a, metrica), 0)
      : totalDe(activos.find((a) => a.ref === key), metrica);
  const resumenGrafico = `Del ${rangoDePeriodo(datos.periodo)}. ${series
    .map((s) => `${s.label}: ${formato(totalDeSerie(s.key))}`)
    .join(". ")}`;

  return (
    <CajaWidget clave="chart.tendencia_atencion" titulo="Tendencia de atención">
      <View style={styles.controles}>
        <View style={styles.grupo} accessibilityRole="toolbar" accessibilityLabel="Métrica de la actividad">
          {METRICAS.filter((m) => m.id !== "costo" || verCosto).map((m) => (
            <Chip
              key={m.id}
              testID={`metrica-${m.id}`}
              label={m.label}
              activo={metrica === m.id}
              onPress={() => setMetricaElegida(m.id)}
            />
          ))}
        </View>
      </View>

      <Card>
        <View style={styles.tarjeta}>
          <Text style={[shType.caption, { color: c.textMuted }]}>
            {etiquetaMetrica} por día · {etiquetaDeDias(dias)}
          </Text>
          {activos.length === 0 ? (
            <EmptyState
              icon="show-chart"
              title="Sin actividad en este período"
              description="Cuando tus agentes atiendan conversaciones, aquí verás su actividad por día."
              action={{ label: "Ver agentes", onPress: () => emitirNavegacion({ tab: "agentes" }) }}
            />
          ) : (
            <>
              <LineChartActividad
                etiqueta={`${etiquetaMetrica} por agente y día. ${resumenGrafico}`}
                series={series}
                data={data}
                formato={formato}
                entero={metrica !== "costo"}
              />
              <View style={styles.leyenda}>
                {series.map((s) => (
                  <View key={s.key} style={styles.leyendaItem}>
                    <View style={[styles.punto, { backgroundColor: s.color }]} />
                    <Text style={[shType.caption, { color: c.textMuted }]}>{s.label}</Text>
                  </View>
                ))}
              </View>
              <Text style={[shType.caption, { color: c.textSoft }]}>
                El General incluye lo no asignado. Los turnos del Coordinador van en el bloque del negocio.
                {otros.length > 0 ? " Los 4 agentes con más turnos van en la gráfica; el resto se suma en «Otros»." : ""}
              </Text>
            </>
          )}
        </View>
      </Card>

      <Text accessibilityRole="header" style={[shType.block, { color: c.textStrong }]}>
        Actividad por agente
      </Text>
      <Card>
        <View>
          {agentes.map((a) => (
            <FilaDeAgente
              key={a.ref}
              agente={a}
              metrica={metrica}
              color={colorDe(a.ref)}
              tenantId={tenantId}
              verCosto={verCosto}
            />
          ))}
        </View>
      </Card>
    </CajaWidget>
  );
}

const styles = StyleSheet.create({
  controles: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: shSpace[2] },
  grupo: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[1] },
  chip: {
    minHeight: 44,
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: shRadius.md,
    paddingHorizontal: shSpace[3],
    paddingVertical: shSpace[1],
  },
  tarjeta: { padding: shSpace[3], gap: shSpace[2] },
  tarjetaTitulo: { gap: shSpace[1] },
  leyenda: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[3] },
  leyendaItem: { flexDirection: "row", alignItems: "center", gap: shSpace[1] },
  punto: { width: 8, height: 8, borderRadius: shRadius.pill },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[2],
    paddingVertical: shSpace[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filaTexto: { flex: 1, gap: 2 },
  filaDerecha: { alignItems: "flex-end", gap: 2 },
  tabular: { fontVariant: ["tabular-nums"] },
});
