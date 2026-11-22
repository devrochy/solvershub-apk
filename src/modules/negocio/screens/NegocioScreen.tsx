import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  usePestanaInicial,
  type SolicitudPestana,
} from "@shared/pestana-inicial";
import { useTheme } from "@core/theme/theme-context";
import { useAdminApi } from "@core/session/use-admin-api";
import { useAdminSession } from "@core/session/admin-session-context";
import { AdminApiError } from "@core/api/admin";
import { Badge, Button, Sheet } from "@shared/ui";
import {
  cargarCostos,
  cargarPlan,
  comprarRecarga,
  type CostsResponse,
  type PlanResponse,
} from "../api";
import {
  beneficiosDelPlan,
  creditoDelMes,
  desgloseDelSaldo,
  errorDeRecarga,
  precioDelPlan,
  puedeComprarCreditos,
  recargaEnPalabras,
  topesDelPlan,
} from "../consumo";

type Pestana = "plan" | "costos";
// «Costos IA» (USD por modelo) es solo del master: el negocio no ve qué modelo corre (ADR-0210 §5).
const PESTANAS_MASTER: readonly Pestana[] = ["plan", "costos"];
const PESTANAS_NEGOCIO: readonly Pestana[] = ["plan"];

function Barra({ porcentaje }: { porcentaje: number }) {
  const { colores } = useTheme();
  return (
    <View style={[styles.barraFondo, { backgroundColor: colores.borde }]}>
      <View
        style={[
          styles.barra,
          {
            width: `${Math.min(100, Math.max(0, porcentaje))}%`,
            backgroundColor:
              porcentaje >= 90 ? colores.peligro : colores.acento,
          },
        ]}
      />
    </View>
  );
}

export function NegocioScreen({
  pestanaInicial,
}: { pestanaInicial?: SolicitudPestana } = {}) {
  const { colores } = useTheme();
  const api = useAdminApi();
  const { sesion } = useAdminSession();
  const esMaster = sesion?.role === "master";
  const pestanas = esMaster ? PESTANAS_MASTER : PESTANAS_NEGOCIO;
  const [pestana, setPestana] = usePestanaInicial<Pestana>(
    "plan",
    pestanas,
    pestanaInicial,
  );
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [costos, setCostos] = useState<CostsResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([
        cargarPlan(api),
        esMaster ? cargarCostos(api) : Promise.resolve(null),
      ]);
      setError(null);
      setPlan(p);
      setCostos(c);
    } catch {
      setError("No pudimos cargar la información de tu negocio.");
    }
  }, [api, esMaster]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial: los setState ocurren después del await (no síncronos)
    void cargar().finally(() => setCargando(false));
  }, [cargar]);

  const credito = creditoDelMes(plan?.credit);
  const saldo =
    plan?.credit?.used != null ? desgloseDelSaldo(plan.credit.balance) : null;
  const topes = topesDelPlan(plan?.usage);
  // «Comprar créditos» (HU-BILL-23): solo si la API manda paquetes (no Free, suscripción activa) y
  // quien mira escribe en plan.
  const recargas = plan?.recargas ?? [];
  const puedeComprar = recargas.length > 0 && puedeComprarCreditos(sesion);
  const [comprando, setComprando] = useState(false);
  const [abriendo, setAbriendo] = useState<string | null>(null);
  const [errorCompra, setErrorCompra] = useState<string | null>(null);

  async function comprar(paquete: string) {
    setAbriendo(paquete);
    setErrorCompra(null);
    try {
      const { checkout_url } = await comprarRecarga(api, paquete);
      await Linking.openURL(checkout_url);
      setComprando(false);
    } catch (e) {
      setErrorCompra(
        e instanceof AdminApiError
          ? errorDeRecarga(e.code, e.message)
          : errorDeRecarga(null, null),
      );
    } finally {
      setAbriendo(null);
    }
  }

  if (cargando) {
    return (
      <View style={[styles.centro, { backgroundColor: colores.fondo }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colores.fondo }}
      contentContainerStyle={styles.contenido}
    >
      {pestanas.length > 1 ? (
        <View style={[styles.pestanas, { borderColor: colores.borde }]}>
          {pestanas.map((p) => (
            <Pressable
              key={p}
              testID={`negocio-${p}`}
              onPress={() => setPestana(p)}
              style={[
                styles.pestana,
                pestana === p && {
                  borderBottomColor: colores.acento,
                  borderBottomWidth: 2,
                },
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
      ) : null}

      {error ? (
        <Text
          testID="negocio-error"
          style={{ color: colores.peligro, marginBottom: 10 }}
        >
          {error}
        </Text>
      ) : null}

      {pestana === "plan" ? (
        <>
          <View
            style={[
              styles.tarjeta,
              { borderColor: colores.borde, backgroundColor: colores.tarjeta },
            ]}
          >
            <Text style={[styles.titulo, { color: colores.texto }]}>
              {plan?.overview?.plan_name ?? "Sin plan"}
            </Text>
            <Text style={{ color: colores.textoSuave }}>
              {plan?.overview?.status ?? "—"}
              {plan?.overview?.days_left != null
                ? ` · ${plan.overview.days_left} días`
                : ""}
            </Text>
          </View>

          {credito ? (
            <View
              testID="negocio-credito"
              style={[
                styles.tarjeta,
                {
                  borderColor: colores.borde,
                  backgroundColor: colores.tarjeta,
                },
              ]}
            >
              <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                Crédito del mes
              </Text>
              <Text style={[styles.titulo, { color: colores.texto }]}>
                {credito.titulo}
              </Text>
              {credito.porcentaje != null ? (
                <Barra porcentaje={credito.porcentaje} />
              ) : null}
              <Text
                style={{
                  color: colores.textoSuave,
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                {credito.detalle}
              </Text>
              {saldo ? (
                <View testID="negocio-saldo" style={styles.saldo}>
                  <Text
                    style={{ color: colores.texto, fontSize: 13, fontWeight: "600" }}
                  >
                    {saldo.total}
                  </Text>
                  {saldo.partes.map((p) => (
                    <View
                      key={p.clave}
                      testID={`negocio-saldo-${p.clave}`}
                      style={styles.saldoFila}
                    >
                      <Text style={{ color: colores.texto, fontSize: 12 }}>
                        {p.nombre}
                        {p.nota ? ` · ${p.nota}` : ""}
                      </Text>
                      <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                        {p.uso}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {puedeComprar ? (
                <View style={styles.saldo}>
                  <Button
                    variant="secondary"
                    size="sm"
                    testID="negocio-comprar-creditos"
                    onPress={() => {
                      setErrorCompra(null);
                      setComprando(true);
                    }}
                  >
                    Comprar créditos
                  </Button>
                </View>
              ) : null}
            </View>
          ) : null}

          {topes.length > 0 ? (
            <Text style={[styles.seccion, { color: colores.texto }]}>
              Topes del plan
            </Text>
          ) : null}
          {topes.map((t) => (
            <View
              key={t.clave}
              testID={`negocio-tope-${t.clave}`}
              style={styles.uso}
            >
              <Text style={{ color: colores.texto, fontSize: 13 }}>
                {t.titulo}
              </Text>
              {t.porcentaje != null ? (
                <Barra porcentaje={t.porcentaje} />
              ) : null}
              <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                {t.uso}
              </Text>
            </View>
          ))}

          <Text style={[styles.seccion, { color: colores.texto }]}>Planes</Text>
          {(plan?.plans ?? []).map((p) => (
            <View
              key={p.id}
              testID={`negocio-plan-${p.id}`}
              style={[
                styles.planTarjeta,
                {
                  borderColor: p.current ? colores.acento : colores.borde,
                  backgroundColor: colores.tarjeta,
                },
              ]}
            >
              <View style={styles.planCabecera}>
                <Text style={{ color: colores.texto, fontWeight: "700" }}>
                  {p.name}
                  {p.current ? " · actual" : ""}
                </Text>
                <Text style={{ color: colores.texto }}>{precioDelPlan(p)}</Text>
              </View>
              {beneficiosDelPlan(p).map((b) => (
                <Text
                  key={b}
                  style={{ color: colores.textoSuave, fontSize: 12 }}
                >
                  · {b}
                </Text>
              ))}
            </View>
          ))}
          <Text
            style={{ color: colores.textoSuave, fontSize: 12, marginTop: 8 }}
          >
            Para cambiar de plan, usa el checkout desde el panel web.
          </Text>
          <Sheet
            visible={comprando}
            onClose={() => setComprando(false)}
            title="Comprar créditos"
            description="Se suman a tu saldo y se usan después del crédito del mes y lo acumulado. 1 crédito = $ 10."
            testID="negocio-recargas"
          >
            {recargas.map((p) => {
              const r = recargaEnPalabras(p);
              return (
                <View
                  key={p.id}
                  testID={`negocio-recarga-${p.id}`}
                  style={[styles.planFila, { borderColor: colores.borde }]}
                >
                  <View style={styles.recargaTexto}>
                    <Text style={{ color: colores.texto, fontWeight: "700" }}>
                      {r.creditos}
                    </Text>
                    <View style={styles.recargaPrecio}>
                      {r.lista ? (
                        <Text
                          testID={`negocio-recarga-${p.id}-lista`}
                          style={{
                            color: colores.textoSuave,
                            fontSize: 12,
                            textDecorationLine: "line-through",
                          }}
                        >
                          {r.lista}
                        </Text>
                      ) : null}
                      <Text style={{ color: colores.texto, fontWeight: "600" }}>
                        {r.precio}
                      </Text>
                      {r.descuento ? <Badge tone="accent" label={r.descuento} /> : null}
                    </View>
                  </View>
                  <Button
                    size="sm"
                    testID={`negocio-recarga-${p.id}-comprar`}
                    loading={abriendo === p.id}
                    disabled={abriendo !== null}
                    onPress={() => void comprar(p.id)}
                  >
                    Comprar
                  </Button>
                </View>
              );
            })}
            {errorCompra ? (
              <Text
                testID="negocio-recarga-error"
                accessibilityLiveRegion="polite"
                style={{ color: colores.peligro, fontSize: 13, marginTop: 4 }}
              >
                {errorCompra}
              </Text>
            ) : null}
          </Sheet>
        </>
      ) : (
        <>
          <View style={styles.grid}>
            <View
              style={[
                styles.kpi,
                {
                  borderColor: colores.borde,
                  backgroundColor: colores.tarjeta,
                },
              ]}
            >
              <Text style={[styles.kpiValor, { color: colores.texto }]}>
                US$ {(costos?.today ?? 0).toFixed(2)}
              </Text>
              <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                Hoy
              </Text>
            </View>
            <View
              style={[
                styles.kpi,
                {
                  borderColor: colores.borde,
                  backgroundColor: colores.tarjeta,
                },
              ]}
            >
              <Text style={[styles.kpiValor, { color: colores.texto }]}>
                US$ {(costos?.month ?? 0).toFixed(2)}
              </Text>
              <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                Este mes
              </Text>
            </View>
            <View
              style={[
                styles.kpi,
                {
                  borderColor: colores.borde,
                  backgroundColor: colores.tarjeta,
                },
              ]}
            >
              <Text style={[styles.kpiValor, { color: colores.texto }]}>
                {costos?.total_turns ?? 0}
              </Text>
              <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                Turnos del mes
              </Text>
            </View>
          </View>

          <Text style={[styles.seccion, { color: colores.texto }]}>
            Por modelo
          </Text>
          {(costos?.by_model ?? []).map((m) => (
            <View
              key={m.model}
              style={[
                styles.planFila,
                {
                  borderColor: colores.borde,
                  backgroundColor: colores.tarjeta,
                },
              ]}
            >
              <View>
                <Text style={{ color: colores.texto, fontWeight: "600" }}>
                  {m.model}
                </Text>
                <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                  {m.calls} llamadas · {Math.round(m.avg_latency)} ms
                </Text>
              </View>
              <Text style={{ color: colores.texto }}>
                US$ {m.cost.toFixed(2)}
              </Text>
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
  planTarjeta: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 2,
  },
  planCabecera: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
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
  saldo: { marginTop: 10, gap: 4 },
  saldoFila: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  recargaTexto: { flex: 1, gap: 2 },
  recargaPrecio: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  kpi: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12 },
  kpiValor: { fontSize: 18, fontWeight: "700" },
});
