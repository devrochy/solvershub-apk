import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { apiErrorStatus } from "../api/client";
import { ColorBadge } from "../components/ColorBadge";
import type { RootStackParamList } from "../navigation/types";
import { useSession } from "../session/session-context";
import type { ClienteDiaPublic } from "../types/cobrador";

type Props = NativeStackScreenProps<RootStackParamList, "Dia">;

export function DiaScreen({ navigation, route }: Props) {
  const { rutaId } = route.params;
  const { api, logout } = useSession();
  const [clientes, setClientes] = useState<ClienteDiaPublic[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [gastoAbierto, setGastoAbierto] = useState(false);
  const [gastoDescripcion, setGastoDescripcion] = useState("");
  const [gastoValor, setGastoValor] = useState("");
  const [gastoEnviando, setGastoEnviando] = useState(false);
  const [gastoMensaje, setGastoMensaje] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const dia = await api.dia(rutaId);
      setClientes(dia.clientes);
    } catch (err) {
      if (apiErrorStatus(err) === 401) {
        await logout();
      } else {
        setError("No se pudo cargar la lista del día.");
      }
    }
  }, [api, logout, rutaId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount (async; no setState síncrono)
    cargar();
  }, [cargar]);

  async function registrarGasto() {
    const valor = Number(gastoValor);
    if (!gastoDescripcion.trim() || !Number.isFinite(valor) || valor <= 0) {
      setGastoMensaje("Ingresa descripción y un valor válido.");
      return;
    }
    setGastoEnviando(true);
    setGastoMensaje(null);
    try {
      await api.registrarGasto(rutaId, { descripcion: gastoDescripcion.trim(), valor }, []);
      setGastoDescripcion("");
      setGastoValor("");
      setGastoAbierto(false);
      setGastoMensaje("Gasto registrado.");
    } catch {
      setGastoMensaje("No se pudo registrar el gasto.");
    } finally {
      setGastoEnviando(false);
    }
  }

  if (!clientes) {
    return (
      <View style={styles.centro}>
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.error}>{error}</Text>
            <Pressable style={styles.botonPrimario} onPress={cargar}>
              <Text style={styles.botonPrimarioTexto}>Reintentar</Text>
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
      <FlatList
        data={clientes}
        keyExtractor={(cliente) => String(cliente.clienteId)}
        contentContainerStyle={styles.lista}
        ListHeaderComponent={
          <View style={styles.acciones}>
            <Pressable
              testID="nuevo-gasto"
              style={styles.botonPrimario}
              onPress={() => setGastoAbierto((abierto) => !abierto)}
            >
              <Text style={styles.botonPrimarioTexto}>Registrar gasto</Text>
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.vacio}>Sin clientes para hoy.</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`cliente-${item.clienteId}`}
            style={styles.tarjeta}
            onPress={() =>
              navigation.navigate("Cliente", {
                rutaId,
                clienteId: item.clienteId,
                nombre: item.nombre,
              })
            }
          >
            <View style={styles.tarjetaInfo}>
              <Text style={styles.clienteNombre}>{item.nombre}</Text>
              {item.enTrayecto ? (
                <Text style={styles.enTrayecto}>En trayecto</Text>
              ) : null}
            </View>
            <ColorBadge color={item.color} />
          </Pressable>
        )}
      />

      {gastoAbierto ? (
        <View testID="gasto-form" style={styles.gastoForm}>
          <Text style={styles.gastoTitulo}>Nuevo gasto</Text>
          <TextInput
            testID="gasto-descripcion"
            style={styles.input}
            placeholder="Descripción"
            value={gastoDescripcion}
            onChangeText={setGastoDescripcion}
          />
          <TextInput
            testID="gasto-valor"
            style={styles.input}
            placeholder="Valor"
            keyboardType="decimal-pad"
            value={gastoValor}
            onChangeText={setGastoValor}
          />
          {gastoMensaje ? (
            <Text style={styles.gastoMensaje}>{gastoMensaje}</Text>
          ) : null}
          <Pressable
            testID="gasto-guardar"
            style={[styles.botonPrimario, gastoEnviando && styles.deshabilitado]}
            disabled={gastoEnviando}
            onPress={registrarGasto}
          >
            {gastoEnviando ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.botonPrimarioTexto}>Guardar</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#f8fafc" },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorBox: { alignItems: "center", gap: 8 },
  error: { color: "#dc2626", fontSize: 15 },
  lista: { padding: 16, gap: 10 },
  vacio: { color: "#64748b", textAlign: "center", marginTop: 24 },
  acciones: { marginBottom: 8 },
  botonPrimario: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  botonPrimarioTexto: { color: "#ffffff", fontWeight: "600" },
  deshabilitado: { backgroundColor: "#93c5fd" },
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
  clienteNombre: { fontSize: 16, fontWeight: "600" },
  enTrayecto: { color: "#2563eb", fontSize: 12, marginTop: 2 },
  gastoForm: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    padding: 16,
    gap: 10,
  },
  gastoTitulo: { fontSize: 16, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  gastoMensaje: { color: "#16a34a", fontSize: 13 },
});