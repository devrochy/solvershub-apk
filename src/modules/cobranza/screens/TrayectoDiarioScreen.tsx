import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import * as Location from "expo-location";
import { shareAsync } from "expo-sharing";
import { apiErrorStatus, esErrorDeRed } from "@core/api/client";
import { CargaError } from "../components/CargaError";
import { CampoModal } from "../components/CampoModal";
import { colorDeEstado } from "../components/ColorBadge";
import { EvidenciaPicker } from "../components/EvidenciaPicker";
import { HeaderApp } from "../components/HeaderApp";
import { Breadcrumb } from "../components/Breadcrumb";
import { estilosHeader } from "../components/HeaderPantalla";
import { ModalConFooter } from "../components/ModalConFooter";
import { clienteMasCercano } from "../features/cliente/cliente-cercano";
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
import { guardarBorrador, leerBorrador, limpiarBorrador } from "../offline/borrador";
import { clientesAprecargar } from "../offline/precarga";
import { useSession } from "../session/session-context";
import { useCarteraActiva } from "../session/cartera-activa-context";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { Badge, Button, Icono, useKit, type KitTema } from "@shared/ui";

import type { ClienteTrayectoDiarioPublic, LiquidacionPublic, TrayectoPublic } from "@shared/types/gestor";

/** TTL de la precarga offline de clientes (evita re-precargar cada 30s). */
const PRECARGA_TTL_MS = 5 * 60 * 1000;

export function TrayectoDiarioScreen() {
  const kit = useKit();
  const { c } = kit;
  const styles = useMemo(() => crearEstilos(kit), [kit]);
  const { carteraActiva } = useCarteraActiva();
  const carteraId = carteraActiva?.carteraId ?? "";
  const { abrir: abrirPantallaActiva } = usePantallaActiva();
  const { api, logout } = useSession();
  const offline = useOffline();
  // Cliente → timestamp de su última precarga (throttle con TTL por sesión).
  const precargadosRef = useRef<Map<string, number>>(new Map());
  const [clientes, setClientes] = useState<ClienteTrayectoDiarioPublic[] | null>(null);
  const [trayectos, setTrayectos] = useState<TrayectoPublic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  const [offlineCache, setOfflineCache] = useState(false);
  const [mensajeCercano, setMensajeCercano] = useState<string | null>(null);

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
  // Solo por sus efectos: reporta la posición mientras la trayectoria está activa.
  usePosicion(api, carteraId, trayectoria.activa, trayectoria.puntos.length);
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

  // REQ-APK-014: recupera un gasto capturado si un 401 tumbó la sesión.
  const borradorGastoRef = useRef(false);
  useEffect(() => {
    if (borradorGastoRef.current || !carteraId) {
      return;
    }
    borradorGastoRef.current = true;
    void (async () => {
      const borrador = await leerBorrador<{ descripcion: string; valor: string }>(
        `gasto:${carteraId}`,
      );
      if (!borrador) {
        return;
      }
      setGastoDescripcion(borrador.descripcion);
      setGastoValor(borrador.valor);
      setGastoAbierto(true);
      setGastoMensaje({
        texto: "Recuperamos el gasto que estabas capturando.",
        esError: false,
      });
      await limpiarBorrador(`gasto:${carteraId}`);
    })().catch(() => undefined);
     
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
      if (apiErrorStatus(err) === 401) {
        await guardarBorrador(`gasto:${carteraId}`, {
          descripcion: gastoDescripcion,
          valor: gastoValor,
        });
        await logout();
      } else if (esErrorDeRed(err)) {
        const guardado = await offline.encolar("gasto", {
          ...input,
          carteraId,
          evidencias: evidenciasOffline,
        });
        setGastoDescripcion("");
        setGastoValor("");
        setGastoAbierto(false);
        setGastoMensaje(
          guardado === false
            ? {
                texto: "La cola offline está llena. Sincroniza antes de registrar más.",
                esError: true,
              }
            : { texto: "Guardado sin conexión (se sincronizará).", esError: false },
        );
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

  async function irAlClienteCercano() {
    setMensajeCercano(null);
    if (!clientes || clientes.length === 0) {
      setMensajeCercano("No hay clientes para hoy.");
      return;
    }
    try {
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (!permiso.granted) {
        setMensajeCercano("Se necesita permiso de ubicación.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const cercano = clienteMasCercano(clientes, {
        latitud: pos.coords.latitude,
        longitud: pos.coords.longitude,
      });
      if (!cercano) {
        setMensajeCercano("No hay clientes con ubicación.");
        return;
      }
      abrirPantallaActiva({
        tipo: "cliente",
        carteraId,
        clienteId: cercano.clienteId,
        nombre: cercano.nombre ?? "Cliente",
        ...(typeof cercano.latitud === "number" && typeof cercano.longitud === "number"
          ? { latitud: cercano.latitud, longitud: cercano.longitud }
          : {}),
        prestamoAutoSeleccionado: true,
      });
    } catch {
      setMensajeCercano("No se pudo obtener tu ubicación.");
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
        const guardado = await offline.encolar("trayectoria", { carteraId, puntos });
        setTrayectoriaMensaje(
          guardado === false
            ? "La cola offline está llena. Sincroniza antes de continuar."
            : "Guardado sin conexión (se sincronizará).",
        );
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
    <SafeAreaView style={styles.contenedor} edges={["left", "right", "bottom"]}>
      <HeaderApp
        titulo="Cobros del día"
        subtitulo={
          clientes
            ? `${clientes.length} cliente${clientes.length === 1 ? "" : "s"}`
            : undefined
        }
        acciones={
          <Pressable
            testID="nuevo-gasto"
            accessibilityRole="button"
            accessibilityLabel="Agregar gasto"
            hitSlop={8}
            style={estilosHeader.accionPill}
            onPress={() => {
              setGastoAbierto(true);
              setGastoMensaje(null);
            }}
          >
            <Text style={estilosHeader.accionPillTexto}>+ Gastos</Text>
          </Pressable>
        }
      />
      <Breadcrumb seccion="Diario" />
      <FlatList
        data={clientes}
        keyExtractor={(cliente) => String(cliente.clienteId)}
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={refrescar} colors={[c.link]} tintColor={c.link} />
        }
        ListHeaderComponent={
          <View style={styles.acciones}>
            {offlineCache ? (
              <Badge testID="aviso-offline" tone="warning" icon="cloud-off" size="md" label="Datos sin conexión" />
            ) : null}
            {error ? (
              <View testID="aviso-refresco" style={styles.avisoFila} accessibilityLiveRegion="polite">
                <Icono name="error-outline" size={18} color={c.statusWarningFg} />
                <Text style={styles.avisoOffline}>{error}</Text>
              </View>
            ) : null}
            {trayectoria.activa ? (
              <View style={styles.trayectoriaActiva} accessibilityLiveRegion="polite">
                <View style={styles.puntoRojo} />
                <Text style={styles.trayectoriaTexto}>
                  Grabando · {trayectoria.puntos.length} puntos
                </Text>
                <Button
                  testID="detener-trayectoria"
                  variant="secondary"
                  iconLeft="stop"
                  loading={trayectoriaEnviando}
                  onPress={detenerYEnviarTrayectoria}
                >
                  Detener y enviar
                </Button>
              </View>
            ) : (
              <Button
                testID="iniciar-trayectoria"
                variant="secondary"
                size="lg"
                iconLeft="my-location"
                fullWidth
                onPress={trayectoria.iniciar}
              >
                Iniciar GPS
              </Button>
            )}
            {trayectoria.error || trayectoriaMensaje ? (
              <Text style={styles.mensajeTrayectoria}>
                {trayectoria.error ?? trayectoriaMensaje}
              </Text>
            ) : null}
            {!trayectos ? (
              <View style={styles.gating}>
                <View style={styles.avisoFila}>
                  <Icono name="info-outline" size={18} color={c.statusWarningFg} />
                  <Text style={styles.gatingTexto}>
                    Genera el trayecto óptimo para habilitar los cobros del día.
                  </Text>
                </View>
                <Button
                  testID="generar-trayecto"
                  variant="primary"
                  size="lg"
                  iconLeft="alt-route"
                  fullWidth
                  loading={generandoTrayecto}
                  onPress={generarTrayecto}
                >
                  Generar trayecto
                </Button>
              </View>
            ) : !trayectoria.activa ? (
              <View style={styles.gating}>
                <View style={styles.avisoFila}>
                  <Icono name="info-outline" size={18} color={c.statusWarningFg} />
                  <Text style={styles.gatingTexto}>
                    Activa el GPS para habilitar la lista de cobros.
                  </Text>
                </View>
              </View>
            ) : null}
            {trayectos ? (
              <Button
                testID="ver-trayectos"
                variant="secondary"
                size="lg"
                iconLeft="alt-route"
                fullWidth
                onPress={() => {
                  if (clientes && trayectos) {
                    abrirTrayectosOverlay({ clientes, trayectos });
                  }
                }}
              >
                Ver trayectos
              </Button>
            ) : null}
            <Button
              testID="btn-cliente-cercano"
              variant="secondary"
              size="lg"
              iconLeft="near-me"
              fullWidth
              onPress={() => void irAlClienteCercano()}
            >
              Cliente cercano
            </Button>
            {mensajeCercano ? (
              <Text testID="cliente-cercano-mensaje" style={styles.mensajeTrayectoria}>
                {mensajeCercano}
              </Text>
            ) : null}
            {liquidacionVisible ? (
              <Button
                testID="btn-liquidacion"
                variant="secondary"
                size="lg"
                iconLeft="receipt-long"
                fullWidth
                disabled={!puedeLiquidarHoy}
                onPress={() => void abrirLiquidacion()}
              >
                Liquidación del día
              </Button>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.vacioCaja}>
            <Icono name="event-available" size={28} color={c.textMuted} />
            <Text style={styles.vacio}>Sin clientes para hoy.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const coords = coordenadaDeCliente(trayectos, item.clienteId);
          return (
            <Pressable
              testID={`cliente-${item.clienteId}`}
              accessibilityRole="button"
              accessibilityLabel={item.nombre}
              accessibilityHint="Abre la ficha del cliente"
              accessibilityState={{ disabled: !listaHabilitada }}
              android_ripple={{ color: kit.ripple.superficie }}
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
                  { backgroundColor: colorDeEstado(item.color, kit.tema) },
                ]}
              />
              <View style={styles.tarjetaInfo}>
                <Text style={styles.clienteNombre}>{item.nombre}</Text>
                {item.diasMora > 0 ? (
                  <Badge
                    testID={`mora-${item.clienteId}`}
                    tone="danger"
                    icon="warning"
                    label={`${item.diasMora} ${item.diasMora === 1 ? "día" : "días"} de mora`}
                  />
                ) : null}
                {item.compromisoValor != null ? (
                  <Badge
                    testID={`compromiso-${item.clienteId}`}
                    tone="warning"
                    icon="event"
                    label={`Compromiso de pago hoy: $${item.compromisoValor}`}
                  />
                ) : null}
                {item.enTrayecto ? <Badge tone="info" icon="route" label="En trayecto" /> : null}
                {coords ? (
                  <Button
                    testID={`llegar-${item.clienteId}`}
                    variant="link"
                    size="sm"
                    iconLeft="directions"
                    style={styles.llegar}
                    onPress={() => abrirNavegacion(coords.latitud, coords.longitud, "maps")}
                  >
                    Cómo llegar
                  </Button>
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
        <SafeAreaView style={styles.liquidacionContenedor} edges={["top", "left", "right", "bottom"]}>
          <View style={styles.liquidacionHeader}>
            <Text accessibilityRole="header" style={styles.liquidacionTitulo}>Liquidación del día</Text>
            <Pressable
              testID="cerrar-liquidacion"
              accessibilityRole="button"
              accessibilityLabel="Cerrar liquidación"
              android_ripple={{ color: kit.ripple.relleno, borderless: true, radius: shDensity.controlLg / 2 }}
              style={styles.liquidacionCerrar}
              onPress={cerrarLiquidacion}
            >
              <Icono name="close" size={24} color={kit.banda.texto} />
            </Pressable>
          </View>

          {liquidacionCargando ? (
            <ActivityIndicator style={styles.liquidacionCarga} color={c.link} />
          ) : (
            <ScrollView contentContainerStyle={styles.liquidacionScroll}>
              {!puedeLiquidarHoy ? (
                <View style={styles.avisoFila}>
                  <Icono name="info-outline" size={18} color={c.statusWarningFg} />
                  <Text style={styles.liquidacionAviso}>
                    Registra la visita de todos los clientes del día para habilitar la liquidación.
                  </Text>
                </View>
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
                    <Text testID="liquidacion-conteos" style={styles.liquidacionLinea}>
                      Pagaron: {liquidacion.pagaron} · Faltan: {liquidacion.faltan} de{" "}
                      {liquidacion.totalDia}
                    </Text>
                    <Text style={styles.liquidacionLinea}>
                      Clientes sin cuentas: {liquidacion.sinCuentas}
                    </Text>
                    {liquidacion.horaPrimera ? (
                      <Text style={styles.liquidacionLinea}>
                        Primera cuota: {liquidacion.horaPrimera} · Última:{" "}
                        {liquidacion.horaUltima ?? "—"}
                      </Text>
                    ) : null}
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

                  <Button
                    testID="descargar-pdf"
                    variant="secondary"
                    size="lg"
                    iconLeft="picture-as-pdf"
                    fullWidth
                    loading={descargandoPdf}
                    disabled={!offline.isOnline}
                    onPress={() => void descargarPdf()}
                  >
                    Descargar PDF
                  </Button>
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
                <Button
                  testID="generar-liquidacion"
                  variant="primary"
                  size="lg"
                  iconLeft="receipt-long"
                  fullWidth
                  loading={generandoLiquidacion}
                  disabled={!puedeLiquidarHoy}
                  onPress={() => void generarLiquidacion()}
                >
                  Generar liquidación
                </Button>
              ) : null}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function crearEstilos({ c, banda }: KitTema) {
  return StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: c.bg },
  lista: { padding: shSpace[4], gap: shSpace[3] },
  vacioCaja: { alignItems: "center", gap: shSpace[2], marginTop: shSpace[6] },
  vacio: { ...shType.body, color: c.textMuted, textAlign: "center" },
  acciones: { marginBottom: shSpace[2], gap: 10 },
  avisoFila: { flexDirection: "row", alignItems: "center", gap: shSpace[2] },
  avisoOffline: { ...shType.label, flex: 1, color: c.statusWarningFg },
  liquidacionContenedor: { flex: 1, backgroundColor: c.bg },
  liquidacionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: shSpace[4],
    paddingRight: shSpace[2],
    paddingVertical: shSpace[1],
    backgroundColor: banda.fondo,
  },
  liquidacionTitulo: { ...shType.block, color: banda.texto },
  liquidacionCerrar: {
    width: shDensity.controlLg,
    height: shDensity.controlLg,
    borderRadius: shRadius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: banda.relleno,
  },
  liquidacionCarga: { marginTop: 40 },
  liquidacionScroll: { padding: shSpace[4], gap: 10 },
  liquidacionAviso: { ...shType.label, flex: 1, color: c.statusWarningFg },
  liquidacionResumen: {
    backgroundColor: c.surface,
    borderRadius: shRadius.md,
    padding: shSpace[3],
    gap: shSpace[1],
    borderWidth: 1,
    borderColor: c.border,
  },
  liquidacionLinea: { ...shType.dense, color: c.text, fontVariant: ["tabular-nums"] },
  liquidacionSubtitulo: { ...shType.label, fontFamily: shType.block.fontFamily, color: c.textMuted, marginTop: shSpace[1] },
  liquidacionVacio: { ...shType.dense, color: c.textMuted },
  liquidacionItem: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: shRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: shSpace[2],
    backgroundColor: c.surface,
  },
  liquidacionItemTexto: { ...shType.dense, color: c.text, fontVariant: ["tabular-nums"] },
  liquidacionMensaje: { ...shType.dense, color: c.statusDangerFg },
  liquidacionMensajeOk: { ...shType.dense, color: c.statusSuccessFg },
  trayectoriaActiva: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[2],
    backgroundColor: c.statusDangerBg,
    borderWidth: 1,
    borderColor: c.statusDangerBorder,
    borderRadius: shRadius.sm,
    padding: 10,
  },
  puntoRojo: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: c.statusDangerFg,
  },
  trayectoriaTexto: { ...shType.label, color: c.text, flex: 1 },
  mensajeTrayectoria: { ...shType.dense, color: c.textMuted },
  gating: {
    backgroundColor: c.statusWarningBg,
    borderWidth: 1,
    borderColor: c.statusWarningBorder,
    borderRadius: shRadius.sm,
    paddingHorizontal: shSpace[3],
    paddingVertical: 10,
    gap: shSpace[2],
  },
  gatingTexto: { ...shType.label, flex: 1, color: c.text },
  tarjetaBloqueada: { opacity: 0.5 },
  tarjeta: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderSoft,
    borderRadius: shRadius.md,
    borderCurve: "continuous",
    overflow: "hidden",
    boxShadow: c.elev1,
  },
  acento: { width: 4 },
  tarjetaInfo: { flex: 1, padding: 14, gap: 6 },
  clienteNombre: { ...shType.block, color: c.text },
  llegar: { marginLeft: -shSpace[2] },
  gastoMensaje: { ...shType.dense, color: c.statusSuccessFg },
  gastoMensajeError: { color: c.statusDangerFg },
});
}
