import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { File, Paths } from "expo-file-system";
import { shareAsync } from "expo-sharing";
import { apiErrorStatus, esErrorDeRed } from "../api/client";
import { CargaError } from "../components/CargaError";
import { fondoDeEstado } from "../components/ColorBadge";
import { EvidenciaPicker } from "../components/EvidenciaPicker";
import { ModalConFooter } from "../components/ModalConFooter";
import { TrayectosLista } from "../components/TrayectosLista";
import { MAX_EVIDENCIAS, evidenciasParaOffline, useEvidencias } from "../features/gastos/use-evidencias";
import {
  abrirNavegacion,
  coordenadaDeCliente,
} from "../features/navegacion/navegacion";
import { useTrayectoria } from "../features/trayectoria/use-trayectoria";
import { usePosicion } from "../features/trayectoria/use-posicion";
import { usePantallaActiva } from "../navigation/pantalla-activa-context";
import { useOffline } from "../offline/offline-context";
import { guardarCliente, guardarDia, leerDia } from "../offline/cache";
import { useSession } from "../session/session-context";
import { useRutaActiva } from "../session/ruta-activa-context";
import type { ClienteDiaPublic, LiquidacionPublic, TrayectoPublic } from "../types/cobrador";

export function DiaScreen() {
  const { rutaActiva } = useRutaActiva();
  const rutaId = rutaActiva?.rutaId ?? 0;
  const { abrir: abrirPantallaActiva } = usePantallaActiva();
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
  const posicion = usePosicion(api, rutaId, trayectoria.activa, trayectoria.puntos.length);
  const [trayectoriaMensaje, setTrayectoriaMensaje] = useState<string | null>(null);
  const [generandoTrayecto, setGenerandoTrayecto] = useState(false);
  const [trayectoriaEnviando, setTrayectoriaEnviando] = useState(false);
  const [trayectosAbierto, setTrayectosAbierto] = useState(false);

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
    if (!rutaId) {
      return;
    }
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
    if (!rutaId) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount (async; no setState síncrono)
    cargar();
  }, [cargar, rutaId]);

  useEffect(() => {
    if (!rutaId) {
      return;
    }
    // Auditoría de apertura de la ruta del día (HU-41): registra el momento y
    // las coordenadas en que el cobrador abre la ruta. Fire-and-forget.
    api
      .registrarApertura(rutaId, {})
      .catch(() => undefined);
  }, [api, rutaId]);

  useEffect(() => {
    if (!rutaId) {
      return;
    }
    // Re-fetch periódico: la lista del día se va actualizando a medida que se
    // registran visitas (HU-56). No interfiere con el pull-to-refresh ni con
    // el modo offline (cargar() ya maneja la caída al cache).
    const intervalo = setInterval(() => {
      void cargar();
    }, 30000);
    return () => clearInterval(intervalo);
  }, [cargar, rutaId]);

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
      await api.registrarGasto(rutaId, input, evidencias);
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
    if (!rutaId) {
      return;
    }
    setGenerandoTrayecto(true);
    try {
      await api.generarTrayecto(rutaId);
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

  // A12: la lista de cobros solo se habilita con trayecto planificado Y GPS activo.
  const listaHabilitada = Boolean(trayectos) && trayectoria.activa;

  const puedeLiquidarHoy =
    Array.isArray(clientes) &&
    clientes.length > 0 &&
    clientes.every((cliente) => cliente.visitaRegistrada);

  const liquidacionVisible = Boolean(rutaActiva?.config.generarReportesApk);

  async function abrirLiquidacion() {
    setLiquidacionMensaje(null);
    setPdfMensaje(null);
    setLiquidacionMensajeOk(false);
    setLiquidacionAbierta(true);
    setLiquidacionCargando(true);
    try {
      const lista = await api.listarLiquidaciones(rutaId);
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
      setLiquidacion(await api.generarLiquidacion(rutaId, {}));
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
      const bytes = await api.exportarLiquidacionPdf(rutaId, liquidacion.id);
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
    <SafeAreaView style={styles.contenedor} edges={["top", "left", "right"]}>
      <View style={styles.header} testID="header-dia">
        <Text style={styles.headerTitulo}>Cobros del día</Text>
        <Pressable
          testID="nuevo-gasto"
          style={styles.botonGastos}
          onPress={() => {
            setGastoAbierto(true);
            setGastoMensaje(null);
          }}
        >
          <Text style={styles.botonGastosTexto}>+ Gastos</Text>
        </Pressable>
      </View>
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
                onPress={() => setTrayectosAbierto(true)}
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
                { backgroundColor: fondoDeEstado(item.color) },
                !listaHabilitada && styles.tarjetaBloqueada,
              ]}
              disabled={!listaHabilitada}
              onPress={() =>
                abrirPantallaActiva({
                  tipo: "cliente",
                  rutaId,
                  clienteId: item.clienteId,
                  nombre: item.nombre,
                  ...(coords ?? {}),
                  prestamoAutoSeleccionado: true,
                })
              }
            >
              <View style={styles.tarjetaInfo}>
                <Text style={styles.clienteNombre}>{item.nombre}</Text>
                {item.diasMora > 0 ? (
                  <Text testID={`mora-${item.clienteId}`} style={styles.textoMora}>
                    {item.diasMora} {item.diasMora === 1 ? "día" : "días"} de mora
                  </Text>
                ) : null}
                {item.compromisoValor != null ? (
                  <Text testID={`compromiso-${item.clienteId}`} style={styles.textoCompromiso}>
                    Compromiso de pago hoy: ${item.compromisoValor}
                  </Text>
                ) : null}
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

      {trayectosAbierto && trayectos ? (
        <View style={styles.trayectosOverlay}>
          <TrayectosLista
            clientes={clientes}
            trayectos={trayectos}
            onCerrar={() => setTrayectosAbierto(false)}
          />
        </View>
      ) : null}

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
                    <Text style={styles.liquidacionLinea}>
                      Caja anterior: {liquidacion.cajaAnterior}
                    </Text>
                    <Text style={styles.liquidacionLinea}>
                      Caja actual: {liquidacion.cajaActual}
                    </Text>
                    <Text style={styles.liquidacionLinea}>
                      Estimado a cobrar: {liquidacion.estimadoACobrar}
                    </Text>
                    <Text style={styles.liquidacionLinea}>
                      Total cobrado día: {liquidacion.totalCobradoDia}
                    </Text>
                    <Text style={styles.liquidacionLinea}>
                      Total inyección: {liquidacion.totalInyeccion}
                    </Text>
                    <Text style={styles.liquidacionLinea}>
                      Total prestado: {liquidacion.totalPrestado}
                    </Text>
                    <Text style={styles.liquidacionLinea}>
                      Total gastos: {liquidacion.totalGastos}
                    </Text>
                    <Text style={styles.liquidacionLinea}>
                      Suma cartera: {liquidacion.sumaCartera}
                    </Text>
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
                    style={[styles.botonLiquidacion, descargandoPdf && styles.deshabilitado]}
                    disabled={descargandoPdf}
                    onPress={() => void descargarPdf()}
                  >
                    {descargandoPdf ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.botonLiquidacionTexto}>Descargar PDF</Text>
                    )}
                  </Pressable>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  botonGastos: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    width: 84,
  },
  botonGastosTexto: { color: "#2563eb", fontWeight: "700", fontSize: 14 },
  headerTitulo: { fontSize: 17, fontWeight: "700", color: "#334155" },
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
  botonTrayectos: {
    backgroundColor: "#0891b2",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  botonTrayectosTexto: { color: "#ffffff", fontWeight: "600" },
  botonLiquidacion: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  botonLiquidacionBloqueado: { opacity: 0.4 },
  botonLiquidacionTexto: { color: "#ffffff", fontWeight: "600" },
  liquidacionContenedor: { flex: 1, backgroundColor: "#f8fafc" },
  liquidacionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  liquidacionTitulo: { fontSize: 16, fontWeight: "700", color: "#334155" },
  liquidacionCerrar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
  },
  liquidacionCerrarTexto: { color: "#475569", fontSize: 16 },
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
  trayectosOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#f8fafc",
    zIndex: 10,
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
  textoMora: { color: "#dc2626", fontSize: 12, fontWeight: "600", marginTop: 2 },
  textoCompromiso: { color: "#b45309", fontSize: 12, fontWeight: "600", marginTop: 2 },
  llegar: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "#0891b2",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  llegarTexto: { color: "#ffffff", fontWeight: "600", fontSize: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  gastoMensaje: { color: "#16a34a", fontSize: 13 },
  gastoMensajeError: { color: "#dc2626" },
});