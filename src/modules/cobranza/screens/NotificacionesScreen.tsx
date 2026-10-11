import { useEffect, useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Button, EmptyState, IconButton, Icono, ListItem, useKit, type ColoresKit } from "@shared/ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { HeaderApp } from "../components/HeaderApp";
import { Breadcrumb } from "../components/Breadcrumb";
import { VentanaCerrarConSwipe } from "../navigation/VentanaCerrarConSwipe";
import type { RootStackParamList } from "../navigation/types";
import { useNotificaciones } from "../session/notificaciones-context";
import type { NotificacionTipo } from "@shared/types/gestor";

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
  const { items, cargando, cargar, marcarVistas, descartar } = useNotificaciones();

  const { c } = useKit();
  const styles = useMemo(() => crearEstilos(c), [c]);

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

      <Breadcrumb seccion="Notificaciones" />

      <FlatList
        testID="lista-notificaciones"
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.lista}
        refreshing={cargando}
        onRefresh={() => void cargar()}
        ListEmptyComponent={
          cargando ? (
            <Text style={styles.vacio}>Cargando…</Text>
          ) : (
            <EmptyState
              icon="notifications-none"
              title="Sin notificaciones."
              action={{ label: "Actualizar", onPress: () => void cargar() }}
            />
          )
        }
        renderItem={({ item }) => (
          <ListItem
            testID={`notif-${item.id}`}
            title={item.mensaje}
            subtitle={`${item.carteraNombre} · ${new Date(item.fecha).toLocaleString("es-BO")}`}
            leading={<Icono name={ICONO[item.tipo]} size={22} color={c.link} />}
            trailing={
              <IconButton
                testID={`notif-cerrar-${item.id}`}
                icon="close"
                label="Descartar notificación"
                size="sm"
                onPress={() => void descartar(item.id)}
              />
            }
            style={styles.item}
          />
        )}
      />

      <View style={styles.pie}>
        <Button
          testID="btn-marcar-vistas"
          size="lg"
          iconLeft="done-all"
          fullWidth
          onPress={() => void marcarVistas()}
        >
          Marcar como vistas
        </Button>
      </View>
      </SafeAreaView>
    </VentanaCerrarConSwipe>
  );
}

function crearEstilos(c: ColoresKit) {
  return StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: c.bg },
    fill: { flex: 1 },
    lista: { padding: shSpace[4], gap: 10 },
    vacio: { ...shType.body, color: c.textMuted, textAlign: "center", marginTop: shSpace[6] },
    item: {
      borderRadius: shRadius.md,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
    },
    pie: { padding: shSpace[4], borderTopWidth: 1, borderTopColor: c.borderSoft, backgroundColor: c.surface },
  });
}
