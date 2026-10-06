import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "@core/theme/theme-context";
import { useAdminApi } from "@core/session/use-admin-api";
import { cargarCostos, cargarPlan, type CostsResponse, type PlanResponse } from "../api";

type Pestana = "plan" | "costos";

function Barra({ porcentaje }: { porcentaje: number }) {
  const { colores } = useTheme();
  return (
    <View style={[styles.barraFondo, { backgroundColor: colores.borde }]}>
      <View
        style={[
          styles.barra,
          {
            width: `${Math.min(100, Math.max(0, porcentaje))}%`,
            backgroundColor: porcentaje >= 90 ? colores.peligro : colores.acento,
          },
        ]}
      />
    </View>
  );
}

export function NegocioScreen() {
  const { colores } = useTheme();
  const api = useAdminApi();
  const [pestana, setPestana] = useState<Pestana>("plan");
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [costos, setCostos] = useState<CostsResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([cargarPlan(api), cargarCostos(api)]);
      setError(null);
      setPlan(p);
      setCostos(c);
    } catch {
      setError("No pudimos cargar la información de tu negocio.");
    }
  }, [api]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial: los setState ocurren después del await (no síncronos)
    void cargar().finally(() => setCargando(false));
  }, [cargar]);

  if (cargando) {
    return (
      <View style={[styles.centro, { backgroundColor: colores.fondo }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colores.fondo }} contentContainerStyle={styles.contenido}>
      <View style={[styles.pestanas, { borderColor: colores.borde }]}>
        {(["plan", "costos"] as Pestana[]).map((p) => (
          <Pressable
            key={p}
            testID={`negocio-${p}`}
            onPress={() => setPestana(p)}
            style={[
              styles.pestana,
              pestana === p && { borderBottomColor: colores.acento, borderBottomWidth: 2 },
            ]}
          >
            <Text
              style={{
                color: pestana === p ? colores.texto : colores.textoSuave,
                fontWeight: "600",
              }}
            >
              {p === "plan" ? "Plan y consumo" : "Costos IA"}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <Text testID="negocio-error" style={{ color: colores.peligro, marginBottom: 10 }}>
          {error}
        </Text>
      ) : null}

      {pestana === "plan" ? (
        <>
          <View style={[styles.tarjeta, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
            <Text style={[styles.titulo, { color: colores.texto }]}>
              {plan?.overview?.plan_name ?? "Sin plan"}
            </Text>
            <Text style={{ color: colores.textoSuave }}>
              {plan?.overview?.status ?? "—"}
              {plan?.overview?.days_left != null ? ` · ${plan.overview.days_left} días` : ""}
            </Text>
          </View>

          {(plan?.usage ?? []).map((u) => (
            <View key={u.key} style={styles.uso}>
              <Text style={{ color: colores.texto, fontSize: 13 }}>{u.label}</Text>
              <Barra porcentaje={u.percent ?? 0} />
              <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                {u.limit != null ? `${u.remaining ?? 0} restantes de ${u.limit}` : "Ilimitado"}
              </Text>
            </View>
          ))}

          <Text style={[styles.seccion, { color: colores.texto }]}>Planes</Text>
          {(plan?.plans ?? []).map((p) => (
            <View
              key={p.id}
              style={[styles.planFila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
            >
              <Text style={{ color: colores.texto, fontWeight: p.current ? "700" : "400" }}>
                {p.name}
                {p.current ? " · actual" : ""}
              </Text>
              <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                {p.is_free ? "Gratis" : `$${p.price_cop}`}
              </Text>
            </View>
          ))}
          <Text style={{ color: colores.textoSuave, fontSize: 12, marginTop: 8 }}>
            Para cambiar de plan, usa el checkout desde el panel web.
          </Text>
        </>
      ) : (
        <>
          <View style={styles.grid}>
            <View style={[styles.kpi, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
              <Text style={[styles.kpiValor, { color: colores.texto }]}>
                US$ {(costos?.today ?? 0).toFixed(2)}
              </Text>
              <Text style={{ color: colores.textoSuave, fontSize: 12 }}>Hoy</Text>
            </View>
            <View style={[styles.kpi, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
              <Text style={[styles.kpiValor, { color: colores.texto }]}>
                US$ {(costos?.month ?? 0).toFixed(2)}
              </Text>
              <Text style={{ color: colores.textoSuave, fontSize: 12 }}>Este mes</Text>
            </View>
            <View style={[styles.kpi, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
              <Text style={[styles.kpiValor, { color: colores.texto }]}>
                {costos?.total_turns ?? 0}
              </Text>
              <Text style={{ color: colores.textoSuave, fontSize: 12 }}>Turnos del mes</Text>
            </View>
          </View>

          <Text style={[styles.seccion, { color: colores.texto }]}>Por modelo</Text>
          {(costos?.by_model ?? []).map((m) => (
            <View
              key={m.model}
              style={[styles.planFila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
            >
              <View>
                <Text style={{ color: colores.texto, fontWeight: "600" }}>{m.model}</Text>
                <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                  {m.calls} llamadas · {Math.round(m.avg_latency)} ms
                </Text>
              </View>
              <Text style={{ color: colores.texto }}>US$ {m.cost.toFixed(2)}</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  contenido: { padding: 16, paddingBottom: 40 },
  pestanas: { flexDirection: "row", borderBottomWidth: 1, marginBottom: 14 },
  pestana: { flex: 1, paddingVertical: 10, alignItems: "center" },
  tarjeta: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
  titulo: { fontSize: 18, fontWeight: "700" },
  uso: { marginBottom: 12, gap: 4 },
  barraFondo: { height: 6, borderRadius: 999, overflow: "hidden" },
  barra: { height: 6, borderRadius: 999 },
  seccion: { fontSize: 15, fontWeight: "700", marginTop: 12, marginBottom: 8 },
  planFila: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  grid: { flexDirection: "row", gap: 10, marginBottom: 8 },
  kpi: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12 },
  kpiValor: { fontSize: 18, fontWeight: "700" },
});
