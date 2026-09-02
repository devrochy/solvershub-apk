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
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { apiErrorStatus, esErrorDeRed } from "../api/client";
import { CargaError } from "../components/CargaError";
import { ColorBadge } from "../components/ColorBadge";
import { EvidenciaPicker } from "../components/EvidenciaPicker";
import { MAX_EVIDENCIAS, evidenciasParaOffline, useEvidencias } from "../features/gastos/use-evidencias";
import {
  abrirNavegacion,
  coordenadaDeCliente,
} from "../features/navegacion/navegacion";
import { useTrayectoria } from "../features/trayectoria/use-trayectoria";
import type { RootStackParamList, RootTabParamList } from "../navigation/types";
import { useOffline } from "../offline/offline-context";
import { guardarCliente, guardarDia, leerDia } from "../offline/cache";
import { useSession } from "../session/session-context";
import { useRutaActiva } from "../session/ruta-activa-context";
import type { ClienteDiaPublic, TrayectoPublic } from "../types/cobrador";

type Props = { navigation: StackNavigation };
type StackNavigation = {
  navigate(screen: "Cliente", params: RootStackParamList["Cliente"]): void;
};

export function DiaScreen({ navigation }: Props) {
  const { rutaActiva } = useRutaActiva();
  const rutaId = rutaActiva?.rutaId ?? 0;
  const { api, logout } = useSession();
  const offline = useOffline();
  const [clientes, setClientes] = useState<ClienteDiaPublic[] | null>(null);
  const [trayectos, setTrayectos] = useState<TrayectoPublic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  const [offlineCache, setOfflineCache] = useState(false);

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

  const precargarClientes = useCallback(
    async (clientes: ClienteDiaPublic[]) => {
      // Pre-cache de tarjeta + préstamos de cada cliente del día para que
      // estén disponibles offline. En segundo plano (no bloquea el render).
      await Promise.allSettled(
        clientes.map(async (cliente) => {
          try {
            const [t, p] = await Promise.all([
              api.tarjeta(rutaId, cliente.clienteId),
              api.listarPrestamosDeCliente(rutaId, cliente.clienteId),
            ]);
            await guardarCliente(rutaId, cliente.clienteId, {
              tarjeta: t,
              prestamos: p,
            });
          } catch {
            // se ignora: ese cliente se cacheará al abrirlo online
          }
        }),
      );
    },
    [api, rutaId],
  );

  const cargar = useCallback(async () => {
    setError(null);
    setOfflineCache(false);
    try {
      const dia = await api.dia(rutaId);
      setClientes(dia.clientes);
      setTrayectos(dia.trayectos);
      await guardarDia(rutaId, dia);
      void precargarClientes(dia.clientes);
    } catch (err) {
      if (apiErrorStatus(err) === 401) {
        await logout();
      } else if (esErrorDeRed(err)) {
        const cache = await leerDia(rutaId);
        if (cache) {
          setClientes(cache.clientes);
          setTrayectos(cache.trayectos ?? null);
          setOfflineCache(true);
        } else {
          setError("No se pudo cargar la lista del día.");
        }
      } else {
        setError("No se pudo cargar la lista del día.");
      }
    }
  }, [api, logout, rutaId, precargarClientes]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount (async; no setState síncrono)
    cargar();
  }, [cargar]);

  useEffect(() => {
    // Auditoría de apertura de la ruta del día (HU-41): registra el momento y
    // las coordenadas en que el cobrador abre la ruta. Fire-and-forget.
    api
      .registrarApertura(rutaId, {})
      .catch(() => undefined);
  }, [api, rutaId]);

  useEffect(() => {
    // Re-fetch periódico: la lista del día se va actualizando a medida que se
    // registran visitas (HU-56). No interfiere con el pull-to-refresh ni con
    // el modo offline (cargar() ya maneja la caída al cache).
    const intervalo = setInterval(() => {
      void cargar();
    }, 30000);
    return () => clearInterval(intervalo);
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
    const evidenciasOffline = evidenciasParaOffline(evidencias);
    try {
      await api.registrarGasto(rutaId, input, evidencias);
      setGastoDescripcion("");
      setGastoValor("");
      evidencias.forEach((e) => quitar(e.uri));
      setGastoAbierto(false);
      setGastoMensaje("Gasto registrado.");
    } catch (err) {
      if (esErrorDeRed(err)) {
        await offline.encolar("gasto", { ...input, evidencias: evidenciasOffline });
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
    } catch (err) {
      if (esErrorDeRed(err)) {
        await offline.encolar("trayectoria", { puntos });
        setTrayectoriaMensaje("Guardado sin conexión (se sincronizará).");
      } else {
        setTrayectoriaMensaje("No se pudo enviar la trayectoria.");
      }
    } finally {
      setTrayectoriaEnviando(false);
    }
  }

  if (!rutaActiva) {
    return (
      <View style={styles.contenedor}>
        <Text style={styles.vacio}>Selecciona una ruta para ver el día.</Text>
      </View>
    );
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
            {offlineCache ? (
              <Text testID="aviso-offline" style={styles.avisoOffline}>
                Datos sin conexión
              </Text>
            ) : null}
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
        renderItem={({ item }) => {
          const coords = coordenadaDeCliente(trayectos, item.clienteId);
          return (
            <Pressable
              testID={`cliente-${item.clienteId}`}
              style={styles.tarjeta}
              onPress={() =>
                (navigation as unknown as StackNavigation).navigate("Cliente", {
                  rutaId,
                  clienteId: item.clienteId,
                  nombre: item.nombre,
                  ...(coords ?? {}),
                })
              }
            >
              <View style={styles.tarjetaInfo}>
                <Text style={styles.clienteNombre}>{item.nombre}</Text>
                {item.enTrayecto ? (
                  <Text style={styles.enTrayecto}>En trayecto</Text>
                ) : null}
                {coords ? (
                  <Pressable
                    testID={`llegar-${item.clienteId}`}
                    style={styles.llegar}
                    onPress={() => abrirNavegacion(coords.latitud, coords.longitud, "maps")}
                  >
                    <Text style={styles.llegarTexto}>Cómo llegar</Text>
                  </Pressable>
                ) : null}
              </View>
              <ColorBadge color={item.color} />
            </Pressable>
          );
        }}
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
  avisoOffline: { color: "#d97706", fontWeight: "600", fontSize: 13 },
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
  llegar: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "#0891b2",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  llegarTexto: { color: "#ffffff", fontWeight: "600", fontSize: 12 },
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