import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import type { components } from "@core/api/schema";
import { puedeVerSeccion } from "@core/permisos";
import { useAdminSession } from "@core/session/admin-session-context";
import { useAdminApi } from "@core/session/use-admin-api";
import { shSpace, shType } from "@core/theme/tokens";
import { emitirNavegacion } from "@shared/navegacion-evento";
import { Badge, Button, EmptyState, KpiTile, Skeleton, useKit } from "@shared/ui";
import { cargarDashboard, cargarResumenAgentes, cargarResumenCobranza, type KpiResumen } from "../api";
import { kpiDeRespaldo, kpiDeWidget } from "../datos";
import { propsDeKpi } from "../kpi";
import { derivarPerfil, ETIQUETA_PERFIL } from "../perfil";
import { useCarga } from "../use-carga";
import { widgetsDelPerfil, type DefWidget } from "../widgets";
import { ActividadDeAgentes, SelectorPeriodo } from "../components/Actividad";
import { diasValidos, type DiasDelResumen } from "../periodos";
import { ResumenAgentes, tieneResumen } from "./ResumenAgentes";
import {
  CajaWidget,
  WidgetAcciones,
  WidgetActividad,
  WidgetAlertas,
  WidgetConError,
  WidgetConsumo,
  WidgetEscalaciones,
  WidgetEstado,
  type EscalacionResumen,
} from "./WidgetsResumen";

type PaginaEscalaciones = { items: EscalacionResumen[] };
type EstadoBot = components["schemas"]["BotPausedState"];

/** Un negocio sin conversaciones no ve un «0» suelto: se le invita a conectar el canal. */
function esVacioDeConversaciones(def: DefWidget, k: KpiResumen): boolean {
  return def.clave === "kpi.conversaciones" && k.valor === 0 && (k.previo === 0 || k.previo === null);
}

export function DashboardScreen() {
  const { c } = useKit();
  const { sesion } = useAdminSession();
  const api = useAdminApi();
  const [version, setVersion] = useState(0);
  const [dias, setDias] = useState<DiasDelResumen>(7);
  const [refrescando, setRefrescando] = useState(false);
  const [botPausadoLocal, setBotPausadoLocal] = useState<boolean | null>(null);
  const [guardandoBot, setGuardandoBot] = useState(false);

  const esMaster = sesion?.role === "master";
  const permisos = sesion?.permissions ?? {};
  const perfil = derivarPerfil({ role: sesion?.role, tenantRole: sesion?.tenantRole, permissions: permisos });
  const widgets = widgetsDelPerfil(perfil, { permissions: permisos, esMaster });
  const usa = (fuente: DefWidget["fuente"]) => widgets.some((w) => w.fuente === fuente);

  const dashboard = useCarga(() => cargarDashboard(api), usa("dashboard") || usa("agentes"), version);
  const agentes = useCarga(() => cargarResumenAgentes(api, dias), usa("agentes"), version, dias);
  const escalaciones = useCarga(
    () => api.get<PaginaEscalaciones>("/admin/escalations", { page_size: 5 }),
    usa("escalaciones"),
    version,
  );

  const resumen = tieneResumen(agentes.datos) ? agentes.datos : null;
  const modulosEnResumen = new Set(resumen?.agentes.flatMap((a) => a.modulos.map((m) => m.id)) ?? []);
  const quiereCobranza = widgets.some((w) => w.kpi?.modulo === "pack_cobranza");
  // Quien ve Cobranza pero no recibe el módulo en el Resumen por agente (p. ej. sin la sección
  // de agentes) conserva las cifras del resumen del pack, como antes.
  const cobranza = useCarga(
    () => cargarResumenCobranza(api),
    quiereCobranza && agentes.estado !== "cargando" && !modulosEnResumen.has("pack_cobranza") &&
      puedeVerSeccion(permisos, "pack_cobranza:resumen", esMaster),
    version,
  );

  const refrescar = useCallback(() => {
    setRefrescando(true);
    setVersion((v) => v + 1);
    // Los tres pedidos terminan casi a la vez; el spinner no necesita seguirlos uno a uno.
    setTimeout(() => setRefrescando(false), 800);
  }, []);

  const alternarBot = useCallback(async () => {
    const pausado = botPausadoLocal ?? dashboard.datos?.bot_paused ?? false;
    setGuardandoBot(true);
    try {
      const nuevo = await api.put<EstadoBot>("/admin/settings/bot-paused", { paused: !pausado });
      setBotPausadoLocal(nuevo?.paused ?? !pausado);
    } catch {
      // La alerta del Resumen sigue mostrando el estado real; reintentar es un toque.
    } finally {
      setGuardandoBot(false);
    }
  }, [api, botPausadoLocal, dashboard.datos?.bot_paused]);

  const hayFuente = usa("dashboard") || usa("agentes") || usa("escalaciones");
  const todoFalla =
    hayFuente &&
    (!usa("dashboard") || dashboard.estado === "error") &&
    (!usa("agentes") || agentes.estado === "error") &&
    (!usa("escalaciones") || escalaciones.estado === "error") &&
    dashboard.datos === null;

  const datosDashboard = dashboard.datos
    ? { ...dashboard.datos, bot_paused: botPausadoLocal ?? dashboard.datos.bot_paused }
    : null;

  if (todoFalla) {
    return (
      <View style={[styles.centro, { backgroundColor: c.bg }]}>
        <Text testID="dashboard-error" style={[shType.dense, styles.centrado, { color: c.textMuted }]}>
          No pudimos cargar tu resumen. Revisa tu conexión e intenta de nuevo.
        </Text>
        <Button
          testID="dashboard-reintentar"
          onPress={() => {
            dashboard.reintentar();
            agentes.reintentar();
            escalaciones.reintentar();
          }}
        >
          Reintentar
        </Button>
      </View>
    );
  }

  // Agrupa los KPI contiguos en una grilla de dos columnas; el resto va en su propio bloque.
  const bloques: (DefWidget | DefWidget[])[] = [];
  for (const w of widgets) {
    const ultimo = bloques[bloques.length - 1];
    if (w.forma === "kpi" && Array.isArray(ultimo)) ultimo.push(w);
    else bloques.push(w.forma === "kpi" ? [w] : w);
  }

  const kpiCelda = (def: DefWidget): React.ReactNode => {
    if (def.clave === "kpi.consumo") {
      return dashboard.estado === "ok" ? <WidgetConsumo dashboard={datosDashboard} /> : null;
    }
    const cargando = agentes.estado === "cargando" && !agentes.datos;
    if (cargando) return <KpiTile testID={`kpi-${def.clave}`} label={def.titulo} value="" loading />;
    const k = kpiDeWidget(def, resumen) ?? (resumen ? undefined : kpiDeRespaldo(def, datosDashboard));
    if (!k) return null;
    if (esVacioDeConversaciones(def, k)) {
      return (
        <EmptyState
          testID="conversaciones-vacia"
          icon="chat-bubble-outline"
          title="Aún no hay conversaciones"
          description="Conecta WhatsApp para empezar a ver conversaciones."
          action={{ label: "Ir a Conexiones", onPress: () => emitirNavegacion({ tab: "configuracion", pestana: "conexiones" }) }}
        />
      );
    }
    return (
      <KpiTile
        testID={`kpi-${def.clave}`}
        {...propsDeKpi(k, { dias, tenantId: sesion?.tenantId ?? null })}
      />
    );
  };

  const bloqueKpis = (defs: DefWidget[], clave: string) => {
    const celdas = defs.map((d) => ({ d, nodo: kpiCelda(d) })).filter((x) => x.nodo !== null);
    const sinCifras = agentes.estado === "error" && !defs.some((d) => d.fuente === "dashboard") && celdas.length === 0;
    if (sinCifras) {
      return (
        <WidgetConError key={clave} clave="kpis" titulo="Tus cifras" alReintentar={agentes.reintentar} />
      );
    }
    // Cobranza sin módulo en el Resumen por agente: sus cifras planas de siempre.
    const planas =
      defs.some((d) => d.kpi?.modulo === "pack_cobranza") && cobranza.datos?.kpis?.length ? (
        <View style={styles.grilla}>
          {cobranza.datos.kpis.map((k) => (
            <View key={k.label} style={styles.celda}>
              <KpiTile label={k.label} value={k.value} />
            </View>
          ))}
        </View>
      ) : null;
    if (celdas.length === 0 && !planas) return null;
    return (
      <View key={clave} style={styles.bloque}>
        {celdas.length > 0 ? (
          <View style={styles.grilla}>
            {celdas.map(({ d, nodo }) => (
              <View key={d.clave} style={styles.celda}>
                {nodo}
              </View>
            ))}
          </View>
        ) : null}
        {planas ? (
          <CajaWidget clave="cobranza-resumen" titulo="Cobranza">
            {planas}
          </CajaWidget>
        ) : null}
      </View>
    );
  };

  const renderWidget = (w: DefWidget) => {
    switch (w.clave) {
      case "lista.alertas":
        return dashboard.estado === "ok" ? <WidgetAlertas key={w.clave} dashboard={datosDashboard} /> : null;
      case "lista.actividad":
        return (
          <WidgetActividad
            key={w.clave}
            dashboard={datosDashboard}
            estado={dashboard.estado}
            alReintentar={dashboard.reintentar}
          />
        );
      case "lista.escalaciones":
        return (
          <WidgetEscalaciones
            key={w.clave}
            items={escalaciones.datos?.items ?? []}
            estado={escalaciones.estado}
            alReintentar={escalaciones.reintentar}
          />
        );
      case "estado.sistema":
        return dashboard.estado === "ok" ? <WidgetEstado key={w.clave} dashboard={datosDashboard} /> : null;
      case "chart.tendencia_atencion":
        if (agentes.estado === "error") {
          return (
            <WidgetConError
              key={w.clave}
              clave={w.clave}
              titulo={w.titulo}
              alReintentar={agentes.reintentar}
            />
          );
        }
        if (agentes.estado === "cargando" && !resumen) {
          return <Skeleton key={w.clave} shape="rect" height={260} />;
        }
        return resumen ? (
          <ActividadDeAgentes
            key={w.clave}
            datos={resumen}
            dias={dias}
            tenantId={sesion?.tenantId ?? null}
          />
        ) : null;
      case "acciones.rapidas":
        return (
          <WidgetAcciones
            key={w.clave}
            botPausado={datosDashboard?.bot_paused ?? false}
            puedePausar={dashboard.estado === "ok" && (esMaster || permisos.settings === "write")}
            puedeVerEscalaciones={puedeVerSeccion(permisos, "escalations", esMaster)}
            guardando={guardandoBot}
            alAlternarBot={() => void alternarBot()}
          />
        );
      default:
        return null;
    }
  };

  return (
    <ScrollView
      testID="dashboard"
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={styles.contenido}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} />}
    >
      <View style={styles.encabezado}>
        <Text accessibilityRole="header" style={[shType.h1, { color: c.textStrong }]}>
          Resumen
        </Text>
        <Text style={[shType.dense, { color: c.textMuted }]}>{sesion?.tenantName ?? "Tu negocio"}</Text>
        <Badge testID="resumen-perfil" label={ETIQUETA_PERFIL[perfil]} />
      </View>

      {usa("agentes") ? (
        <SelectorPeriodo
          dias={dias}
          alCambiar={(d) => setDias(diasValidos(d))}
          periodo={resumen?.periodo ?? {}}
        />
      ) : null}

      {widgets.length === 0 ? (
        <Skeleton shape="rect" height={80} />
      ) : (
        bloques.map((b, i) => (Array.isArray(b) ? bloqueKpis(b, `kpis-${i}`) : renderWidget(b)))
      )}

      {perfil === "dueno" && resumen ? (
        <ResumenAgentes
          datos={resumen}
          soloAgentes
          dias={dias}
          tenantId={sesion?.tenantId ?? null}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: "center", justifyContent: "center", padding: shSpace[6], gap: shSpace[4] },
  centrado: { textAlign: "center" },
  contenido: { padding: shSpace[4], paddingBottom: shSpace[12], gap: shSpace[6] },
  encabezado: { gap: shSpace[1], alignItems: "flex-start" },
  bloque: { gap: shSpace[3] },
  grilla: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[2] },
  celda: { minWidth: 140, flexGrow: 1, flexBasis: "45%" },
});
