import { useEffect, useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { HeaderApp } from "../components/HeaderApp";
import { Breadcrumb } from "../components/Breadcrumb";
import { VentanaCerrarConSwipe } from "../navigation/VentanaCerrarConSwipe";
import type { RootStackParamList } from "../navigation/types";
import { useNotificaciones } from "../session/notificaciones-context";
import { useTheme } from "../theme/theme-context";
import type { ColoresTema } from "../theme/theme";
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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { items, cargando, cargar, marcarVistas } = useNotificaciones();

  const { colores } = useTheme();
  const styles = useMemo(() => crearEstilos(colores), [colores]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <VentanaCerrarConSwipe
      animarSalida={false}
      onCerrar={() => navigation.goBack()}
      style={styles.fill}
    >
      <SafeAreaView style={styles.contenedor} edges={["left", "right", "bottom"]}>
      <HeaderApp
        titulo="Notificaciones"
        subtitulo={`${items.length} evento${items.length === 1 ? "" : "s"}`}
      />

      <Breadcrumb
        items={[
          { key: "inicio", label: "Inicio", onPress: () => navigation.navigate("Main") },
          { key: "notificaciones", label: "Notificaciones" },
        ]}
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
            <MaterialIcons name={ICONO[item.tipo]} size={22} color={colores.acento} />
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

function crearEstilos(c: ColoresTema) {
  return StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: c.fondo },
    fill: { flex: 1 },
    lista: { padding: 16, gap: 10 },
    vacio: { color: c.textoSuave, textAlign: "center", marginTop: 24 },
    item: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: c.tarjeta,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.borde,
      padding: 14,
    },
    info: { flex: 1, gap: 2 },
    mensaje: { fontSize: 14, fontWeight: "600", color: c.texto },
    meta: { fontSize: 12, color: c.textoSuave },
    marcar: {
      margin: 16,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: c.primario,
      alignItems: "center",
    },
    marcarTexto: { color: "#ffffff", fontWeight: "700" },
  });
}
