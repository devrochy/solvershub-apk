import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { File, Paths } from "expo-file-system";
import { shareAsync } from "expo-sharing";
import { apiErrorStatus, esErrorDeRed } from "../api/client";
import { CargaError } from "../components/CargaError";
import { CampoModal } from "../components/CampoModal";
import { colorDeEstado } from "../components/ColorBadge";
import { EvidenciaPicker } from "../components/EvidenciaPicker";
import { HeaderPantalla, estilosHeader } from "../components/HeaderPantalla";
import { ModalConFooter } from "../components/ModalConFooter";
import { MAX_EVIDENCIAS, evidenciasParaOffline, useEvidencias } from "../features/gastos/use-evidencias";
import {
  abrirNavegacion,
  coordenadaDeCliente,
} from "../features/navegacion/navegacion";
import { useTrayectoria } from "../features/trayectoria/use-trayectoria";
import { usePosicion } from "../features/trayectoria/use-posicion";
import { usePantallaActiva } from "../navigation/pantalla-activa-context";
import { useTrayectosOverlay } from "../navigation/trayectos-overlay-context";
import { useOffline } from "../offline/offline-context";
import { guardarCliente, guardarTrayectoDiario, leerTrayectoDiario } from "../offline/cache";
import { clientesAprecargar } from "../offline/precarga";
import { useSession } from "../session/session-context";
import { useCarteraActiva } from "../session/cartera-activa-context";
import type { ClienteTrayectoDiarioPublic, LiquidacionPublic, TrayectoPublic } from "../types/gestor";

/** TTL de la precarga offline de clientes (evita re-precargar cada 30s). */
const PRECARGA_TTL_MS = 5 * 60 * 1000;

export function TrayectoDiarioScreen() {
  const { carteraActiva } = useCarteraActiva();
  const carteraId = carteraActiva?.carteraId ?? 0;
  const { abrir: abrirPantallaActiva } = usePantallaActiva();
  const { api, logout } = useSession();
  const offline = useOffline();
  // Cliente → timestamp de su última precarga (throttle con TTL por sesión).
  const precargadosRef = useRef<Map<number, number>>(new Map());
  const [clientes, setClientes] = useState<ClienteTrayectoDiarioPublic[] | null>(null);
  const [trayectos, setTrayectos] = useState<TrayectoPublic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  const [offlineCache, setOfflineCache] = useState(false);

  const [gastoAbierto, setGastoAbierto] = useState(false);
  const [gastoDescripcion, setGastoDescripcion] = useState("");
  const [gastoValor, setGastoValor] = useState("");
  const [gastoEnviando, setGastoEnviando] = useState(false);
  const [gastoMensaje, setGastoMensaje] = useState<{
    texto: string;
    esError: boolean;
  } | null>(null);
  const {
    evidencias,
    cargando: evidenciasCargando,
    error: evidenciasError,
    agregarDesdeLibreria,
    agregarDesdeCamara,
    quitar,
  } = useEvidencias();
  const trayectoria = useTrayectoria();
  const posicion = usePosicion(api, carteraId, trayectoria.activa, trayectoria.puntos.length);
  const [trayectoriaMensaje, setTrayectoriaMensaje] = useState<string | null>(null);
  const [generandoTrayecto, setGenerandoTrayecto] = useState(false);
  const [trayectoriaEnviando, setTrayectoriaEnviando] = useState(false);
  const { abrir: abrirTrayectosOverlay } = useTrayectosOverlay();

  // Liquidación del día.
  const [liquidacionAbierta, setLiquidacionAbierta] = useState(false);
  const [liquidacion, setLiquidacion] = useState<LiquidacionPublic | null>(null);
  const [liquidacionCargando, setLiquidacionCargando] = useState(false);
  const [liquidacionMensaje, setLiquidacionMensaje] = useState<string | null>(null);
  const [liquidacionMensajeOk, setLiquidacionMensajeOk] = useState(false);
  const [generandoLiquidacion, setGenerandoLiquidacion] = useState(false);
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const [pdfMensaje, setPdfMensaje] = useState<string | null>(null);

  const precargarClientes = useCallback(
    async (clientes: ClienteTrayectoDiarioPublic[]) => {
      // Pre-cache de tarjeta + préstamos de cada cliente del día para que
      // estén disponibles offline. Con TTL para no repetir ~2N requests en cada
      // re-fetch periódico (cada 30s).
      const pendientes = clientesAprecargar(
        clientes,
        precargadosRef.current,
        Date.now(),
        PRECARGA_TTL_MS,
      );
      if (pendientes.length === 0) {
        return;
      }
      const ahora = Date.now();
      for (const cliente of pendientes) {
        precargadosRef.current.set(cliente.clienteId, ahora);
      }
      await Promise.allSettled(
        pendientes.map(async (cliente) => {
          try {
            const [t, p] = await Promise.all([
              api.tarjeta(carteraId, cliente.clienteId),
              api.listarPrestamosDeCliente(carteraId, cliente.clienteId),
            ]);
            await guardarCliente(carteraId, cliente.clienteId, {
              tarjeta: t,
              prestamos: p,
            });
          } catch {
            // se ignora: ese cliente se cacheará al abrirlo online
          }
        }),
      );
    },
    [api, carteraId],
  );

  const cargar = useCallback(async () => {
    if (!carteraId) {
      return;
    }
    setError(null);
    setOfflineCache(false);
    try {
      const trayectoDiario = await api.trayectoDiario(carteraId);
      setClientes(trayectoDiario.clientes);
      setTrayectos(trayectoDiario.trayectos);
      await guardarTrayectoDiario(carteraId, trayectoDiario);
      void precargarClientes(trayectoDiario.clientes);
    } catch (err) {
      if (apiErrorStatus(err) === 401) {
        await logout();
      } else if (esErrorDeRed(err)) {
        const cache = await leerTrayectoDiario(carteraId);
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
  }, [api, logout, carteraId, precargarClientes]);

  useEffect(() => {
    if (!carteraId) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount (async; no setState síncrono)
    cargar();
  }, [cargar, carteraId, offline.versionRecarga]);

  useEffect(() => {
    if (!carteraId) {
      return;
    }
    // Auditoría de apertura de la cartera del día (HU-41): registra el momento y
    // las coordenadas en que el gestor abre la cartera. Fire-and-forget.
    api
      .registrarApertura(carteraId, {})
      .catch(() => undefined);
  }, [api, carteraId]);

  useEffect(() => {
    if (!carteraId) {
      return;
    }
    // Re-fetch periódico: la lista del día se va actualizando a medida que se
    // registran visitas (HU-56). No interfiere con el pull-to-refresh ni con
    // el modo offline (cargar() ya maneja la caída al cache).
    const intervalo = setInterval(() => {
      void cargar();
    }, 30000);
    return () => clearInterval(intervalo);
  }, [cargar, carteraId]);

  useEffect(() => {
    // Al cambiar de cartera, permitir precargar de nuevo sus clientes.
    precargadosRef.current = new Map();
  }, [carteraId]);

  async function registrarGasto() {
    const valor = Number(gastoValor);
    if (!gastoDescripcion.trim() || !Number.isFinite(valor) || valor <= 0) {
      setGastoMensaje({ texto: "Ingresa descripción y un valor válido.", esError: true });
      return;
    }
    setGastoEnviando(true);
    setGastoMensaje(null);
    const input = { descripcion: gastoDescripcion.trim(), valor };
    const evidenciasOffline = evidenciasParaOffline(evidencias);
    try {
      await api.registrarGasto(carteraId, input, evidencias);
      setGastoDescripcion("");
      setGastoValor("");
      evidencias.forEach((e) => quitar(e.uri));
      setGastoAbierto(false);
      setGastoMensaje({ texto: "Gasto registrado.", esError: false });
    } catch (err) {
      if (esErrorDeRed(err)) {
        await offline.encolar("gasto", { ...input, evidencias: evidenciasOffline });
        setGastoDescripcion("");
        setGastoValor("");
        setGastoAbierto(false);
        setGastoMensaje({
          texto: "Guardado sin conexión (se sincronizará).",
          esError: false,
        });
      } else if (apiErrorStatus(err) === 413) {
        setGastoMensaje({
          texto: "Las evidencias son demasiado grandes. Intenta con menos fotos.",
          esError: true,
        });
      } else {
        setGastoMensaje({ texto: "No se pudo registrar el gasto.", esError: true });
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

  async function generarTrayecto() {
    if (!carteraId) {
      return;
    }
    setGenerandoTrayecto(true);
    try {
      await api.generarTrayecto(carteraId);
      await cargar();
    } catch (err) {
      if (apiErrorStatus(err) === 401) {
        await logout();
      } else {
        setError("No se pudo generar el trayecto.");
      }
    } finally {
      setGenerandoTrayecto(false);
    }
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
      await api.registrarTrayectoriaReal(carteraId, { puntos });
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

  if (!carteraActiva) {
    return (
      <View style={styles.contenedor}>
        <Text style={styles.vacio}>Selecciona una cartera para ver el día.</Text>
      </View>
    );
  }

  if (!clientes) {
    return <CargaError cargando={!error} error={error} onReintentar={cargar} />;
  }

  // A12: la lista de cobros solo se habilita con trayecto planificado Y GPS activo.
  const listaHabilitada = Boolean(trayectos) && trayectoria.activa;

  const puedeLiquidarHoy =
    Array.isArray(clientes) &&
    clientes.length > 0 &&
    clientes.every((cliente) => cliente.visitaRegistrada);

  const permisos = carteraActiva?.permisos;
  const tienePermisoReporte =
    !permisos || permisos.some((p) => p.permiso === "generar_reporte" && p.habilitado);
  const liquidacionVisible =
    Boolean(carteraActiva?.config.generarReportesApk) && tienePermisoReporte;

  async function abrirLiquidacion() {
    setLiquidacionMensaje(null);
    setPdfMensaje(null);
    setLiquidacionMensajeOk(false);
    setLiquidacionAbierta(true);
    setLiquidacionCargando(true);
    try {
      const lista = await api.listarLiquidaciones(carteraId);
      const ahora = new Date();
      const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
      const deHoy = lista.find((l) => l.fecha === hoy) ?? null;
      setLiquidacion(deHoy);
      if (!deHoy) {
        setLiquidacionMensaje("Aún no hay liquidación de hoy. Genera la liquidación del día.");
        setLiquidacionMensajeOk(true);
      } else {
        setLiquidacionMensajeOk(false);
      }
    } catch (err) {
      if (apiErrorStatus(err) === 401) {
        await logout();
      } else {
        setLiquidacionMensaje("No se pudieron cargar las liquidaciones.");
      }
    } finally {
      setLiquidacionCargando(false);
    }
  }

  function cerrarLiquidacion() {
    setLiquidacionAbierta(false);
    setLiquidacion(null);
    setLiquidacionMensaje(null);
    setPdfMensaje(null);
  }

  async function generarLiquidacion() {
    setGenerandoLiquidacion(true);
    setLiquidacionMensaje(null);
    setLiquidacionMensajeOk(false);
    try {
      setLiquidacion(await api.generarLiquidacion(carteraId, {}));
      setLiquidacionMensaje("Liquidación del día generada.");
      setLiquidacionMensajeOk(true);
    } catch (err) {
      setLiquidacionMensajeOk(false);
      if (apiErrorStatus(err) === 401) {
        await logout();
      } else if (err instanceof Error && err.message) {
        try {
          const cuerpo = JSON.parse(err.message) as { message?: string };
          setLiquidacionMensaje(
            typeof cuerpo.message === "string"
              ? cuerpo.message
              : "No se pudo generar la liquidación.",
          );
        } catch {
          setLiquidacionMensaje("No se pudo generar la liquidación.");
        }
      } else {
        setLiquidacionMensaje("No se pudo generar la liquidación.");
      }
    } finally {
      setGenerandoLiquidacion(false);
    }
  }

  async function descargarPdf() {
    if (!liquidacion) {
      return;
    }
    setDescargandoPdf(true);
    setPdfMensaje(null);
    try {
      const bytes = await api.exportarLiquidacionPdf(carteraId, liquidacion.id);
      const archivo = new File(Paths.cache, `liquidacion-${liquidacion.fecha}.pdf`);
      await archivo.write(bytes);
      await shareAsync(archivo.uri, {
        mimeType: "application/pdf",
        dialogTitle: "Resumen de liquidación",
      });
    } catch (err) {
      if (apiErrorStatus(err) === 401) {
        await logout();
      } else if (esErrorDeRed(err)) {
        setPdfMensaje("Se requiere conexión para descargar el PDF.");
      } else {
        setPdfMensaje("No se pudo descargar el PDF.");
      }
    } finally {
      setDescargandoPdf(false);
    }
  }

  return (
    <SafeAreaView style={styles.contenedor} edges={["left", "right"]}>
      <HeaderPantalla>
        <View style={estilosHeader.fila} testID="header-trayectoDiario">
          <View style={estilosHeader.bloqueTitulo}>
            <Text style={estilosHeader.titulo}>Cobros del día</Text>
            {clientes ? (
              <Text style={estilosHeader.subtitulo}>
                {clientes.length} cliente{clientes.length === 1 ? "" : "s"}
              </Text>
            ) : null}
          </View>
          <Pressable
            testID="nuevo-gasto"
            style={estilosHeader.accionPill}
            onPress={() => {
              setGastoAbierto(true);
              setGastoMensaje(null);
            }}
          >
            <Text style={estilosHeader.accionPillTexto}>+ Gastos</Text>
          </Pressable>
        </View>
      </HeaderPantalla>
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
            {error ? (
              <Text testID="aviso-refresco" style={styles.avisoOffline}>
                {error}
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
            {!trayectos ? (
              <View style={styles.gating}>
                <Text style={styles.gatingTexto}>
                  Genera el trayecto óptimo para habilitar los cobros del día.
                </Text>
                <Pressable
                  testID="generar-trayecto"
                  style={[styles.botonPrimario, generandoTrayecto && styles.deshabilitado]}
                  disabled={generandoTrayecto}
                  onPress={generarTrayecto}
                >
                  {generandoTrayecto ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.botonPrimarioTexto}>Generar trayecto</Text>
                  )}
                </Pressable>
              </View>
            ) : !trayectoria.activa ? (
              <View style={styles.gating}>
                <Text style={styles.gatingTexto}>
                  Activa el GPS para habilitar la lista de cobros.
                </Text>
              </View>
            ) : null}
            {trayectos ? (
              <Pressable
                testID="ver-trayectos"
                style={styles.botonTrayectos}
                onPress={() => {
                  if (clientes && trayectos) {
                    abrirTrayectosOverlay({ clientes, trayectos });
                  }
                }}
              >
                <Text style={styles.botonTrayectosTexto}>Ver trayectos</Text>
              </Pressable>
            ) : null}
            {liquidacionVisible ? (
              <Pressable
                testID="btn-liquidacion"
                style={[
                  styles.botonLiquidacion,
                  !puedeLiquidarHoy && styles.botonLiquidacionBloqueado,
                ]}
                disabled={!puedeLiquidarHoy}
                onPress={() => void abrirLiquidacion()}
              >
                <Text style={styles.botonLiquidacionTexto}>Liquidación del día</Text>
              </Pressable>
            ) : null}
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
              style={[
                styles.tarjeta,
                !listaHabilitada && styles.tarjetaBloqueada,
              ]}
              disabled={!listaHabilitada}
              onPress={() =>
                abrirPantallaActiva({
                  tipo: "cliente",
                  carteraId,
                  clienteId: item.clienteId,
                  nombre: item.nombre,
                  ...(coords ?? {}),
                  prestamoAutoSeleccionado: true,
                })
              }
            >
              <View
                testID={`acento-${item.clienteId}`}
                style={[
                  styles.acento,
                  { backgroundColor: colorDeEstado(item.color) },
                ]}
              />
              <View style={styles.tarjetaInfo}>
                <Text style={styles.clienteNombre}>{item.nombre}</Text>
                {item.diasMora > 0 ? (
                  <View
                    testID={`mora-${item.clienteId}`}
                    style={[styles.chip, styles.chipMora]}
                  >
                    <Text style={styles.chipMoraTexto}>
                      {item.diasMora} {item.diasMora === 1 ? "día" : "días"} de mora
                    </Text>
                  </View>
                ) : null}
                {item.compromisoValor != null ? (
                  <View
                    testID={`compromiso-${item.clienteId}`}
                    style={[styles.chip, styles.chipCompromiso]}
                  >
                    <Text style={styles.chipCompromisoTexto}>
                      Compromiso de pago hoy: ${item.compromisoValor}
                    </Text>
                  </View>
                ) : null}
                {item.enTrayecto ? (
                  <View style={[styles.chip, styles.chipTrayecto]}>
                    <Text style={styles.chipTrayectoTexto}>En trayecto</Text>
                  </View>
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
            </Pressable>
          );
        }}
      />

      <ModalConFooter
        visible={gastoAbierto}
        titulo="Nuevo gasto"
        onCerrar={() => setGastoAbierto(false)}
        onCancelar={() => setGastoAbierto(false)}
        onConfirmar={registrarGasto}
        confirmando={gastoEnviando}
        confirmarTestID="gasto-guardar"
        testID="gasto-form"
      >
        <CampoModal
          testID="gasto-descripcion"
          label="Descripción"
          placeholder="Descripción"
          value={gastoDescripcion}
          onChangeText={setGastoDescripcion}
        />
        <CampoModal
          testID="gasto-valor"
          label="Valor"
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
          <Text
            testID="gasto-mensaje"
            style={[
              styles.gastoMensaje,
              gastoMensaje.esError ? styles.gastoMensajeError : null,
            ]}
          >
            {gastoMensaje.texto}
          </Text>
        ) : null}
      </ModalConFooter>

      {/* Modal a pantalla completa: liquidación del día */}
      <Modal
        visible={liquidacionAbierta}
        animationType="slide"
        onRequestClose={cerrarLiquidacion}
      >
        <SafeAreaView style={styles.liquidacionContenedor} edges={["top", "left", "right"]}>
          <View style={styles.liquidacionHeader}>
            <Text style={styles.liquidacionTitulo}>Liquidación del día</Text>
            <Pressable testID="cerrar-liquidacion" style={styles.liquidacionCerrar} onPress={cerrarLiquidacion}>
              <Text style={styles.liquidacionCerrarTexto}>✕</Text>
            </Pressable>
          </View>

          {liquidacionCargando ? (
            <ActivityIndicator style={styles.liquidacionCarga} />
          ) : (
            <ScrollView contentContainerStyle={styles.liquidacionScroll}>
              {!puedeLiquidarHoy ? (
                <Text style={styles.liquidacionAviso}>
                  Registra la visita de todos los clientes del día para habilitar la liquidación.
                </Text>
              ) : null}

              {liquidacion ? (
                <>
                  <View style={styles.liquidacionResumen}>
                    <Text style={styles.liquidacionLinea}>
                      Fecha: {liquidacion.fecha} · Periodo: {liquidacion.periodo}
                    </Text>
                    {carteraActiva.config.mostrarCaja ?? true ? (
                      <>
                        <Text style={styles.liquidacionLinea}>
                          Caja anterior: {liquidacion.cajaAnterior}
                        </Text>
                        <Text style={styles.liquidacionLinea}>
                          Caja actual: {liquidacion.cajaActual}
                        </Text>
                      </>
                    ) : null}
                    {carteraActiva.config.mostrarCobroEstimado ?? true ? (
                      <Text style={styles.liquidacionLinea}>
                        Estimado a cobrar: {liquidacion.estimadoACobrar}
                      </Text>
                    ) : null}
                    {carteraActiva.config.mostrarCobradoLiquidada ?? true ? (
                      <Text style={styles.liquidacionLinea}>
                        Total cobrado día: {liquidacion.totalCobradoDia}
                      </Text>
                    ) : null}
                    <Text style={styles.liquidacionLinea}>
                      Total inyección: {liquidacion.totalInyeccion}
                    </Text>
                    <Text style={styles.liquidacionLinea}>
                      Total prestado: {liquidacion.totalPrestado}
                    </Text>
                    <Text style={styles.liquidacionLinea}>
                      Total gastos: {liquidacion.totalGastos}
                    </Text>
                    {carteraActiva.config.mostrarPrestamos ?? true ? (
                      <Text style={styles.liquidacionLinea}>
                        Suma cartera: {liquidacion.sumaCartera}
                      </Text>
                    ) : null}
                    <Text style={styles.liquidacionLinea}>
                      Comisión: {liquidacion.comisionPorcentaje}% = {liquidacion.comisionValor}
                    </Text>
                    {liquidacion.comentario ? (
                      <Text style={styles.liquidacionLinea}>
                        Comentario: {liquidacion.comentario}
                      </Text>
                    ) : null}
                  </View>

                  <Text style={styles.liquidacionSubtitulo}>Pagos del día</Text>
                  {liquidacion.pagos.length === 0 ? (
                    <Text style={styles.liquidacionVacio}>Sin pagos registrados.</Text>
                  ) : (
                    liquidacion.pagos.map((p) => (
                      <View key={p.id} style={styles.liquidacionItem}>
                        <Text style={styles.liquidacionItemTexto}>
                          {p.clienteNombre} · {p.valor} ({p.metodoPago})
                        </Text>
                      </View>
                    ))
                  )}

                  <Text style={styles.liquidacionSubtitulo}>Abonos del día</Text>
                  {liquidacion.abonos.length === 0 ? (
                    <Text style={styles.liquidacionVacio}>Sin abonos registrados.</Text>
                  ) : (
                    liquidacion.abonos.map((a) => (
                      <View key={a.id} style={styles.liquidacionItem}>
                        <Text style={styles.liquidacionItemTexto}>
                          {a.clienteNombre} · {a.valor} ({a.metodoPago})
                        </Text>
                      </View>
                    ))
                  )}

                  <Pressable
                    testID="descargar-pdf"
                    style={[styles.botonLiquidacion, (descargandoPdf || !offline.isOnline) && styles.deshabilitado]}
                    disabled={descargandoPdf || !offline.isOnline}
                    onPress={() => void descargarPdf()}
                  >
                    {descargandoPdf ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.botonLiquidacionTexto}>Descargar PDF</Text>
                    )}
                  </Pressable>
                  {!offline.isOnline ? (
                    <Text testID="pdf-requiere-conexion" style={styles.liquidacionAviso}>
                      Requiere conexión para descargar el PDF.
                    </Text>
                  ) : null}
                </>
              ) : (
                <Text style={styles.liquidacionVacio}>
                  Aún no hay liquidación para hoy.
                </Text>
              )}

              {liquidacionMensaje ? (
                <Text
                  testID="liquidacion-mensaje"
                  style={[
                    liquidacionMensajeOk
                      ? styles.liquidacionMensajeOk
                      : styles.liquidacionMensaje,
                  ]}
                >
                  {liquidacionMensaje}
                </Text>
              ) : null}
              {pdfMensaje ? (
                <Text style={styles.liquidacionMensaje}>{pdfMensaje}</Text>
              ) : null}

              {!liquidacion ? (
                <Pressable
                  testID="generar-liquidacion"
                  style={[styles.botonLiquidacion, generandoLiquidacion && styles.deshabilitado]}
                  disabled={generandoLiquidacion || !puedeLiquidarHoy}
                  onPress={() => void generarLiquidacion()}
                >
                  {generandoLiquidacion ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.botonLiquidacionTexto}>Generar liquidación</Text>
                  )}
                </Pressable>
              ) : null}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#f8fafc" },
  lista: { padding: 16, gap: 12 },
  vacio: { color: "#64748b", textAlign: "center", marginTop: 24, fontSize: 14 },
  acciones: { marginBottom: 8, gap: 10 },
  avisoOffline: { color: "#d97706", fontWeight: "600", fontSize: 13 },
  botonPrimario: {
    backgroundColor: "#172f6c",
    borderRadius: 12,
    borderCurve: "continuous",
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  botonPrimarioTexto: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  botonSecundario: {
    backgroundColor: "#dc2626",
    borderRadius: 12,
    borderCurve: "continuous",
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  botonTrayectos: {
    backgroundColor: "#0e7490",
    borderRadius: 12,
    borderCurve: "continuous",
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  botonTrayectosTexto: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  botonLiquidacion: {
    backgroundColor: "#172f6c",
    borderRadius: 12,
    borderCurve: "continuous",
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  botonLiquidacionBloqueado: { opacity: 0.4 },
  botonLiquidacionTexto: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  liquidacionContenedor: { flex: 1, backgroundColor: "#f8fafc" },
  liquidacionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#172f6c",
  },
  liquidacionTitulo: { fontSize: 16, fontWeight: "700", color: "#ffffff" },
  liquidacionCerrar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  liquidacionCerrarTexto: { color: "#ffffff", fontSize: 16 },
  liquidacionCarga: { marginTop: 40 },
  liquidacionScroll: { padding: 16, gap: 10 },
  liquidacionAviso: { color: "#b45309", fontSize: 13, fontWeight: "600" },
  liquidacionResumen: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 12,
    gap: 3,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  liquidacionLinea: { color: "#334155", fontSize: 13, fontWeight: "500" },
  liquidacionSubtitulo: { fontSize: 13, fontWeight: "700", color: "#475569", marginTop: 4 },
  liquidacionVacio: { color: "#94a3b8", fontSize: 13 },
  liquidacionItem: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#ffffff",
  },
  liquidacionItemTexto: { color: "#334155", fontSize: 13 },
  liquidacionMensaje: { color: "#dc2626", fontSize: 13, fontWeight: "500" },
  liquidacionMensajeOk: { color: "#16a34a", fontSize: 13, fontWeight: "500" },
  botonSecundarioTexto: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
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
  gating: {
    backgroundColor: "#fef9c3",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  gatingTexto: { color: "#92400e", fontSize: 13, fontWeight: "600" },
  tarjetaBloqueada: { opacity: 0.5 },
  deshabilitado: { backgroundColor: "#6b8ab5" },
  tarjeta: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderCurve: "continuous",
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  },
  acento: { width: 4 },
  tarjetaInfo: { flex: 1, padding: 14, gap: 6 },
  clienteNombre: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  chip: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipMora: { backgroundColor: "#fee2e2" },
  chipMoraTexto: {
    color: "#b91c1c",
    fontSize: 12,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  chipCompromiso: { backgroundColor: "#fef3c7" },
  chipCompromisoTexto: {
    color: "#92400e",
    fontSize: 12,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  chipTrayecto: { backgroundColor: "#dbeafe" },
  chipTrayectoTexto: { color: "#1d4ed8", fontSize: 12, fontWeight: "700" },
  llegar: { marginTop: 2, alignSelf: "flex-start", paddingVertical: 2 },
  llegarTexto: { color: "#0e7490", fontWeight: "700", fontSize: 13 },
  gastoMensaje: { color: "#16a34a", fontSize: 13 },
  gastoMensajeError: { color: "#dc2626" },
});