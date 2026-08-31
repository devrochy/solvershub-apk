import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { apiErrorStatus } from "../api/client";
import type { RootStackParamList } from "../navigation/types";
import { useSession } from "../session/session-context";
import type { RutaApkPublic } from "../types/cobrador";

type Props = NativeStackScreenProps<RootStackParamList, "Rutas">;

export function RutasScreen({ navigation }: Props) {
  const { api, cobrador, logout } = useSession();
  const [rutas, setRutas] = useState<RutaApkPublic[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (!rutas) {
    return (
      <View style={styles.centro}>
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.error}>{error}</Text>
            <Pressable style={styles.reintentar} onPress={cargar}>
              <Text style={styles.reintentarTexto}>Reintentar</Text>
            </Pressable>
          </View>
        ) : (
          <ActivityIndicator size="large" />
        )}
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      <View style={styles.header}>
        <Text style={styles.bienvenida}>
          Hola, {cobrador?.nombre ?? "cobrador"}
        </Text>
        <Pressable onPress={logout}>
          <Text style={styles.salir}>Salir</Text>
        </Pressable>
      </View>

      <FlatList
        data={rutas}
        keyExtractor={(ruta) => String(ruta.id)}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <Text style={styles.vacio}>No tienes rutas asignadas.</Text>
        }
        renderItem={({ item }) => {
          const habilitados = item.permisos.filter((p) => p.habilitado).length;
          return (
            <Pressable
              testID={`ruta-${item.id}`}
              style={styles.tarjeta}
              onPress={() =>
                navigation.navigate("Dia", {
                  rutaId: item.id,
                  rutaNombre: item.nombre,
                })
              }
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
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#f8fafc" },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorBox: { alignItems: "center", gap: 8 },
  error: { color: "#dc2626", fontSize: 15 },
  reintentar: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reintentarTexto: { color: "#ffffff", fontWeight: "600" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  bienvenida: { fontSize: 18, fontWeight: "700" },
  salir: { color: "#dc2626", fontSize: 15 },
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