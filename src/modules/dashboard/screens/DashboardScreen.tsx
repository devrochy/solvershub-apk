import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "@core/theme/theme-context";
import { useAdminSession } from "@core/session/admin-session-context";
import { useAdminApi } from "@core/session/use-admin-api";
import { puedeVerSeccion } from "@core/permisos";
import { cargarDashboard, cargarResumenCobranza, type DashboardResponse } from "../api";

function StatCard({
  titulo,
  valor,
  destacado,
}: {
  titulo: string;
  valor: string;
  destacado?: boolean;
}) {
  const { colores } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colores.tarjeta, borderColor: colores.borde }]}>
      <Text style={[styles.cardValor, { color: destacado ? colores.peligro : colores.texto }]}>
        {valor}
      </Text>
      <Text style={[styles.cardTitulo, { color: colores.textoSuave }]}>{titulo}</Text>
    </View>
  );
}

export function DashboardScreen() {
  const { colores } = useTheme();
  const { sesion } = useAdminSession();
  const api = useAdminApi();
  const [datos, setDatos] = useState<DashboardResponse | null>(null);
  const [cobranza, setCobranza] = useState<{ label: string; value: string }[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esMaster = sesion?.role === "master";
  const permisos = sesion?.permissions ?? {};
  const verCobranza = puedeVerSeccion(permisos, "pack_cobranza:resumen", esMaster);

  const cargar = useCallback(async () => {
    try {
      const principal = await cargarDashboard(api);
      setError(null);
      setDatos(principal);
      if (verCobranza) {
        const resumen = await cargarResumenCobranza(api).catch(() => null);
        setCobranza(resumen?.kpis ?? []);
      }
    } catch {
      setError("No pudimos cargar tu resumen. Revisa tu conexión e intenta de nuevo.");
    }
  }, [api, verCobranza]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial: los setState ocurren después del await (no síncronos)
    void cargar().finally(() => setCargando(false));
  }, [cargar]);

  const refrescar = useCallback(async () => {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }, [cargar]);

  if (cargando) {
    return (
      <View style={[styles.centro, { backgroundColor: colores.fondo }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error && !datos) {
    return (
      <View style={[styles.centro, { backgroundColor: colores.fondo }]}>
        <Text testID="dashboard-error" style={[styles.error, { color: colores.peligro }]}>
          {error}
        </Text>
        <Pressable
          testID="dashboard-reintentar"
          onPress={() => {
            setCargando(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial: los setState ocurren después del await (no síncronos)
            void cargar().finally(() => setCargando(false));
          }}
          style={({ pressed }) => [
            styles.boton,
            { backgroundColor: colores.primario },
            pressed && styles.presionado,
          ]}
        >
          <Text style={styles.botonTexto}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  const kpi = datos?.kpi;

  return (
    <ScrollView
      testID="dashboard"
      style={{ backgroundColor: colores.fondo }}
      contentContainerStyle={styles.contenido}
      refreshControl={
        <RefreshControl refreshing={refrescando} onRefresh={() => void refrescar()} />
      }
    >
      <Text style={[styles.titulo, { color: colores.texto }]}>Resumen</Text>
      <Text style={[styles.subtitulo, { color: colores.textoSuave }]}>
        {sesion?.tenantName ?? "Tu negocio"}
      </Text>

      <View style={styles.grid}>
        <StatCard titulo="Conversaciones · 7 días" valor={String(kpi?.conversations_7d ?? 0)} />
        <StatCard titulo="Mensajes · 7 días" valor={String(kpi?.messages_7d ?? 0)} />
        <StatCard
          titulo="Escalaciones pendientes"
          valor={String(kpi?.pending_escalations ?? 0)}
          destacado={(kpi?.pending_escalations ?? 0) > 0}
        />
        <StatCard titulo="Costo IA · 30 días" valor={`US$ ${(kpi?.cost_30d ?? 0).toFixed(2)}`} />
        <StatCard titulo="Asistente" valor={datos?.bot_paused ? "Pausado" : "Activo"} />
        <StatCard titulo="Modelo" valor={datos?.llm_label ?? "—"} />
        <StatCard titulo="Habilidades activas" valor={String(kpi?.active_plugins ?? 0)} />
      </View>

      {verCobranza && cobranza.length > 0 ? (
        <>
          <Text style={[styles.seccion, { color: colores.texto }]}>Cobranza</Text>
          <View style={styles.grid}>
            {cobranza.map((k) => (
              <StatCard key={k.label} titulo={k.label} valor={k.value} />
            ))}
          </View>
        </>
      ) : null}

      {datos?.recent?.length ? (
        <>
          <Text style={[styles.seccion, { color: colores.texto }]}>Conversaciones recientes</Text>
          {datos.recent.slice(0, 5).map((c) => (
            <View
              key={c.id}
              style={[styles.reciente, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
            >
              <Text style={[styles.recienteNombre, { color: colores.texto }]} numberOfLines={1}>
                {c.customer_name ?? c.external_id ?? "Cliente"}
              </Text>
              <Text style={[styles.recienteEstado, { color: colores.textoSuave }]}>
                {c.status}
              </Text>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 14 },
  contenido: { padding: 16, paddingBottom: 40 },
  titulo: { fontSize: 24, fontWeight: "700" },
  subtitulo: { fontSize: 14, marginBottom: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    minWidth: 140,
    flexGrow: 1,
    flexBasis: "45%",
  },
  cardValor: { fontSize: 22, fontWeight: "700" },
  cardTitulo: { fontSize: 12, marginTop: 4 },
  seccion: { fontSize: 16, fontWeight: "700", marginTop: 20, marginBottom: 10 },
  reciente: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recienteNombre: { fontSize: 14, fontWeight: "600", flex: 1, marginRight: 8 },
  recienteEstado: { fontSize: 12 },
  error: { fontSize: 14, textAlign: "center" },
  boton: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  botonTexto: { color: "#ffffff", fontWeight: "700" },
  presionado: { opacity: 0.85 },
});
