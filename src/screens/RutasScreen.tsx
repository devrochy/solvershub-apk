import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { apiErrorStatus } from "../api/client";
import { CargaError } from "../components/CargaError";
import { usePantallaActiva } from "../navigation/pantalla-activa-context";
import { useOffline } from "../offline/offline-context";
import { useSession } from "../session/session-context";
import { useRutaActiva } from "../session/ruta-activa-context";
import type { RutaApkPublic } from "../types/cobrador";

type Props = { navigation?: { navigate(screen: "Clientes"): void } };

interface RutaKpi {
  totalClientes: number;
  clientesDia: number;
  enMora: number;
}

/**
 * Dashboard de rutas (B3): tarjetas por ruta con KPIs de cartera (total
 * clientes, clientes del día, en mora) calculados con datos existentes
 * (mis-rutas + clientes de ruta + día). Tocar la tarjeta abre el detalle de la
 * ruta en el overlay; "Consultar" navega al tab de clientes. El header CobraIA
 * vive en la esquina inferior derecha, flotante sobre el contenido.
 */
export function RutasScreen({ navigation }: Props = {}) {
  const { api, cobrador, logout } = useSession();
  const { setRutaActiva } = useRutaActiva();
  const { abrir } = usePantallaActiva();
  const offline = useOffline();
  const [rutas, setRutas] = useState<RutaApkPublic[] | null>(null);
  const [kpis, setKpis] = useState<Record<number, RutaKpi>>({});
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const misRutas = await api.misRutas();
      const resultados = await Promise.all(
        misRutas.map(async (ruta) => {
          const [clientes, dia] = await Promise.all([
            api.listarClientesDeRuta(ruta.id),
            api.dia(ruta.id),
          ]);
          return {
            rutaId: ruta.id,
            totalClientes: clientes.length,
            clientesDia: dia.clientes.length,
            enMora: dia.clientes.filter((c) => c.color === "rojo").length,
          };
        }),
      );
      setRutas(misRutas);
      setKpis(Object.fromEntries(resultados.map((k) => [k.rutaId, k])));
    } catch (err) {
      if (apiErrorStatus(err) === 401) {
        await logout();
      } else {
        setError("No se pudieron cargar tus rutas.");
      }
    }
  }, [api, logout]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount (async; no setState síncrono)
    cargar();
  }, [cargar]);

  async function refrescar() {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }

  function consultar(ruta: RutaApkPublic) {
    setRutaActiva({
      rutaId: ruta.id,
      rutaNombre: ruta.nombre,
      tipoInteres: ruta.tipoInteres,
      numCuotas: ruta.numCuotas,
      config: ruta.config,
    });
    navigation?.navigate("Clientes");
  }

  if (!rutas) {
    return <CargaError cargando={!error} error={error} onReintentar={cargar} />;
  }

  return (
    <SafeAreaView style={styles.contenedor} edges={["top", "left", "right"]}>
      <View style={styles.header} testID="header-rutas">
        <View style={styles.headerTitulo}>
          <Text style={styles.bienvenida}>
            Hola, {cobrador?.nombre ?? "cobrador"}
          </Text>
        </View>
        <View style={styles.headerDerecha}>
          {offline.sinSubir > 0 ? (
            <View testID="badge-sin-subir" style={styles.badge}>
              <Text style={styles.badgeTexto}>{offline.sinSubir} sin subir</Text>
            </View>
          ) : null}
          <Pressable onPress={logout}>
            <Text style={styles.salir}>Salir</Text>
          </Pressable>
        </View>
      </View>

      {offline.errorSync ? (
        <View testID="aviso-error-sync" style={styles.avisoErrorSync}>
          <Text style={styles.avisoErrorSyncTexto}>{offline.errorSync}</Text>
        </View>
      ) : null}

      <FlatList
        data={rutas}
        keyExtractor={(ruta) => String(ruta.id)}
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={refrescar} />
        }
        ListEmptyComponent={
          <Text style={styles.vacio}>No tienes rutas asignadas.</Text>
        }
        renderItem={({ item }) => {
          const kpi = kpis[item.id] ?? {
            totalClientes: 0,
            clientesDia: 0,
            enMora: 0,
          };
          return (
            <View style={styles.tarjeta}>
              <Pressable
                testID={`ruta-${item.id}`}
                style={styles.tarjetaCuerpo}
                onPress={() =>
                  abrir({ tipo: "ruta", rutaId: item.id, rutaNombre: item.nombre })
                }
              >
                <View style={styles.tarjetaInfo}>
                  <Text style={styles.rutaNombre}>{item.nombre}</Text>
                  <Text style={styles.estatus}>{item.estatus}</Text>
                </View>
                <View style={styles.kpis}>
                  <View style={styles.kpi}>
                    <MaterialIcons name="people" size={18} color="#2563eb" />
                    <Text style={styles.kpiValor} testID={`kpi-clientes-${item.id}`}>
                      {kpi.totalClientes}
                    </Text>
                    <Text style={styles.kpiEtiqueta}>clientes</Text>
                  </View>
                  <View style={styles.kpi}>
                    <MaterialIcons name="today" size={18} color="#0891b2" />
                    <Text style={styles.kpiValor} testID={`kpi-dia-${item.id}`}>
                      {kpi.clientesDia}
                    </Text>
                    <Text style={styles.kpiEtiqueta}>del día</Text>
                  </View>
                  <View style={styles.kpi}>
                    <MaterialIcons name="warning" size={18} color="#dc2626" />
                    <Text style={styles.kpiValor} testID={`kpi-mora-${item.id}`}>
                      {kpi.enMora}
                    </Text>
                    <Text style={styles.kpiEtiqueta}>en mora</Text>
                  </View>
                </View>
              </Pressable>
              <View style={styles.footer}>
                <Pressable
                  testID={`consultar-${item.id}`}
                  style={styles.botonConsultar}
                  onPress={() => consultar(item)}
                >
                  <Text style={styles.botonConsultarTexto}>Consultar</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />

      <View testID="cobraia-flotante" style={styles.cobraiaFlotante} pointerEvents="none">
        <Text style={styles.cobraiaFlotanteTexto}>CobraIA</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitulo: { flex: 1 },
  bienvenida: { fontSize: 18, fontWeight: "700" },
  headerDerecha: { flexDirection: "row", alignItems: "center", gap: 10 },
  badge: {
    backgroundColor: "#f59e0b",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeTexto: { color: "#ffffff", fontSize: 12, fontWeight: "600" },
  salir: { color: "#dc2626", fontSize: 15 },
  avisoErrorSync: {
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fca5a5",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  avisoErrorSyncTexto: { color: "#991b1b", fontSize: 13, fontWeight: "600" },
  lista: { padding: 16, gap: 10, paddingBottom: 72 },
  vacio: { color: "#64748b", textAlign: "center", marginTop: 24 },
  tarjeta: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  tarjetaCuerpo: { padding: 16, gap: 12 },
  tarjetaInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rutaNombre: { fontSize: 16, fontWeight: "600" },
  estatus: { color: "#2563eb", fontWeight: "600", fontSize: 13 },
  kpis: { flexDirection: "row", gap: 10 },
  kpi: { flex: 1, alignItems: "center", gap: 2 },
  kpiValor: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  kpiEtiqueta: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    padding: 10,
    alignItems: "flex-end",
  },
  botonConsultar: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  botonConsultarTexto: { color: "#ffffff", fontWeight: "600", fontSize: 13 },
  cobraiaFlotante: {
    position: "absolute",
    bottom: 90,
    right: 16,
  },
  cobraiaFlotanteTexto: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
  },
});