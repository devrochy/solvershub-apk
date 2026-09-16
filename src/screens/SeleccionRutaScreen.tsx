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
import { ColorBadge, bordeDeEstado, fondoDeEstado } from "../components/ColorBadge";
import { contarEnMora } from "../domain/contar-en-mora";
import { HeaderPantalla, estilosHeader } from "../components/HeaderPantalla";
import { useOffline } from "../offline/offline-context";
import { useSession } from "../session/session-context";
import { useRutaActiva } from "../session/ruta-activa-context";
import type { RutaApkPublic } from "../types/cobrador";

interface RutaKpi {
  totalClientes: number;
  clientesDia: number;
  enMora: number;
}

/**
 * Selección de ruta (N1): pantalla de stack mostrada tras el login SIN tab
 * bar. Lista las rutas del cobrador con KPIs de cartera. Al tocar una ruta se
 * fija como ruta activa y se navega al Main (tabs), que abre por defecto en
 * la pestaña "Día".
 */
export interface SeleccionRutaScreenProps {
  /** Se invoca al elegir una ruta (para abrir la capa de pestañas encima). */
  onRutaSeleccionada?: () => void;
}

export function SeleccionRutaScreen({
  onRutaSeleccionada,
}: SeleccionRutaScreenProps = {}) {
  const { api, cobrador, logout } = useSession();
  const { setRutaActiva } = useRutaActiva();
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
          const [clientes, dia] = await Promise.allSettled([
            api.listarClientesDeRuta(ruta.id),
            api.dia(ruta.id),
          ]);
          const listaClientes =
            clientes.status === "fulfilled" ? clientes.value : [];
          const diaRuta = dia.status === "fulfilled" ? dia.value : null;
          return {
            rutaId: ruta.id,
            totalClientes: listaClientes.length,
            clientesDia: diaRuta?.clientes.length ?? 0,
            enMora: diaRuta ? contarEnMora(diaRuta.clientes) : 0,
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

  function seleccionarRuta(ruta: RutaApkPublic) {
    setRutaActiva({
      rutaId: ruta.id,
      rutaNombre: ruta.nombre,
      tipoInteres: ruta.tipoInteres,
      numCuotas: ruta.numCuotas,
      config: ruta.config,
      permisos: ruta.permisos,
    });
    onRutaSeleccionada?.();
  }

  if (!rutas) {
    return <CargaError cargando={!error} error={error} onReintentar={cargar} />;
  }

  return (
    <SafeAreaView style={styles.contenedor} edges={["left", "right"]}>
      <HeaderPantalla>
        <View style={estilosHeader.fila} testID="header-seleccion-ruta">
          <View style={estilosHeader.bloqueTitulo}>
            <Text style={estilosHeader.titulo}>
              Hola, {cobrador?.nombre ?? "cobrador"}
            </Text>
            <Text style={estilosHeader.subtitulo}>Selecciona una ruta</Text>
          </View>
          <View style={estilosHeader.accionesDerecha}>
            {offline.sinSubir > 0 ? (
              <View testID="badge-sin-subir" style={styles.badge}>
                <Text style={styles.badgeTexto}>{offline.sinSubir} sin subir</Text>
              </View>
            ) : null}
            <Pressable testID="btn-salir" style={estilosHeader.accionPill} onPress={logout}>
              <MaterialIcons name="logout" size={18} color="#172f6c" />
              <Text style={estilosHeader.accionPillTexto}>Salir</Text>
            </Pressable>
          </View>
        </View>
      </HeaderPantalla>

      {offline.errorSync ? (
        <View testID="aviso-error-sync" style={styles.avisoErrorSync}>
          <Text style={styles.avisoErrorSyncTexto}>{offline.errorSync}</Text>
        </View>
      ) : null}

      {error && rutas ? (
        <View testID="aviso-error-refresh" style={styles.avisoErrorSync}>
          <Text style={styles.avisoErrorSyncTexto}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        testID="lista-rutas"
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
          const activa = item.estatus === "activo";
          const claveEstado = activa ? "verde" : "rojo";
          return (
            <Pressable
              testID={`ruta-${item.id}`}
              style={[
                styles.tarjeta,
                { borderColor: bordeDeEstado(claveEstado) },
                !activa && styles.tarjetaInactiva,
              ]}
              onPress={() => seleccionarRuta(item)}
            >
              <View
                testID={`ruta-header-${item.id}`}
                style={[
                  styles.tarjetaHeader,
                  { backgroundColor: fondoDeEstado(claveEstado) },
                ]}
              >
                <ColorBadge color={claveEstado} animar />
                <Text
                  style={[
                    styles.tarjetaHeaderTexto,
                    { color: activa ? "#166534" : "#b91c1c" },
                  ]}
                >
                  {item.nombre}
                </Text>
              </View>
              <View style={styles.tarjetaCuerpo}>
                <View style={styles.kpis}>
                  <View style={styles.kpi}>
                    <MaterialIcons name="people" size={26} color="#172f6c" />
                    <Text style={styles.kpiValor} testID={`kpi-clientes-${item.id}`}>
                      {kpi.totalClientes}
                    </Text>
                    <Text style={styles.kpiEtiqueta}>clientes</Text>
                  </View>
                  <View style={styles.kpi}>
                    <MaterialIcons name="today" size={26} color="#0e7490" />
                    <Text style={styles.kpiValor} testID={`kpi-dia-${item.id}`}>
                      {kpi.clientesDia}
                    </Text>
                    <Text style={styles.kpiEtiqueta}>del día</Text>
                  </View>
                  <View style={styles.kpi}>
                    <MaterialIcons name="warning" size={26} color="#dc2626" />
                    <Text style={styles.kpiValor} testID={`kpi-mora-${item.id}`}>
                      {kpi.enMora}
                    </Text>
                    <Text style={styles.kpiEtiqueta}>en mora</Text>
                  </View>
                </View>
              </View>
              <View style={styles.chevron}>
                <MaterialIcons name="chevron-right" size={28} color="#94a3b8" />
              </View>
            </Pressable>
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
  badge: {
    backgroundColor: "#f59e0b",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeTexto: { color: "#ffffff", fontSize: 12, fontWeight: "600", fontFamily: "Roboto_600SemiBold" },
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
  lista: { padding: 16, gap: 12, paddingBottom: 72 },
  vacio: { color: "#64748b", textAlign: "center", marginTop: 24 },
  tarjeta: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  tarjetaHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tarjetaHeaderTexto: { fontWeight: "700", fontSize: 14 },
  tarjetaInactiva: { opacity: 0.75 },
  tarjetaCuerpo: { padding: 16 },
  kpis: { flexDirection: "row", gap: 10 },
  kpi: { flex: 1, alignItems: "center", gap: 2 },
  kpiValor: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  kpiEtiqueta: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  chevron: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
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