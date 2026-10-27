import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { shSpace, shType } from "@core/theme/tokens";
import { Badge, KpiTile, NavGroup, useKit } from "@shared/ui";
import type { AgenteResumen, KpiResumen, ModuloResumen, ResumenPorAgente } from "../api";
import { propsDeKpi } from "../kpi";

/**
 * Resumen por agente (ADR-0171): primero el negocio entero (lo que gobierna el Coordinador) y
 * luego una sección plegable por agente con su actividad y los módulos que gestiona. Cada cifra
 * con pantalla en la app lleva a ella.
 */

const TIPO_DE_AGENTE: Record<string, string> = {
  specialist: "Especialista",
  backoffice: "Back-office",
  core: "Coordinador",
};

function Grilla({ kpis, prefijo }: { kpis: KpiResumen[]; prefijo: string }) {
  return (
    <View style={styles.grilla}>
      {kpis.map((k) => (
        <View key={k.id} style={styles.celda}>
          <KpiTile testID={`${prefijo}-${k.id}`} {...propsDeKpi(k)} />
        </View>
      ))}
    </View>
  );
}

function Modulo({ modulo, prefijo }: { modulo: ModuloResumen; prefijo: string }) {
  const { c, tonos } = useKit();
  return (
    <View style={styles.bloque}>
      <Text style={[shType.label, { color: c.textStrong }]}>Módulo · {modulo.nombre}</Text>
      {modulo.error ? (
        <Text accessibilityRole="alert" style={[shType.dense, { color: tonos.danger.fg }]}>
          {modulo.error}
        </Text>
      ) : (
        <Grilla kpis={modulo.kpis} prefijo={`${prefijo}-${modulo.id}`} />
      )}
    </View>
  );
}

function SeccionDeAgente({
  agente,
  abierto,
  alAlternar,
}: {
  agente: AgenteResumen;
  abierto: boolean;
  alAlternar: () => void;
}) {
  const { c } = useKit();
  const prefijo = `resumen-${agente.ref}`;
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
          {agente.kpis.length > 0 ? <Grilla kpis={agente.kpis} prefijo={prefijo} /> : null}
          {agente.modulos.map((m) => (
            <Modulo key={m.id} modulo={m} prefijo={prefijo} />
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

export function ResumenAgentes({ datos }: { datos: ResumenPorAgente }) {
  const { c } = useKit();
  const agentes = datos.agentes.filter((a) => a.kpis.length > 0 || a.modulos.length > 0);
  // El primero abierto; el resto, plegado, para que la pantalla no se haga interminable.
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>(() =>
    agentes[0] ? { [agentes[0].ref]: true } : {},
  );

  return (
    <View testID="resumen-agentes" style={styles.raiz}>
      {datos.general.kpis.length > 0 ? (
        <View style={styles.bloque}>
          <Text accessibilityRole="header" style={[shType.h1, { color: c.textStrong }]}>
            Agente general
          </Text>
          <Text style={[shType.dense, { color: c.textMuted }]}>Todo el negocio, últimos 7 días.</Text>
          <Grilla kpis={datos.general.kpis} prefijo="resumen-general" />
        </View>
      ) : null}
      {agentes.length > 0 ? (
        <View style={styles.bloque}>
          <Text accessibilityRole="header" style={[shType.h1, { color: c.textStrong }]}>
            Agentes
          </Text>
          {agentes.map((a) => (
            <SeccionDeAgente
              key={a.ref}
              agente={a}
              abierto={abiertos[a.ref] ?? false}
              alAlternar={() => setAbiertos((p) => ({ ...p, [a.ref]: !p[a.ref] }))}
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
