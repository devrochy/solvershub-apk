import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { apiErrorStatus, esErrorDeRed } from "../api/client";
import { CargaError } from "../components/CargaError";
import { ColorBadge } from "../components/ColorBadge";
import { EvidenciaPicker } from "../components/EvidenciaPicker";
import { MAX_EVIDENCIAS, useEvidencias } from "../features/gastos/use-evidencias";
import { useTrayectoria } from "../features/trayectoria/use-trayectoria";
import type { RootStackParamList } from "../navigation/types";
import { useOffline } from "../offline/offline-context";
import { useSession } from "../session/session-context";
import type { ClienteDiaPublic } from "../types/cobrador";

type Props = NativeStackScreenProps<RootStackParamList, "Dia">;

export function DiaScreen({ navigation, route }: Props) {
  const { rutaId } = route.params;
  const { api, logout } = useSession();
  const offline = useOffline();
  const [clientes, setClientes] = useState<ClienteDiaPublic[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const [gastoAbierto, setGastoAbierto] = useState(false);
  const [gastoDescripcion, setGastoDescripcion] = useState("");
  const [gastoValor, setGastoValor] = useState("");
  const [gastoEnviando, setGastoEnviando] = useState(false);
  const [gastoMensaje, setGastoMensaje] = useState<string | null>(null);
  const {
    evidencias,
    cargando: evidenciasCargando,
    error: evidenciasError,
    agregarDesdeLibreria,
    agregarDesdeCamara,
    quitar,
  } = useEvidencias();
  const trayectoria = useTrayectoria();
  const [trayectoriaMensaje, setTrayectoriaMensaje] = useState<string | null>(null);
  const [trayectoriaEnviando, setTrayectoriaEnviando] = useState(false);

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
    const input = { descripcion: gastoDescripcion.trim(), valor };
    try {
      await api.registrarGasto(rutaId, input, evidencias);
      setGastoDescripcion("");
      setGastoValor("");
      evidencias.forEach((e) => quitar(e.uri));
      setGastoAbierto(false);
      setGastoMensaje("Gasto registrado.");
    } catch (err) {
      if (esErrorDeRed(err)) {
        await offline.encolar("gasto", input);
        setGastoDescripcion("");
        setGastoValor("");
        setGastoAbierto(false);
        setGastoMensaje("Guardado sin conexión (se sincronizará).");
      } else {
        setGastoMensaje("No se pudo registrar el gasto.");
      }
    } finally {
      setGastoEnviando(false);
    }
  }

  async function refrescar() {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }

  async function detenerYEnviarTrayectoria() {
    const puntos = trayectoria.detener();
    if (puntos.length < 2) {
      setTrayectoriaMensaje("Se necesitan al menos 2 puntos de ubicación.");
      return;
    }
    setTrayectoriaEnviando(true);
    setTrayectoriaMensaje(null);
    try {
      await api.registrarTrayectoriaReal(rutaId, { puntos });
      setTrayectoriaMensaje("Trayectoria enviada.");
    } catch {
      setTrayectoriaMensaje("No se pudo enviar la trayectoria.");
    } finally {
      setTrayectoriaEnviando(false);
    }
  }

  if (!clientes) {
    return <CargaError cargando={!error} error={error} onReintentar={cargar} />;
  }

  return (
    <View style={styles.contenedor}>
      <FlatList
        data={clientes}
        keyExtractor={(cliente) => String(cliente.clienteId)}
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={refrescar} />
        }
        ListHeaderComponent={
          <View style={styles.acciones}>
            {trayectoria.activa ? (
              <View style={styles.trayectoriaActiva}>
                <View style={styles.puntoRojo} />
                <Text style={styles.trayectoriaTexto}>
                  Grabando · {trayectoria.puntos.length} puntos
                </Text>
                <Pressable
                  testID="detener-trayectoria"
                  style={[styles.botonPrimario, trayectoriaEnviando && styles.deshabilitado]}
                  disabled={trayectoriaEnviando}
                  onPress={detenerYEnviarTrayectoria}
                >
                  {trayectoriaEnviando ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.botonPrimarioTexto}>Detener y enviar</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <Pressable
                testID="iniciar-trayectoria"
                style={styles.botonSecundario}
                onPress={trayectoria.iniciar}
              >
                <Text style={styles.botonSecundarioTexto}>Iniciar GPS</Text>
              </Pressable>
            )}
            {trayectoria.error || trayectoriaMensaje ? (
              <Text style={styles.mensajeTrayectoria}>
                {trayectoria.error ?? trayectoriaMensaje}
              </Text>
            ) : null}
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
          <EvidenciaPicker
            evidencias={evidencias}
            cargando={evidenciasCargando}
            error={evidenciasError}
            onAgregarLibreria={agregarDesdeLibreria}
            onAgregarCamara={agregarDesdeCamara}
            onQuitar={quitar}
            max={MAX_EVIDENCIAS}
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
  lista: { padding: 16, gap: 10 },
  vacio: { color: "#64748b", textAlign: "center", marginTop: 24 },
  acciones: { marginBottom: 8, gap: 8 },
  botonPrimario: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  botonPrimarioTexto: { color: "#ffffff", fontWeight: "600" },
  botonSecundario: {
    backgroundColor: "#dc2626",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  botonSecundarioTexto: { color: "#ffffff", fontWeight: "600" },
  trayectoriaActiva: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    padding: 10,
  },
  puntoRojo: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#dc2626",
  },
  trayectoriaTexto: { color: "#7f1d1d", fontWeight: "600", flex: 1 },
  mensajeTrayectoria: { color: "#475569", fontSize: 13 },
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