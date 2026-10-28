import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { usePestanaInicial, type SolicitudPestana } from "@shared/pestana-inicial";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { useKit } from "@shared/ui";
import { TarjetaDatosDePrueba } from "../../datos-prueba";
import {
  cargarCargos,
  cargarMetricas,
  cargarSuscripciones,
  dinero,
  fechaCorta,
  type CargoItem,
  type Metricas,
  type SuscripcionItem,
} from "../api";

type Pestana = "resumen" | "suscripciones" | "pagos";

const PESTANAS: { id: Pestana; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "suscripciones", label: "Suscripciones" },
  { id: "pagos", label: "Pagos" },
];
const CLAVES: readonly Pestana[] = PESTANAS.map((p) => p.id);

/** Suscripciones en la app (SPEC-35): resumen, clientes suscritos y cargos. */
export function SuscripcionesScreen({
  pestanaInicial,
}: { pestanaInicial?: SolicitudPestana } = {}) {
  const { c } = useKit();
  const api = useAdminApi();
  const [pestana, setPestana] = usePestanaInicial<Pestana>("resumen", CLAVES, pestanaInicial);
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [suscripciones, setSuscripciones] = useState<SuscripcionItem[]>([]);
  const [cargos, setCargos] = useState<CargoItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [m, s, p] = await Promise.all([
        cargarMetricas(api),
        cargarSuscripciones(api),
        cargarCargos(api),
      ]);
      setMetricas(m);
      setSuscripciones(s.items);
      setCargos(p.items);
      setError(null);
    } catch {
      setError("No pudimos cargar las suscripciones. Revisa tu conexión.");
    }
  }, [api]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial: los setState llegan después del await
    void cargar().finally(() => setCargando(false));
  }, [cargar]);

  return (
    <View style={[styles.contenedor, { backgroundColor: c.bg }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pestanas}>
        {PESTANAS.map((p) => (
          <Pressable
            key={p.id}
            testID={`suscripciones-${p.id}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: pestana === p.id }}
            onPress={() => setPestana(p.id)}
            style={[
              styles.pestana,
              { borderColor: pestana === p.id ? c.link : "transparent" },
            ]}
          >
            <Text style={{ color: pestana === p.id ? c.text : c.textMuted, fontWeight: "600" }}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {error ? (
        <Text testID="suscripciones-error" style={{ color: c.statusDangerFg, marginBottom: 8 }}>
          {error}
        </Text>
      ) : null}

      {cargando ? (
        <ActivityIndicator size="large" style={{ marginTop: 30 }} />
      ) : pestana === "resumen" ? (
        <ScrollView contentContainerStyle={styles.resumen}>
          <TarjetaDatosDePrueba
            api={api}
            modulo="suscripciones"
            onCambio={() => void cargar()}
            testID="datos-prueba-suscripciones"
          />
          <View style={styles.grid}>
            <Kpi titulo="Ingreso mensual" valor={metricas ? dinero(metricas.mrr, metricas.moneda) : "—"} />
            <Kpi titulo="Activas" valor={metricas ? String(metricas.activas) : "—"} />
            <Kpi titulo="En mora" valor={metricas ? dinero(metricas.mora.monto, metricas.moneda) : "—"} />
            <Kpi titulo="Altas del mes" valor={metricas ? String(metricas.altas_mes) : "—"} />
          </View>
        </ScrollView>
      ) : pestana === "suscripciones" ? (
        <FlatList
          testID="suscripciones-lista"
          data={suscripciones}
          keyExtractor={(s) => s.id}
          ListEmptyComponent={<Text style={[styles.vacio, { color: c.textMuted }]}>Sin suscripciones.</Text>}
          renderItem={({ item }) => (
            <View style={[styles.fila, { borderColor: c.border, backgroundColor: c.surface }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontWeight: "600" }}>
                  {item.cliente.nombre ?? "Cliente"}
                </Text>
                <Text style={{ color: c.textMuted, fontSize: 12 }}>
                  {item.plan} · {item.estado} · cobra {dinero(item.valor_periodo, item.moneda)}/{item.periodicidad}
                </Text>
                <Text style={{ color: c.textSoft, fontSize: 12 }}>
                  Próximo cargo: {fechaCorta(item.proximo_cargo)}
                  {item.deuda > 0 ? ` · debe ${dinero(item.deuda, item.moneda)}` : ""}
                </Text>
              </View>
              {item.en_mora > 0 ? (
                <Text style={{ color: c.statusDangerFg, fontSize: 11 }}>{item.dias_mora ?? 0} días</Text>
              ) : null}
            </View>
          )}
        />
      ) : (
        <FlatList
          testID="suscripciones-pagos-lista"
          data={cargos}
          keyExtractor={(p) => p.id}
          ListEmptyComponent={<Text style={[styles.vacio, { color: c.textMuted }]}>Sin pagos.</Text>}
          renderItem={({ item }) => (
            <View style={[styles.fila, { borderColor: c.border, backgroundColor: c.surface }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontWeight: "600" }}>
                  {item.cliente?.nombre ?? item.plan ?? "Cargo"}
                </Text>
                <Text style={{ color: c.textMuted, fontSize: 12 }}>
                  {item.periodo} · {dinero(item.monto, item.moneda ?? "COP")} · {item.estado}
                </Text>
                <Text style={{ color: c.textSoft, fontSize: 12 }}>
                  Vence: {fechaCorta(item.fecha_vencimiento)}
                </Text>
              </View>
              {item.dias_mora != null && item.dias_mora > 0 ? (
                <Text style={{ color: c.statusDangerFg, fontSize: 11 }}>{item.dias_mora} días</Text>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}

function Kpi({ titulo, valor }: { titulo: string; valor: string }) {
  const { c } = useKit();
  return (
    <View style={[styles.kpi, { borderColor: c.border, backgroundColor: c.surface }]}>
      <Text style={{ color: c.text, fontSize: 18, fontWeight: "700" }}>{valor}</Text>
      <Text style={{ color: c.textMuted, fontSize: 12 }}>{titulo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, padding: shSpace[3] },
  pestanas: { flexGrow: 0, marginBottom: shSpace[3] },
  pestana: { paddingVertical: shSpace[2], paddingHorizontal: shSpace[3], borderBottomWidth: 2, marginRight: shSpace[1] },
  resumen: { gap: shSpace[3], paddingBottom: shSpace[6] },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[2] },
  kpi: { flexGrow: 1, flexBasis: "45%", borderWidth: 1, borderRadius: shRadius.md, padding: shSpace[3], gap: 2 },
  fila: { flexDirection: "row", alignItems: "center", gap: shSpace[2], borderWidth: 1, borderRadius: shRadius.md, padding: shSpace[3], marginBottom: shSpace[2] },
  vacio: { textAlign: "center", marginTop: shSpace[6], ...shType.body },
});
