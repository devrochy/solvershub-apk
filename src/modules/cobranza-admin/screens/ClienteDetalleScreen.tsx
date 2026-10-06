import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTheme } from "@core/theme/theme-context";
import { useAdminApi } from "@core/session/use-admin-api";
import { cargarDetalleCliente, decidirCambioCliente, type ClientDetail } from "../api";
import type { CobranzaAdminStackParamList } from "../navigation";

type Props = NativeStackScreenProps<CobranzaAdminStackParamList, "ClienteDetalle">;

export function ClienteDetalleScreen({ route }: Props) {
  const { colores } = useTheme();
  const api = useAdminApi();
  const { id } = route.params;
  const [detalle, setDetalle] = useState<ClientDetail | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setDetalle(await cargarDetalleCliente(api, id));
      setError(null);
    } catch {
      setError("No pudimos cargar la ficha del cliente.");
    }
  }, [api, id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial: setState tras el await
    void cargar().finally(() => setCargando(false));
  }, [cargar]);

  const decidir = (cambioId: string, decision: string) => {
    Alert.alert(
      `${decision === "aprobar" ? "Aprobar" : "Rechazar"} cambio`,
      decision === "aprobar"
        ? "Los datos propuestos se aplicarán al cliente."
        : "El cambio propuesto quedará rechazado.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: () => {
            void decidirCambioCliente(api, cambioId, decision)
              .then(cargar)
              .catch(() => setError("No se pudo decidir el cambio."));
          },
        },
      ],
    );
  };

  if (cargando) {
    return (
      <View style={[styles.centro, { backgroundColor: colores.fondo }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const c = detalle?.cliente;

  return (
    <View style={[styles.contenedor, { backgroundColor: colores.fondo }]}>
      {error ? (
        <Text testID="detalle-error" style={{ color: colores.peligro, marginBottom: 8 }}>
          {error}
        </Text>
      ) : null}

      {c ? (
        <View style={[styles.tarjeta, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
          <Text style={[styles.titulo, { color: colores.texto }]}>
            {c.nombre} {c.apellido ?? ""}
          </Text>
          <Text style={{ color: colores.textoSuave }}>
            {c.numero_documento ?? "—"} · {c.telefono ?? "—"} · {c.cartera ?? "sin cartera"} ·
            riesgo {c.color_riesgo}
          </Text>
        </View>
      ) : null}

      {(detalle?.cambios ?? []).filter((ch) => ch.estado === "pendiente").map((ch) => (
        <View
          key={ch.id}
          testID={`cambio-${ch.id}`}
          style={[styles.tarjeta, { borderColor: colores.peligro, backgroundColor: colores.tarjeta }]}
        >
          <Text style={{ color: colores.texto, fontWeight: "600" }}>Cambio propuesto</Text>
          <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
            {JSON.stringify(ch.campos_propuestos)} · por {ch.solicitado_por ?? "—"}
          </Text>
          <View style={styles.filaBotones}>
            <Text
              testID={`aprobar-${ch.id}`}
              style={{ color: colores.acento, fontWeight: "700" }}
              onPress={() => decidir(ch.id, "aprobar")}
            >
              Aprobar
            </Text>
            <Text
              testID={`rechazar-${ch.id}`}
              style={{ color: colores.peligro, fontWeight: "700" }}
              onPress={() => decidir(ch.id, "rechazar")}
            >
              Rechazar
            </Text>
          </View>
        </View>
      ))}

      <Text style={[styles.seccion, { color: colores.texto }]}>
        Préstamos ({detalle?.prestamos.length ?? 0})
      </Text>
      <FlatList
        testID="detalle-prestamos"
        data={detalle?.prestamos ?? []}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <View style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colores.texto, fontWeight: "600" }}>
                ${item.valor} · {item.num_cuotas} cuotas
              </Text>
              <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                saldo ${item.saldo} · {item.estatus}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  contenedor: { flex: 1, padding: 12 },
  tarjeta: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  titulo: { fontSize: 17, fontWeight: "700", marginBottom: 4 },
  filaBotones: { flexDirection: "row", gap: 20, marginTop: 8 },
  seccion: { fontSize: 15, fontWeight: "700", marginTop: 8, marginBottom: 8 },
  fila: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
});
