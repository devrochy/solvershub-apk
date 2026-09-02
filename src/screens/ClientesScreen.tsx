import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { apiErrorStatus } from "../api/client";
import { CargaError } from "../components/CargaError";
import { ColorBadge } from "../components/ColorBadge";
import type { RootStackParamList, RootTabParamList } from "../navigation/types";
import { useSession } from "../session/session-context";
import { useRutaActiva } from "../session/ruta-activa-context";
import type { ClienteCobradorPublic } from "../types/cobrador";

type StackNavigation = {
  navigate(
    screen: "Cliente",
    params: RootStackParamList["Cliente"],
  ): void;
};

type Props = { navigation: StackNavigation };

export function ClientesScreen({ navigation }: Props) {
  const { rutaActiva } = useRutaActiva();
  const { api, logout } = useSession();
  const [clientes, setClientes] = useState<ClienteCobradorPublic[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    if (!rutaActiva) {
      return;
    }
    setError(null);
    try {
      setClientes(await api.listarClientesDeRuta(rutaActiva.rutaId));
    } catch (err) {
      if (apiErrorStatus(err) === 401) {
        await logout();
      } else {
        setError("No se pudieron cargar los clientes.");
      }
    }
  }, [api, logout, rutaActiva]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount (async; no setState síncrono)
    cargar();
  }, [cargar]);

  async function refrescar() {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }

  if (!rutaActiva) {
    return (
      <View style={styles.contenedor}>
        <Text style={styles.vacio}>Selecciona una ruta para ver sus clientes.</Text>
      </View>
    );
  }

  if (!clientes) {
    return <CargaError cargando={!error} error={error} onReintentar={cargar} />;
  }

  const nombreCompleto = (c: ClienteCobradorPublic) =>
    `${c.nombre} ${c.apellido}`.trim();

  return (
    <View style={styles.contenedor}>
      <View style={styles.header}>
        <Text style={styles.headerTitulo}>{rutaActiva.rutaNombre}</Text>
        <Text style={styles.headerDetalle}>{clientes.length} clientes</Text>
      </View>
      <FlatList
        data={clientes}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={refrescar} />
        }
        ListEmptyComponent={
          <Text style={styles.vacio}>Esta ruta no tiene clientes.</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`cliente-${item.id}`}
            style={styles.tarjeta}
            onPress={() =>
              (navigation as unknown as StackNavigation).navigate("Cliente", {
                rutaId: item.rutaId,
                clienteId: item.id,
                nombre: nombreCompleto(item),
              })
            }
          >
            <View style={styles.tarjetaInfo}>
              <Text style={styles.clienteNombre}>{nombreCompleto(item)}</Text>
              {item.negocio ? (
                <Text style={styles.clienteDetalle}>{item.negocio}</Text>
              ) : null}
              <Text style={styles.clienteTelefono}>{item.telefonoWhatsapp}</Text>
            </View>
            <ColorBadge color={item.colorRiesgo} label={item.colorRiesgo} />
          </Pressable>
        )}
      />
    </View>
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
  headerTitulo: { fontSize: 18, fontWeight: "700", color: "#334155" },
  headerDetalle: { color: "#64748b", fontSize: 13 },
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
  tarjetaInfo: { flex: 1, marginRight: 10 },
  clienteNombre: { fontSize: 16, fontWeight: "600", color: "#334155" },
  clienteDetalle: { color: "#64748b", fontSize: 13, marginTop: 2 },
  clienteTelefono: { color: "#475569", fontSize: 12, marginTop: 2 },
});