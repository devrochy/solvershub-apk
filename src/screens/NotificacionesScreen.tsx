import { useEffect } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { HeaderApp } from "../components/HeaderApp";
import { VentanaCerrarConSwipe } from "../navigation/VentanaCerrarConSwipe";
import { useNotificaciones } from "../session/notificaciones-context";
import type { NotificacionTipo } from "../types/gestor";

const ICONO: Record<NotificacionTipo, keyof typeof MaterialIcons.glyphMap> = {
  pago: "payments",
  gasto: "shopping-cart",
  no_pago: "cancel",
  aprobacion: "check-circle",
  liquidacion: "receipt-long",
};

/** Feed de notificaciones: pagos, gastos, no-pagos, aprobaciones y liquidaciones. */
export function NotificacionesScreen() {
  const navigation = useNavigation();
  const { items, cargando, cargar, marcarVistas } = useNotificaciones();

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <VentanaCerrarConSwipe
      animarSalida={false}
      onCerrar={() => navigation.goBack()}
      style={styles.fill}
    >
      <SafeAreaView style={styles.contenedor} edges={["left", "right"]}>
      <HeaderApp
        titulo="Notificaciones"
        subtitulo={`${items.length} evento${items.length === 1 ? "" : "s"}`}
      />

      <FlatList
        testID="lista-notificaciones"
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.lista}
        refreshing={cargando}
        onRefresh={() => void cargar()}
        ListEmptyComponent={
          <Text style={styles.vacio}>
            {cargando ? "Cargando…" : "Sin notificaciones."}
          </Text>
        }
        renderItem={({ item }) => (
          <View testID={`notif-${item.id}`} style={styles.item}>
            <MaterialIcons name={ICONO[item.tipo]} size={22} color="#172f6c" />
            <View style={styles.info}>
              <Text style={styles.mensaje}>{item.mensaje}</Text>
              <Text style={styles.meta}>
                {item.carteraNombre} · {new Date(item.fecha).toLocaleString("es-BO")}
              </Text>
            </View>
          </View>
        )}
      />

      <Pressable
        testID="btn-marcar-vistas"
        style={styles.marcar}
        onPress={() => void marcarVistas()}
      >
        <Text style={styles.marcarTexto}>Marcar como vistas</Text>
      </Pressable>
      </SafeAreaView>
    </VentanaCerrarConSwipe>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#f8fafc" },
  fill: { flex: 1 },
  lista: { padding: 16, gap: 10 },
  vacio: { color: "#64748b", textAlign: "center", marginTop: 24 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
  },
  info: { flex: 1, gap: 2 },
  mensaje: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  meta: { fontSize: 12, color: "#64748b" },
  marcar: {
    margin: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#172f6c",
    alignItems: "center",
  },
  marcarTexto: { color: "#ffffff", fontWeight: "700" },
});
