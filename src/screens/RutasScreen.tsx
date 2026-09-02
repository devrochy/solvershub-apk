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
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { apiErrorStatus } from "../api/client";
import { CargaError } from "../components/CargaError";
import type { RootTabParamList } from "../navigation/types";
import { useOffline } from "../offline/offline-context";
import { useSession } from "../session/session-context";
import { useRutaActiva } from "../session/ruta-activa-context";
import type { RutaApkPublic } from "../types/cobrador";

type Props = BottomTabScreenProps<RootTabParamList, "Rutas">;

export function RutasScreen({ navigation }: Props) {
  const { api, cobrador, logout } = useSession();
  const { setRutaActiva } = useRutaActiva();
  const offline = useOffline();
  const [rutas, setRutas] = useState<RutaApkPublic[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setRutas(await api.misRutas());
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

  if (!rutas) {
    return <CargaError cargando={!error} error={error} onReintentar={cargar} />;
  }

  return (
    <SafeAreaView style={styles.contenedor} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View style={styles.headerTitulo}>
          <Text style={styles.apkNombre}>CobraIA</Text>
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
          const habilitados = item.permisos.filter((p) => p.habilitado).length;
          return (
            <Pressable
              testID={`ruta-${item.id}`}
              style={styles.tarjeta}
              onPress={() => {
                setRutaActiva({
                  rutaId: item.id,
                  rutaNombre: item.nombre,
                  tipoInteres: item.tipoInteres,
                  numCuotas: item.numCuotas,
                  config: item.config,
                });
                navigation.navigate("Clientes");
              }}
            >
              <View style={styles.tarjetaInfo}>
                <Text style={styles.rutaNombre}>{item.nombre}</Text>
                <Text style={styles.rutaDetalle}>
                  {habilitados} permisos habilitados
                </Text>
              </View>
              <Text style={styles.estatus}>{item.estatus}</Text>
            </Pressable>
          );
        }}
      />
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
  apkNombre: { fontSize: 12, fontWeight: "700", color: "#2563eb", letterSpacing: 0.5 },
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
  lista: { padding: 16, gap: 10 },
  vacio: { color: "#64748b", textAlign: "center", marginTop: 24 },
  tarjeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  tarjetaInfo: { flex: 1 },
  rutaNombre: { fontSize: 16, fontWeight: "600" },
  rutaDetalle: { color: "#64748b", fontSize: 13, marginTop: 2 },
  estatus: { color: "#2563eb", fontWeight: "600" },
});