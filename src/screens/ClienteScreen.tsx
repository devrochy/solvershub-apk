import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialIcons } from "@expo/vector-icons";
import { captureRef } from "react-native-view-shot";
import { shareAsync } from "expo-sharing";
import { apiErrorStatus, esErrorDeRed } from "../api/client";
import { Avatar } from "../components/Avatar";
import { CargaError } from "../components/CargaError";
import { ColorBadge } from "../components/ColorBadge";
import { MapaCliente } from "../components/MapaCliente";
import { MapaPin } from "../components/MapaPin";
import { ModalConFooter } from "../components/ModalConFooter";
import { METODOS_PAGO, MOTIVOS_NO_PAGO } from "../domain/catalogos";
import {
  cambioClientePayload,
  camposCambiados,
  dedupeKeyCambioCliente,
  edicionDesdeTarjeta,
  type CambioClienteInput,
} from "../features/cliente/cambio-cliente";
import {
  useEvidenciasCliente,
  type FuenteEvidencia,
} from "../features/cliente/use-evidencias-cliente";
import { abrirNavegacion } from "../features/navegacion/navegacion";
import {
  enlaceWhatsApp,
  textoReportePrestamo,
} from "../features/estado-cuenta/estado-cuenta";
import { validarPrestamo } from "../features/prestamo/registrar-prestamo";
import { clasificarCuotas, TipoCuotaCanvas } from "../features/prestamo/canvas-cuotas";
import { validarFechaPrometida, validarMonto } from "../features/visita/validaciones";
import type { RootStackParamList } from "../navigation/types";
import { useOffline } from "../offline/offline-context";
import { guardarCliente, leerCliente } from "../offline/cache";
import { useSession } from "../session/session-context";
import { useRutaActiva } from "../session/ruta-activa-context";
import type {
  ClienteTarjetaPublic,
  CuotaPublic,
  DetalleCuotaPublic,
  EstadoCuentaPrestamoPublic,
  PrestamoPublic,
} from "../types/cobrador";

type Props = NativeStackScreenProps<RootStackParamList, "Cliente">;

export interface ClienteScreenDirectProps {
  rutaId: number;
  clienteId: number;
  nombre: string;
  latitud?: number;
  longitud?: number;
  prestamoAutoSeleccionado?: boolean;
  onCerrar?(): void;
}

type ModalActivo =
  | "ninguno"
  | "editar"
  | "prestamo"
  | "pago"
  | "no_pago"
  | "avatar"
  | "cuota"
  | "documento";

const COORD_DEFAULT = { lat: -17.78, lng: -63.18 };

const COLORES_CANVAS: Record<TipoCuotaCanvas, { fondo: string; borde: string }> = {
  pagada: { fondo: "#dcfce7", borde: "#16a34a" },
  actual: { fondo: "#dbeafe", borde: "#2563eb" },
  en_mora: { fondo: "#fee2e2", borde: "#dc2626" },
  futura: { fondo: "#f1f5f9", borde: "#cbd5e1" },
  abonada: { fondo: "#fef9c3", borde: "#d97706" },
};

const ETIQUETA_CANVAS: Record<TipoCuotaCanvas, string> = {
  pagada: "Pagada",
  actual: "Cuota actual",
  en_mora: "En mora",
  futura: "Futura",
  abonada: "Abonada",
};

function esPendienteOArrasada(cuota: CuotaPublic): boolean {
  return cuota.estatus === "pendiente" || cuota.estatus === "atrasada";
}

const COLOR_RIESGO_HEADER: Record<string, string> = {
  verde: "#16a34a",
  rojo: "#dc2626",
  azul: "#2563eb",
  blanco: "#64748b",
};

function colorDeRiesgo(color: string): string {
  return COLOR_RIESGO_HEADER[color] ?? "#2563eb";
}

function coordenadaDeTexto(valor: string): number | undefined {
  if (!valor.trim()) {
    return undefined;
  }
  const n = Number(valor);
  return Number.isFinite(n) ? n : undefined;
}

export function ClienteScreen(props: Props | ClienteScreenDirectProps) {
  const params =
    "route" in props ? props.route.params : (props as ClienteScreenDirectProps);
  const { rutaId, clienteId, latitud, longitud, prestamoAutoSeleccionado } = params;
  const onCerrar = "onCerrar" in props ? props.onCerrar : undefined;
  const { api, logout } = useSession();
  const offline = useOffline();
  const { rutaActiva } = useRutaActiva();

  const [tarjeta, setTarjeta] = useState<ClienteTarjetaPublic | null>(null);
  const [prestamos, setPrestamos] = useState<PrestamoPublic[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Modales (máquina de estados: solo uno activo a la vez).
  const [modal, setModal] = useState<ModalActivo>("ninguno");
  const [modalDocumento, setModalDocumento] = useState<"frente" | "reverso">("frente");

  // Acordeón de préstamos.
  const [prestamoSeleccionadoId, setPrestamoSeleccionadoId] = useState<number | null>(null);
  const [estadoPrestamo, setEstadoPrestamo] = useState<EstadoCuentaPrestamoPublic | null>(null);
  const [estadoPrestamoCargando, setEstadoPrestamoCargando] = useState(false);

  // Detalle de cuota.
  const [detalleCuota, setDetalleCuota] = useState<DetalleCuotaPublic | null>(null);
  const [detalleCuotaCargando, setDetalleCuotaCargando] = useState(false);

  // Formulario pago/no_pago.
  const [valor, setValor] = useState("");
  const [metodoPago, setMetodoPago] = useState<(typeof METODOS_PAGO)[number]>("efectivo");
  const [motivoNoPago, setMotivoNoPago] = useState<(typeof MOTIVOS_NO_PAGO)[number]>("no_esta");
  const [tipoPago, setTipoPago] = useState<"cuota" | "abono">("cuota");
  const [fechaPrometida, setFechaPrometida] = useState("");
  const [valorPrometido, setValorPrometido] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  // Formulario editar cliente.
  const [edicion, setEdicion] = useState<CambioClienteInput>({});
  const [edicionOriginal, setEdicionOriginal] = useState<CambioClienteInput>({});
  const [editando, setEditando] = useState(false);

  // Formulario nuevo préstamo.
  const [prestamoValor, setPrestamoValor] = useState("");
  const [prestamoCuotas, setPrestamoCuotas] = useState("");
  const [prestamoDias, setPrestamoDias] = useState("");
  const [prestamoInteres, setPrestamoInteres] = useState("");
  const [prestamoEnviando, setPrestamoEnviando] = useState(false);
  const [prestamoMensaje, setPrestamoMensaje] = useState<string | null>(null);

  // Evidencias (avatar + documento).
  const evidenciasCliente = useEvidenciasCliente();
  const [evidenciasEnviando, setEvidenciasEnviando] = useState(false);

  // Mapa "Cómo llegar".
  const [mapaAbierto, setMapaAbierto] = useState(false);

  // WhatsApp con screenshot.
  const [compartiendo, setCompartiendo] = useState(false);
  const refCanvas = useRef<View | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const [t, p] = await Promise.all([
        api.tarjeta(rutaId, clienteId),
        api.listarPrestamosDeCliente(rutaId, clienteId),
      ]);
      setTarjeta(t);
      setPrestamos(p);
      if (prestamoAutoSeleccionado) {
        setPrestamoSeleccionadoId((actual) => {
          if (actual != null) {
            return actual;
          }
          const vigente = p.find((x) => x.estatus === "vigente") ?? p[0];
          return vigente?.id ?? null;
        });
      }
      await guardarCliente(rutaId, clienteId, { tarjeta: t, prestamos: p });
    } catch (err) {
      if (apiErrorStatus(err) === 401) {
        await logout();
      } else if (esErrorDeRed(err)) {
        const cache = await leerCliente(rutaId, clienteId);
        if (cache) {
          setTarjeta(cache.tarjeta);
          setPrestamos(cache.prestamos);
          if (prestamoAutoSeleccionado) {
            setPrestamoSeleccionadoId((actual) => {
              if (actual != null) {
                return actual;
              }
              const vigente =
                cache.prestamos.find((x) => x.estatus === "vigente") ??
                cache.prestamos[0];
              return vigente?.id ?? null;
            });
          }
        } else {
          setError("No se pudo cargar el cliente.");
        }
      } else {
        setError("No se pudo cargar el cliente.");
      }
    }
  }, [api, rutaId, clienteId, logout, prestamoAutoSeleccionado]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount (async; no setState síncrono)
    cargar();
  }, [cargar]);

  const prestamoSeleccionado = useMemo(
    () => prestamos.find((p) => p.id === prestamoSeleccionadoId) ?? null,
    [prestamos, prestamoSeleccionadoId],
  );

  const cuotaPorPagar = useMemo(
    () => prestamoSeleccionado?.cuotas.find(esPendienteOArrasada),
    [prestamoSeleccionado],
  );

  // Carga el estado de cuenta del préstamo seleccionado (canvas con abonos/saldo).
  const prestamoDetalleId = prestamoSeleccionado?.id ?? null;
  useEffect(() => {
    if (prestamoDetalleId == null) {
      return;
    }
    let activo = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- inicio de carga del detalle
    setEstadoPrestamoCargando(true);
    api
      .obtenerEstadoCuentaPrestamo(rutaId, prestamoDetalleId)
      .then((estado) => {
        if (activo) {
          setEstadoPrestamo(estado);
        }
      })
      .catch((err) => {
        if (apiErrorStatus(err) === 401) {
          void logout();
        } else if (activo) {
          setEstadoPrestamo(null);
        }
      })
      .finally(() => {
        if (activo) {
          setEstadoPrestamoCargando(false);
        }
      });
    return () => {
      activo = false;
    };
  }, [api, rutaId, logout, prestamoDetalleId]);

  const proximoCobro = useMemo(() => {
    const activos = prestamos.filter((p) => p.estatus === "vigente");
    let total = 0;
    let cuentasPendientes = 0;
    for (const p of activos) {
      const cuota = p.cuotas.find(esPendienteOArrasada);
      if (cuota) {
        total += cuota.valorEsperado;
        cuentasPendientes += 1;
      }
    }
    return { total, cuentasPendientes };
  }, [prestamos]);

  function onPrestamoPress(id: number) {
    if (prestamoSeleccionadoId === id) {
      setPrestamoSeleccionadoId(null);
      return;
    }
    setEstadoPrestamo(null);
    setEstadoPrestamoCargando(true);
    setPrestamoSeleccionadoId(id);
  }

  async function enviarVisita() {
    if (!prestamoSeleccionado) {
      setMensaje("Selecciona un préstamo.");
      return;
    }
    if (modal === "pago") {
      if (tipoPago === "cuota" && !cuotaPorPagar) {
        setMensaje("Sin cuotas pendientes para este préstamo.");
        return;
      }
      const monto = Number(valor);
      const errorMonto = validarMonto(monto);
      if (errorMonto) {
        setMensaje(errorMonto);
        return;
      }
      setEnviando(true);
      setMensaje(null);
      const input = {
        prestamoId: prestamoSeleccionado.id,
        clienteId,
        resultado: "pago" as const,
        tipoPago,
        cuotaId: tipoPago === "cuota" ? cuotaPorPagar?.id : undefined,
        valor: monto,
        metodoPago,
      };
      try {
        await api.registrarVisitaPago(rutaId, input);
        setModal("ninguno");
        setValor("");
        setMensaje("Pago registrado.");
        await cargar();
      } catch (err) {
        if (esErrorDeRed(err)) {
          const encolado = await offline.encolarSiNoExiste(
            "visita",
            input,
            `pago-${input.prestamoId}-${input.clienteId}-${input.cuotaId ?? "abono"}`,
          );
          if (encolado) {
            setModal("ninguno");
            setValor("");
            setMensaje("Guardado sin conexión (se sincronizará).");
          } else {
            setMensaje(
              "Ya hay un pago pendiente por sincronizar para este préstamo.",
            );
          }
        } else {
          setMensaje("No se pudo registrar el pago.");
        }
      } finally {
        setEnviando(false);
      }
    } else {
      const esCompromiso = motivoNoPago === "compromiso_de_pago";
      const errorFecha = validarFechaPrometida(fechaPrometida);
      if (errorFecha) {
        setMensaje(errorFecha);
        return;
      }
      if (esCompromiso && !fechaPrometida.trim()) {
        setMensaje("Para compromiso de pago se requiere la fecha prometida.");
        return;
      }
      const montoPrometido = valorPrometido.trim() ? Number(valorPrometido) : null;
      if (montoPrometido !== null) {
        const errorMonto = validarMonto(montoPrometido);
        if (errorMonto) {
          setMensaje(errorMonto);
          return;
        }
      }
      setEnviando(true);
      setMensaje(null);
      const input = {
        prestamoId: prestamoSeleccionado.id,
        clienteId,
        resultado: "no_pago" as const,
        motivoNoPago,
        fechaPrometida: fechaPrometida.trim() || undefined,
        valorPrometido: montoPrometido ?? undefined,
      };
      try {
        await api.registrarVisitaNoPago(rutaId, input);
        setModal("ninguno");
        setFechaPrometida("");
        setValorPrometido("");
        setMensaje("Visita registrada.");
      } catch (err) {
        if (esErrorDeRed(err)) {
          const encolado = await offline.encolarSiNoExiste(
            "visita",
            input,
            `no_pago-${input.prestamoId}-${input.clienteId}`,
          );
          if (encolado) {
            setModal("ninguno");
            setFechaPrometida("");
            setValorPrometido("");
            setMensaje("Guardado sin conexión (se sincronizará).");
          } else {
            setMensaje(
              "Ya hay una visita de no pago pendiente por sincronizar para este préstamo.",
            );
          }
        } else {
          setMensaje("No se pudo registrar la visita.");
        }
      } finally {
        setEnviando(false);
      }
    }
  }

  function abrirPago() {
    setMensaje(null);
    setTipoPago("cuota");
    setMetodoPago("efectivo");
    setValor(cuotaPorPagar ? String(cuotaPorPagar.valorEsperado) : "");
    setModal("pago");
  }

  function abrirNoPago() {
    setMensaje(null);
    setMotivoNoPago("no_esta");
    setFechaPrometida("");
    setValorPrometido("");
    setModal("no_pago");
  }

  function abrirEditar() {
    setMensaje(null);
    const actual: CambioClienteInput = {
      ...edicionDesdeTarjeta(tarjeta as ClienteTarjetaPublic),
      latitud: typeof latitud === "number" ? latitud : undefined,
      longitud: typeof longitud === "number" ? longitud : undefined,
    };
    setEdicion(actual);
    setEdicionOriginal(actual);
    setModal("editar");
  }

  async function guardarCambioCliente() {
    const input = camposCambiados(edicion, edicionOriginal);
    if (Object.keys(input).length === 0) {
      setMensaje("No hay cambios para guardar.");
      return;
    }
    setEditando(true);
    setMensaje(null);
    try {
      const encolado = await offline.encolarSiNoExiste(
        "cambio_cliente",
        cambioClientePayload(clienteId, input),
        dedupeKeyCambioCliente(clienteId),
      );
      if (encolado) {
        setEdicionOriginal({ ...input });
        // A4: reflejar el cambio en la tarjeta local para que cabecera y
        // WhatsApp usen los datos nuevos (antes quedaba stale).
        setTarjeta((actual) => {
          if (!actual) {
            return actual;
          }
          const [nombreViejo = "", ...apellidosViejos] = actual.nombre.split(" ");
          const nombreNuevo =
            input.nombre !== undefined ? input.nombre : nombreViejo;
          const apellidoNuevo =
            input.apellido !== undefined
              ? input.apellido
              : apellidosViejos.join(" ");
          return {
            ...actual,
            nombre: `${nombreNuevo} ${apellidoNuevo}`.trim(),
            negocio: input.negocio !== undefined ? input.negocio : actual.negocio,
            telefonoWhatsapp:
              input.telefonoWhatsapp !== undefined
                ? input.telefonoWhatsapp
                : actual.telefonoWhatsapp,
          };
        });
        setModal("ninguno");
        setMensaje("Cambio enviado (se sincronizará).");
      } else {
        setMensaje("Ya hay un cambio pendiente por sincronizar.");
      }
    } finally {
      setEditando(false);
    }
  }

  function abrirNuevoPrestamo() {
    setMensaje(null);
    setPrestamoMensaje(null);
    setPrestamoInteres(rutaActiva ? String(rutaActiva.tipoInteres) : "");
    setPrestamoCuotas(rutaActiva ? String(rutaActiva.numCuotas) : "");
    const cupo = rutaActiva?.config.cupoDefault;
    setPrestamoValor(cupo ? String(cupo) : "");
    setPrestamoDias("");
    setModal("prestamo");
  }

  async function guardarPrestamo() {
    const error = validarPrestamo({
      valor: prestamoValor,
      numCuotas: prestamoCuotas,
      diasEntreCuotas: prestamoDias,
      tipoInteres: prestamoInteres,
    });
    if (error) {
      setPrestamoMensaje(error);
      return;
    }
    setPrestamoEnviando(true);
    setPrestamoMensaje(null);
    try {
      await api.crearPrestamo(rutaId, {
        clienteId,
        valor: Number(prestamoValor),
        numCuotas: Number(prestamoCuotas),
        diasEntreCuotas: Number(prestamoDias),
        ...(prestamoInteres.trim()
          ? { tipoInteres: Number(prestamoInteres) }
          : {}),
      });
      setModal("ninguno");
      setPrestamoValor("");
      setPrestamoCuotas("");
      setPrestamoDias("");
      setPrestamoInteres("");
      setPrestamoMensaje("Préstamo registrado.");
      await cargar();
    } catch (err) {
      if (esErrorDeRed(err)) {
        setPrestamoMensaje("Sin conexión. El préstamo no se guardó; revisa tu conexión e inténtalo de nuevo.");
      } else {
        setPrestamoMensaje("No se pudo registrar el préstamo.");
      }
    } finally {
      setPrestamoEnviando(false);
    }
  }

  async function abrirDetalleCuota(cuotaId: number) {
    if (!prestamoSeleccionado) {
      return;
    }
    setDetalleCuota(null);
    setDetalleCuotaCargando(true);
    setModal("cuota");
    try {
      setDetalleCuota(
        await api.detalleCuota(rutaId, prestamoSeleccionado.id, cuotaId),
      );
    } catch {
      setDetalleCuota(null);
    } finally {
      setDetalleCuotaCargando(false);
    }
  }

  async function elegirEvidencia(
    campo: "foto_facial" | "documento_frente" | "documento_reverso",
    fuente: FuenteEvidencia,
  ) {
    // Solo selecciona y previsualiza; la subida ocurre al tocar "Guardar".
    setMensaje(null);
    await evidenciasCliente.agregar(campo, fuente);
  }

  function evidenciasSeleccionadasPara(
    campo: "foto_facial" | "documento_frente" | "documento_reverso",
  ) {
    return evidenciasCliente.evidencias.filter((e) => e.campo === campo);
  }

  async function guardarEvidenciaSeleccionada(
    campo: "foto_facial" | "documento_frente" | "documento_reverso",
  ) {
    const pendiente = evidenciasSeleccionadasPara(campo)[0];
    if (!pendiente) {
      setMensaje("Selecciona una imagen primero.");
      return;
    }
    setEvidenciasEnviando(true);
    setMensaje(null);
    try {
      await api.agregarEvidenciasCliente(rutaId, clienteId, [pendiente]);
      evidenciasCliente.quitar(campo);
      setModal("ninguno");
      setMensaje(
        campo === "foto_facial"
          ? "Foto actualizada."
          : "Documento actualizado.",
      );
      await cargar();
    } catch (err) {
      if (apiErrorStatus(err) === 401) {
        await logout();
      } else {
        setMensaje("No se pudo guardar la evidencia.");
      }
    } finally {
      setEvidenciasEnviando(false);
    }
  }

  async function compartirDetalle() {
    if (!prestamoSeleccionado || !tarjeta) {
      return;
    }
    setCompartiendo(true);
    try {
      const uri = await captureRef(refCanvas, { format: "png", quality: 0.8 });
      await shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: "Estado de cuenta del préstamo",
      });
    } catch {
      // Fallback: si no se puede capturar/compartir, envía el reporte de texto.
      const texto = textoReportePrestamo(prestamoSeleccionado, tarjeta);
      await Linking.openURL(enlaceWhatsApp(tarjeta.telefonoWhatsapp, texto));
    } finally {
      setCompartiendo(false);
    }
  }

  if (!tarjeta) {
    return <CargaError cargando={!error} error={error} onReintentar={cargar} />;
  }

  const tieneCoordenadas =
    typeof latitud === "number" && typeof longitud === "number";
  const prestamosVisibles =
    prestamoSeleccionadoId == null
      ? prestamos
      : prestamos.filter((p) => p.id === prestamoSeleccionadoId);
  const cuotasCanvas = estadoPrestamo ? clasificarCuotas(estadoPrestamo.cuotas) : [];
  const docFrenteUrl = tarjeta.documentoFrenteUrl ?? null;
  const docReversoUrl = tarjeta.documentoReversoUrl ?? null;
  const latNegocio = edicion.latitud ?? COORD_DEFAULT.lat;
  const lngNegocio = edicion.longitud ?? COORD_DEFAULT.lng;
  const latDomicilio = edicion.latitudDomicilio ?? COORD_DEFAULT.lat;
  const lngDomicilio = edicion.longitudDomicilio ?? COORD_DEFAULT.lng;

  return (
    <>
      <SafeAreaView style={styles.contenedor} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header: título "Información del cliente" a la izquierda + Editar a la derecha */}
        <View
          testID="header-cliente"
          style={[styles.header, { backgroundColor: colorDeRiesgo(tarjeta.color) }]}
        >
          {onCerrar ? (
            <Pressable testID="btn-back-cliente" style={styles.headerAccionIzq} onPress={onCerrar}>
              <MaterialIcons name="arrow-back" size={22} color="#ffffff" />
            </Pressable>
          ) : (
            <View style={styles.headerAccionIzq} />
          )}
          <Text style={styles.headerTitulo}>Información del cliente</Text>
          <Pressable testID="btn-editar-cliente" style={styles.headerAccionDerecha} onPress={abrirEditar}>
            <MaterialIcons name="edit" size={18} color="#ffffff" />
            <Text style={styles.headerAccionTexto}>Editar</Text>
          </Pressable>
        </View>

        {mensaje && modal === "ninguno" ? (
          <View testID="banner-mensaje" style={styles.banner}>
            <Text style={styles.bannerTexto}>{mensaje}</Text>
          </View>
        ) : null}

        {/* Tarjeta principal del cliente */}
        <View style={styles.tarjeta}>
          <View style={styles.filaSuperior}>
            <Pressable testID="btn-avatar" onPress={() => setModal("avatar")}>
              <Avatar nombre={tarjeta.nombre} fotoUrl={tarjeta.fotoUrl} size={64} />
            </Pressable>

            {/* Tarjeta de documento: frontal y reverso */}
            <View style={styles.documento}>
              <View style={styles.documentoFilaTitulo}>
                <Text style={styles.documentoTitulo}>Documento</Text>
                <ColorBadge color={tarjeta.color} />
              </View>
              <View style={styles.documentoMiniaturas}>
                <Pressable
                  testID="doc-frente"
                  style={styles.miniatura}
                  onPress={() => {
                    setModalDocumento("frente");
                    setModal("documento");
                  }}
                >
                  {docFrenteUrl ? (
                    <Image
                      source={{ uri: docFrenteUrl }}
                      style={styles.miniaturaImagen}
                    />
                  ) : (
                    <View style={styles.miniaturaPlaceholder}>
                      <MaterialIcons name="badge" size={22} color="#94a3b8" />
                    </View>
                  )}
                  <View
                    testID="doc-frente-badge"
                    style={[
                      styles.badgeDoc,
                      docFrenteUrl ? styles.badgeVerificado : styles.badgePendiente,
                    ]}
                  >
                    {docFrenteUrl ? (
                      <MaterialIcons name="check" size={11} color="#16a34a" />
                    ) : null}
                    <Text
                      style={[
                        docFrenteUrl ? styles.badgeVerificadoTexto : styles.badgePendienteTexto,
                      ]}
                    >
                      {docFrenteUrl ? "Verificado" : "Pendiente"}
                    </Text>
                  </View>
                  <Text style={styles.miniaturaEtiqueta}>Frente</Text>
                </Pressable>
                <Pressable
                  testID="doc-reverso"
                  style={styles.miniatura}
                  onPress={() => {
                    setModalDocumento("reverso");
                    setModal("documento");
                  }}
                >
                  {docReversoUrl ? (
                    <Image
                      source={{ uri: docReversoUrl }}
                      style={styles.miniaturaImagen}
                    />
                  ) : (
                    <View style={styles.miniaturaPlaceholder}>
                      <MaterialIcons name="badge" size={22} color="#94a3b8" />
                    </View>
                  )}
                  <View
                    testID="doc-reverso-badge"
                    style={[
                      styles.badgeDoc,
                      docReversoUrl ? styles.badgeVerificado : styles.badgePendiente,
                    ]}
                  >
                    {docReversoUrl ? (
                      <MaterialIcons name="check" size={11} color="#16a34a" />
                    ) : null}
                    <Text
                      style={[
                        docReversoUrl ? styles.badgeVerificadoTexto : styles.badgePendienteTexto,
                      ]}
                    >
                      {docReversoUrl ? "Verificado" : "Pendiente"}
                    </Text>
                  </View>
                  <Text style={styles.miniaturaEtiqueta}>Reverso</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <Text style={styles.nombre}>{tarjeta.nombre}</Text>
          {tarjeta.negocio ? (
            <Text style={styles.detalle}>Negocio: {tarjeta.negocio}</Text>
          ) : null}
          <Text style={styles.detalle}>WhatsApp: {tarjeta.telefonoWhatsapp}</Text>
          {tarjeta.tipoPago ? (
            <Text style={styles.detalle}>Tipo de pago: {tarjeta.tipoPago}</Text>
          ) : null}
          <Text style={styles.detalle}>
            Saldo pendiente: {tarjeta.saldoPendiente} | Mora: {tarjeta.diasMora} días
          </Text>

          {tieneCoordenadas ? (
            <View style={styles.footerTarjeta}>
              <Pressable
                testID="btn-como-llegar"
                style={[styles.comoLlegar, mapaAbierto && styles.comoLlegarActivo]}
                onPress={() => setMapaAbierto((abierto) => !abierto)}
              >
                <MaterialIcons name="directions" size={16} color="#0891b2" />
                <Text style={styles.comoLlegarTexto}>Cómo llegar</Text>
                <MaterialIcons
                  name={mapaAbierto ? "expand-less" : "expand-more"}
                  size={18}
                  color="#0891b2"
                />
              </Pressable>
              <Pressable
                testID="btn-editar-ubicacion"
                style={styles.editarUbicacion}
                onPress={abrirEditar}
              >
                <MaterialIcons name="edit-location" size={16} color="#2563eb" />
                <Text style={styles.editarUbicacionTexto}>Editar ubicación</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {mapaAbierto && tieneCoordenadas ? (
          <View style={styles.seccionMapa}>
            <MapaCliente latitud={latitud} longitud={longitud} nombre={tarjeta.nombre} />
            <View style={styles.navegacion}>
              <Pressable
                testID="navegar-maps"
                style={[styles.botonNavegar]}
                onPress={() => abrirNavegacion(latitud, longitud, "maps")}
              >
                <MaterialIcons name="map" size={16} color="#ffffff" />
                <Text style={styles.botonNavegarTexto}>Google Maps</Text>
              </Pressable>
              <Pressable
                testID="navegar-waze"
                style={[styles.botonNavegar, styles.botonWaze]}
                onPress={() => abrirNavegacion(latitud, longitud, "waze")}
              >
                <MaterialIcons name="navigation" size={16} color="#ffffff" />
                <Text style={styles.botonNavegarTexto}>Waze</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Notificación de próximo cobro */}
        {proximoCobro.total > 0 ? (
          <View testID="notif-proximo-cobro" style={styles.notificacion}>
            <MaterialIcons name="notifications-active" size={20} color="#2563eb" />
            <View style={styles.notificacionContenido}>
              <Text style={styles.notificacionTitulo}>Próximo cobro</Text>
              <Text style={styles.notificacionDetalle}>
                ${proximoCobro.total} · {proximoCobro.cuentasPendientes}{" "}
                {proximoCobro.cuentasPendientes === 1 ? "préstamo" : "préstamos"} con
                cuota por cobrar
              </Text>
            </View>
          </View>
        ) : null}

        {/* Sección de préstamos (acordeón) */}
        <View style={styles.seccion}>
          <View style={styles.seccionHeader}>
            <Text style={styles.seccionTitulo}>Préstamos</Text>
            <Pressable
              testID="btn-nuevo-prestamo"
              style={styles.botonNuevo}
              onPress={abrirNuevoPrestamo}
            >
              <Text style={styles.botonNuevoTexto}>+ Nuevo</Text>
            </Pressable>
          </View>

          {prestamosVisibles.length === 0 ? (
            <Text style={styles.sinPrestamos}>Este cliente no tiene préstamos.</Text>
          ) : (
            prestamosVisibles.map((p) => {
              const seleccionado = p.id === prestamoSeleccionadoId;
              return (
                <Pressable
                  key={p.id}
                  testID={`prestamo-item-${p.id}`}
                  style={[styles.prestamoItem, seleccionado && styles.prestamoItemSeleccionado]}
                  onPress={() => onPrestamoPress(p.id)}
                >
                  <View style={styles.prestamoInfo}>
                    <Text style={styles.prestamoValor}>
                      {p.valor} · {p.numCuotas} cuotas
                    </Text>
                    <Text style={styles.prestamoDetalle}>
                      {p.tipoInteres}% interés · cada {p.diasEntreCuotas} días
                    </Text>
                    <Text style={styles.prestamoEstatus}>{p.estatus}</Text>
                  </View>
                  {seleccionado ? (
                    <View testID={`check-prestamo-${p.id}`}>
                      <MaterialIcons name="check-circle" size={22} color="#16a34a" />
                    </View>
                  ) : null}
                  <ColorBadge
                    color={
                      p.estatus === "vigente" || p.estatus === "liquidado"
                        ? "verde"
                        : "blanco"
                    }
                  />
                </Pressable>
              );
            })
          )}
        </View>

        {/* Detalle del préstamo seleccionado */}
        {prestamoSeleccionado ? (
          <View style={styles.detallePrestamo}>
            <Text style={styles.detalleTitulo}>Préstamo #{prestamoSeleccionado.id}</Text>
            {estadoPrestamoCargando ? (
              <ActivityIndicator style={styles.detalleCarga} />
            ) : estadoPrestamo ? (
              <View ref={refCanvas} collapsable={false} testID="canvas-prestamo">
                <Text style={styles.detalleLinea}>
                  Valor: {estadoPrestamo.valor} {estadoPrestamo.moneda} · Cuotas:{" "}
                  {estadoPrestamo.numCuotas} · Interés: {estadoPrestamo.tipoInteres}%
                </Text>
                <Text style={styles.detalleLinea}>
                  Abonos totales: {estadoPrestamo.totalAbonos} · Saldo:{" "}
                  {estadoPrestamo.saldoPendiente}
                </Text>

                <View style={styles.leyenda}>
                  {(
                    [
                      ["pagada", "Pagada"],
                      ["actual", "Cuota actual"],
                      ["en_mora", "En mora"],
                      ["futura", "Futura"],
                    ] as [TipoCuotaCanvas, string][]
                  ).map(([tipo, texto]) => (
                    <View key={tipo} style={styles.leyendaItem}>
                      <View
                        style={[styles.leyendaColor, { backgroundColor: COLORES_CANVAS[tipo].borde }]}
                      />
                      <Text style={styles.leyendaTexto}>{texto}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.canvas}>
                  {cuotasCanvas.map((cuota) => {
                    const color = COLORES_CANVAS[cuota.tipo];
                    return (
                      <Pressable
                        key={cuota.cuotaId}
                        testID={`cuota-${cuota.numeroCuota}`}
                        style={[
                          styles.cuadro,
                          { backgroundColor: color.fondo, borderColor: color.borde },
                        ]}
                        onPress={() => void abrirDetalleCuota(cuota.cuotaId)}
                      >
                        <Text style={styles.cuadroNumero}>{cuota.numeroCuota}</Text>
                        <Text style={styles.cuadroValor}>
                          {cuota.valorEsperado} {estadoPrestamo.moneda}
                        </Text>
                        <Text style={styles.cuadroFecha}>{cuota.fechaVencimiento}</Text>
                        {cuota.saldoPendiente > 0 && cuota.saldoPendiente < cuota.valorEsperado ? (
                          <Text style={styles.cuadroSaldo}>
                            Falta: {cuota.saldoPendiente}
                          </Text>
                        ) : null}
                        {cuota.abonosAcumulados > 0 ? (
                          <Text style={styles.cuadroAbono}>
                            Abonado: {cuota.abonosAcumulados}
                          </Text>
                        ) : null}
                        <View style={[styles.cuadroEtiqueta, { borderColor: color.borde }]}>
                          <Text style={[styles.cuadroEtiquetaTexto, { color: color.borde }]}>
                            {ETIQUETA_CANVAS[cuota.tipo]}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : (
              <Text style={styles.detalleError}>
                No se pudo cargar el detalle del préstamo.
              </Text>
            )}

            <Pressable
              testID="btn-whatsapp"
              style={[styles.botonWhatsApp, compartiendo && styles.deshabilitado]}
              disabled={compartiendo}
              onPress={() => void compartirDetalle()}
            >
              {compartiendo ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <MaterialIcons name="chat" size={16} color="#ffffff" />
                  <Text style={styles.botonWhatsAppTexto}>Enviar por WhatsApp</Text>
                </>
              )}
            </Pressable>

            {/* Acciones solo con préstamo seleccionado */}
            <View style={styles.acciones}>
              <Pressable
                testID="btn-pago"
                style={[styles.botonAccion, styles.botonPago]}
                onPress={abrirPago}
              >
                <Text style={styles.botonAccionTexto}>Registrar pago</Text>
                <MaterialIcons name="check" size={18} color="#ffffff" />
              </Pressable>
              <Pressable
                testID="btn-no-pago"
                style={[styles.botonAccion, styles.botonNoPago]}
                onPress={abrirNoPago}
              >
                <Text style={styles.botonAccionTexto}>Registrar no pago</Text>
                <MaterialIcons name="close" size={18} color="#ffffff" />
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
      </SafeAreaView>

      {/* Modal: editar cliente */}
      <ModalConFooter
        visible={modal === "editar"}
        titulo="Editar cliente"
        onCerrar={() => {
          setModal("ninguno");
          setMensaje(null);
        }}
        onCancelar={() => {
          setModal("ninguno");
          setMensaje(null);
        }}
        onConfirmar={() => void guardarCambioCliente()}
        confirmando={editando}
        confirmarTestID="guardar-cambio-cliente"
        testID="editar-cliente-form"
      >
        <Text style={styles.label}>Nombre</Text>
        <TextInput
          testID="editar-nombre"
          style={styles.input}
          placeholder="Nombre"
          value={edicion.nombre ?? ""}
          onChangeText={(v) => setEdicion((e) => ({ ...e, nombre: v }))}
        />
        <Text style={styles.label}>Apellido</Text>
        <TextInput
          testID="editar-apellido"
          style={styles.input}
          placeholder="Apellido"
          value={edicion.apellido ?? ""}
          onChangeText={(v) => setEdicion((e) => ({ ...e, apellido: v }))}
        />
        <Text style={styles.label}>Negocio</Text>
        <TextInput
          testID="editar-negocio"
          style={styles.input}
          placeholder="Negocio"
          value={edicion.negocio ?? ""}
          onChangeText={(v) => setEdicion((e) => ({ ...e, negocio: v }))}
        />
        <Text style={styles.label}>WhatsApp</Text>
        <TextInput
          testID="editar-telefono"
          style={styles.input}
          placeholder="WhatsApp"
          keyboardType="phone-pad"
          value={edicion.telefonoWhatsapp ?? ""}
          onChangeText={(v) => setEdicion((e) => ({ ...e, telefonoWhatsapp: v }))}
        />
        <Text style={styles.label}>Ubicación del negocio</Text>
        <MapaPin
          testID="mapa-pin-negocio"
          latitud={latNegocio}
          longitud={lngNegocio}
          onChange={(latN, lngN) =>
            setEdicion((e) => ({ ...e, latitud: latN, longitud: lngN }))
          }
        />
        <View style={styles.filaCoordenadas}>
          <TextInput
            testID="editar-latitud"
            style={[styles.input, styles.inputCoordenada]}
            placeholder="Latitud negocio"
            keyboardType="decimal-pad"
            value={edicion.latitud != null ? String(edicion.latitud) : ""}
            onChangeText={(v) =>
              setEdicion((e) => ({ ...e, latitud: coordenadaDeTexto(v) }))
            }
          />
          <TextInput
            testID="editar-longitud"
            style={[styles.input, styles.inputCoordenada]}
            placeholder="Longitud negocio"
            keyboardType="decimal-pad"
            value={edicion.longitud != null ? String(edicion.longitud) : ""}
            onChangeText={(v) =>
              setEdicion((e) => ({ ...e, longitud: coordenadaDeTexto(v) }))
            }
          />
        </View>
        <Text style={styles.label}>Ubicación del domicilio</Text>
        <MapaPin
          testID="mapa-pin-domicilio"
          latitud={latDomicilio}
          longitud={lngDomicilio}
          onChange={(latD, lngD) =>
            setEdicion((e) => ({
              ...e,
              latitudDomicilio: latD,
              longitudDomicilio: lngD,
            }))
          }
        />
        <View style={styles.filaCoordenadas}>
          <TextInput
            testID="editar-latitud-domicilio"
            style={[styles.input, styles.inputCoordenada]}
            placeholder="Latitud domicilio"
            keyboardType="decimal-pad"
            value={edicion.latitudDomicilio != null ? String(edicion.latitudDomicilio) : ""}
            onChangeText={(v) =>
              setEdicion((e) => ({ ...e, latitudDomicilio: coordenadaDeTexto(v) }))
            }
          />
          <TextInput
            testID="editar-longitud-domicilio"
            style={[styles.input, styles.inputCoordenada]}
            placeholder="Longitud domicilio"
            keyboardType="decimal-pad"
            value={edicion.longitudDomicilio != null ? String(edicion.longitudDomicilio) : ""}
            onChangeText={(v) =>
              setEdicion((e) => ({ ...e, longitudDomicilio: coordenadaDeTexto(v) }))
            }
          />
        </View>
        {mensaje && modal === "editar" ? (
          <Text testID="mensaje-editar" style={styles.mensajeModal}>
            {mensaje}
          </Text>
        ) : null}
      </ModalConFooter>

      {/* Modal: nuevo préstamo */}
      <ModalConFooter
        visible={modal === "prestamo"}
        titulo="Nuevo préstamo"
        onCerrar={() => setModal("ninguno")}
        onCancelar={() => setModal("ninguno")}
        onConfirmar={() => void guardarPrestamo()}
        confirmando={prestamoEnviando}
        confirmarTestID="guardar-prestamo"
        testID="prestamo-form"
      >
        <Text style={styles.label}>Valor</Text>
        <TextInput
          testID="prestamo-valor"
          style={styles.input}
          placeholder="Valor"
          keyboardType="decimal-pad"
          value={prestamoValor}
          onChangeText={setPrestamoValor}
        />
        <Text style={styles.label}>Número de cuotas</Text>
        <TextInput
          testID="prestamo-cuotas"
          style={styles.input}
          placeholder="Número de cuotas"
          keyboardType="number-pad"
          value={prestamoCuotas}
          onChangeText={setPrestamoCuotas}
        />
        <Text style={styles.label}>Días entre cuotas</Text>
        <TextInput
          testID="prestamo-dias"
          style={styles.input}
          placeholder="Días entre cuotas"
          keyboardType="number-pad"
          value={prestamoDias}
          onChangeText={setPrestamoDias}
        />
        <Text style={styles.label}>Tipo de interés (%) — opcional</Text>
        <TextInput
          testID="prestamo-interes"
          style={styles.input}
          placeholder="Tipo de interés (%) — opcional"
          keyboardType="decimal-pad"
          value={prestamoInteres}
          onChangeText={setPrestamoInteres}
        />
        {prestamoMensaje ? <Text style={styles.mensaje}>{prestamoMensaje}</Text> : null}
      </ModalConFooter>

      {/* Modal: avatar */}
      <ModalConFooter
        visible={modal === "avatar"}
        titulo="Foto del cliente"
        onCerrar={() => {
          setModal("ninguno");
          evidenciasCliente.quitar("foto_facial");
          evidenciasCliente.resetError();
        }}
        onCancelar={() => {
          setModal("ninguno");
          evidenciasCliente.quitar("foto_facial");
          evidenciasCliente.resetError();
        }}
        onConfirmar={() => void guardarEvidenciaSeleccionada("foto_facial")}
        confirmando={evidenciasEnviando}
        confirmarTestID="avatar-guardar"
        testID="avatar-modal"
      >
        {(() => {
          const pendiente = evidenciasSeleccionadasPara("foto_facial")[0];
          if (pendiente) {
            return (
              <Image
                testID="avatar-preview"
                source={{ uri: pendiente.uri }}
                style={styles.evidenciaPreview}
              />
            );
          }
          return tarjeta.fotoUrl ? (
            <Image
              testID="avatar-foto-actual"
              source={{ uri: tarjeta.fotoUrl }}
              style={styles.evidenciaPreview}
            />
          ) : (
            <View style={styles.evidenciaVacio}>
              <MaterialIcons name="person" size={32} color="#94a3b8" />
              <Text style={styles.evidenciaVacioTexto}>
                Este cliente no tiene foto.
              </Text>
            </View>
          );
        })()}
        <Pressable
          testID="avatar-libreria"
          style={[styles.botonEvidencia]}
          disabled={evidenciasEnviando || evidenciasCliente.cargando}
          onPress={() => void elegirEvidencia("foto_facial", "libreria")}
        >
          <MaterialIcons name="photo-library" size={16} color="#2563eb" />
          <Text style={styles.botonEvidenciaTexto}>Cargar desde librería</Text>
        </Pressable>
        <Pressable
          testID="avatar-camara"
          style={styles.botonEvidencia}
          disabled={evidenciasEnviando || evidenciasCliente.cargando}
          onPress={() => void elegirEvidencia("foto_facial", "camara")}
        >
          <MaterialIcons name="photo-camera" size={16} color="#2563eb" />
          <Text style={styles.botonEvidenciaTexto}>Tomar foto con cámara</Text>
        </Pressable>
        {evidenciasCliente.cargando || evidenciasEnviando ? (
          <ActivityIndicator />
        ) : null}
        {evidenciasCliente.error ? (
          <Text style={styles.errorTexto}>{evidenciasCliente.error}</Text>
        ) : null}
      </ModalConFooter>

      {/* Modal: documento */}
      <ModalConFooter
        visible={modal === "documento"}
        titulo={modalDocumento === "frente" ? "Documento — frente" : "Documento — reverso"}
        onCerrar={() => {
          setModal("ninguno");
          evidenciasCliente.quitar(
            modalDocumento === "reverso" ? "documento_reverso" : "documento_frente",
          );
          evidenciasCliente.resetError();
        }}
        onCancelar={() => {
          setModal("ninguno");
          evidenciasCliente.quitar(
            modalDocumento === "reverso" ? "documento_reverso" : "documento_frente",
          );
          evidenciasCliente.resetError();
        }}
        onConfirmar={() =>
          void guardarEvidenciaSeleccionada(
            modalDocumento === "reverso" ? "documento_reverso" : "documento_frente",
          )
        }
        confirmando={evidenciasEnviando}
        confirmarTestID="documento-guardar"
        testID="documento-modal"
      >
        {(() => {
          const campo = modalDocumento === "reverso" ? "documento_reverso" : "documento_frente";
          const pendiente = evidenciasSeleccionadasPara(campo)[0];
          const urlActual = modalDocumento === "reverso" ? docReversoUrl : docFrenteUrl;
          if (pendiente) {
            return (
              <Image
                testID="documento-preview"
                source={{ uri: pendiente.uri }}
                style={styles.evidenciaPreview}
              />
            );
          }
          if (urlActual) {
            return (
              <Image
                testID="documento-foto-actual"
                source={{ uri: urlActual }}
                style={styles.evidenciaPreview}
              />
            );
          }
          return (
            <View style={styles.evidenciaVacio}>
              <MaterialIcons name="badge" size={32} color="#94a3b8" />
              <Text style={styles.evidenciaVacioTexto}>
                {modalDocumento === "frente"
                  ? "El frente del documento aún no está cargado."
                  : "El reverso del documento aún no está disponible."}
              </Text>
            </View>
          );
        })()}
        <Pressable
          testID="documento-libreria"
          style={styles.botonEvidencia}
          disabled={evidenciasEnviando || evidenciasCliente.cargando}
          onPress={() =>
            void elegirEvidencia(
              modalDocumento === "reverso" ? "documento_reverso" : "documento_frente",
              "libreria",
            )
          }
        >
          <MaterialIcons name="photo-library" size={16} color="#2563eb" />
          <Text style={styles.botonEvidenciaTexto}>Cargar desde librería</Text>
        </Pressable>
        <Pressable
          testID="documento-camara"
          style={styles.botonEvidencia}
          disabled={evidenciasEnviando || evidenciasCliente.cargando}
          onPress={() =>
            void elegirEvidencia(
              modalDocumento === "reverso" ? "documento_reverso" : "documento_frente",
              "camara",
            )
          }
        >
          <MaterialIcons name="photo-camera" size={16} color="#2563eb" />
          <Text style={styles.botonEvidenciaTexto}>Tomar foto con cámara</Text>
        </Pressable>
        {evidenciasCliente.cargando || evidenciasEnviando ? (
          <ActivityIndicator />
        ) : null}
        {evidenciasCliente.error ? (
          <Text style={styles.errorTexto}>{evidenciasCliente.error}</Text>
        ) : null}
      </ModalConFooter>

      {/* Modal: detalle de cuota */}
      <ModalConFooter
        visible={modal === "cuota"}
        titulo="Detalle de cuota"
        onCerrar={() => setModal("ninguno")}
        onCancelar={() => setModal("ninguno")}
        labelCancelar="Cerrar"
        testID="cuota-dialog"
      >
        {detalleCuotaCargando ? (
          <ActivityIndicator />
        ) : detalleCuota ? (
          <>
            <View style={styles.cuotaResumen}>
              <Text style={styles.cuotaLinea}>
                Cuota {detalleCuota.numeroCuota} — {detalleCuota.valorEsperado} (
                {detalleCuota.estatus})
              </Text>
              <Text style={styles.cuotaFecha}>Vence {detalleCuota.fechaVencimiento}</Text>
            </View>
            <Text style={styles.cuotaSubtitulo}>Pagos</Text>
            {detalleCuota.pagos.length === 0 ? (
              <Text style={styles.cuotaVacio}>Sin pagos registrados.</Text>
            ) : (
              detalleCuota.pagos.map((pago) => (
                <View key={pago.id} style={styles.pagoItem}>
                  <Text style={styles.pagoTexto}>
                    ${pago.valor} · {pago.metodoPago ?? "—"}
                  </Text>
                  <Text style={styles.pagoFecha}>{pago.fecha}</Text>
                </View>
              ))
            )}
            <Text style={styles.cuotaLinea}>
              Abonos acumulados: {detalleCuota.abonosAcumulados}
            </Text>
            <Text style={styles.cuotaLinea}>
              Saldo pendiente: {detalleCuota.saldoPendiente}
            </Text>
            {detalleCuota.ultimaVisita ? (
              <>
                <Text style={styles.cuotaSubtitulo}>Última visita</Text>
                <Text style={styles.cuotaLinea}>
                  Resultado: {detalleCuota.ultimaVisita.resultado}
                  {detalleCuota.ultimaVisita.motivoNoPago
                    ? ` (${detalleCuota.ultimaVisita.motivoNoPago})`
                    : ""}{" "}
                  · {detalleCuota.ultimaVisita.fecha}
                </Text>
              </>
            ) : null}
          </>
        ) : (
          <Text style={styles.errorTexto}>No se pudo cargar el detalle de la cuota.</Text>
        )}
      </ModalConFooter>

      {/* Modal: registrar pago */}
      <ModalConFooter
        visible={modal === "pago"}
        titulo="Registrar pago"
        onCerrar={() => {
          setModal("ninguno");
          setMensaje(null);
        }}
        onCancelar={() => {
          setModal("ninguno");
          setMensaje(null);
        }}
        onConfirmar={() => void enviarVisita()}
        confirmando={enviando}
        confirmarTestID="guardar-visita"
        testID="form-pago"
      >
        <Text style={styles.label}>Tipo</Text>
        <View style={styles.chips}>
          <Pressable
            testID="tipo-cuota"
            style={[styles.chip, tipoPago === "cuota" && styles.chipActivo]}
            onPress={() => setTipoPago("cuota")}
          >
            <Text style={tipoPago === "cuota" ? styles.chipTextoActivo : styles.chipTexto}>
              Pago de cuota
            </Text>
          </Pressable>
          <Pressable
            testID="tipo-abono"
            style={[styles.chip, tipoPago === "abono" && styles.chipActivo]}
            onPress={() => setTipoPago("abono")}
          >
            <Text style={tipoPago === "abono" ? styles.chipTextoActivo : styles.chipTexto}>
              Abono parcial
            </Text>
          </Pressable>
        </View>
        {tipoPago === "cuota" && cuotaPorPagar ? (
          <Text style={styles.detalle}>
            Cuota {cuotaPorPagar.numeroCuota} — {cuotaPorPagar.valorEsperado}
          </Text>
        ) : null}
        <Text style={styles.label}>Valor</Text>
        <TextInput
          testID="pago-valor"
          style={styles.input}
          placeholder="Valor"
          keyboardType="decimal-pad"
          value={valor}
          onChangeText={setValor}
        />
        <Text style={styles.label}>Método</Text>
        <View style={styles.chips}>
          {METODOS_PAGO.map((metodo) => (
            <Pressable
              key={metodo}
              style={[styles.chip, metodoPago === metodo && styles.chipActivo]}
              onPress={() => setMetodoPago(metodo)}
            >
              <Text style={metodoPago === metodo ? styles.chipTextoActivo : styles.chipTexto}>
                {metodo}
              </Text>
            </Pressable>
          ))}
        </View>
        {mensaje && modal === "pago" ? (
          <Text testID="mensaje-pago" style={styles.mensajeModal}>
            {mensaje}
          </Text>
        ) : null}
      </ModalConFooter>

      {/* Modal: registrar no pago */}
      <ModalConFooter
        visible={modal === "no_pago"}
        titulo="Registrar no pago"
        onCerrar={() => {
          setModal("ninguno");
          setMensaje(null);
        }}
        onCancelar={() => {
          setModal("ninguno");
          setMensaje(null);
        }}
        onConfirmar={() => void enviarVisita()}
        confirmando={enviando}
        confirmarTestID="guardar-visita"
        testID="form-no-pago"
      >
        <Text style={styles.label}>Motivo de no pago</Text>
        <View style={styles.chips}>
          {MOTIVOS_NO_PAGO.map((motivo) => (
            <Pressable
              key={motivo}
              style={[styles.chip, motivoNoPago === motivo && styles.chipActivo]}
              onPress={() => setMotivoNoPago(motivo)}
            >
              <Text style={motivoNoPago === motivo ? styles.chipTextoActivo : styles.chipTexto}>
                {motivo}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Promesa de pago (solo para compromiso_de_pago)</Text>
        {motivoNoPago === "compromiso_de_pago" ? (
          <>
            <TextInput
              testID="fecha-prometida"
              style={styles.input}
              placeholder="Fecha prometida (AAAA-MM-DD)"
              autoCapitalize="none"
              value={fechaPrometida}
              onChangeText={setFechaPrometida}
            />
            <TextInput
              testID="valor-prometido"
              style={styles.input}
              placeholder="Valor prometido"
              keyboardType="decimal-pad"
              value={valorPrometido}
              onChangeText={setValorPrometido}
            />
          </>
        ) : (
          <Text style={styles.promesaNota}>
            Cambia el motivo a compromiso_de_pago para registrar una promesa.
          </Text>
        )}
        {mensaje && modal === "no_pago" ? (
          <Text testID="mensaje-no-pago" style={styles.mensajeModal}>
            {mensaje}
          </Text>
        ) : null}
      </ModalConFooter>
    </>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#f8fafc" },
  scroll: { padding: 16, gap: 12 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  headerAccionIzq: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: 72,
  },
  headerAccionDerecha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: 72,
    justifyContent: "flex-end",
  },
  headerAccionTexto: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
  headerTitulo: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
  },
  banner: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bannerTexto: { color: "#1d4ed8", fontSize: 13, fontWeight: "500" },
  mensajeModal: { color: "#dc2626", fontSize: 13, fontWeight: "500", marginTop: 8 },
  tarjeta: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    gap: 6,
  },
  filaSuperior: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  documento: { flex: 1 },
  documentoFilaTitulo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  documentoTitulo: { fontSize: 12, fontWeight: "700", color: "#475569" },
  documentoMiniaturas: { flexDirection: "row", gap: 10, marginTop: 6 },
  miniatura: { alignItems: "center", gap: 4, flex: 1 },
  miniaturaImagen: {
    width: 72,
    height: 48,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  miniaturaPlaceholder: {
    width: 72,
    height: 48,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  miniaturaEtiqueta: { fontSize: 10, color: "#64748b", fontWeight: "600" },
  badgeDoc: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeVerificado: { backgroundColor: "#dcfce7" },
  badgePendiente: { backgroundColor: "#fef3c7" },
  badgeVerificadoTexto: { color: "#16a34a", fontSize: 10, fontWeight: "700" },
  badgePendienteTexto: { color: "#b45309", fontSize: 10, fontWeight: "700" },
  nombre: { fontSize: 18, fontWeight: "700", color: "#1e293b", marginTop: 8 },
  detalle: { color: "#475569", fontSize: 14 },
  footerTarjeta: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
  },
  comoLlegar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#a5f3fc",
    backgroundColor: "#ecfeff",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  comoLlegarActivo: { borderColor: "#67e8f9" },
  comoLlegarTexto: { color: "#0891b2", fontWeight: "600", fontSize: 13 },
  editarUbicacion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
  },
  editarUbicacionTexto: { color: "#2563eb", fontWeight: "600", fontSize: 13 },
  seccionMapa: { gap: 8 },
  navegacion: { flexDirection: "row", gap: 10 },
  botonNavegar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0891b2",
    borderRadius: 10,
    paddingVertical: 10,
  },
  botonWaze: { backgroundColor: "#1d4ed8" },
  botonNavegarTexto: { color: "#ffffff", fontWeight: "600", fontSize: 13 },
  notificacion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  notificacionContenido: { flex: 1 },
  notificacionTitulo: { fontSize: 13, fontWeight: "700", color: "#1e40af" },
  notificacionDetalle: { fontSize: 12, color: "#3b82f6", marginTop: 2 },
  seccion: {
    marginTop: 12,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    gap: 8,
  },
  seccionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  botonNuevo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  botonNuevoTexto: { color: "#2563eb", fontSize: 14, fontWeight: "600" },
  seccionTitulo: { fontSize: 15, fontWeight: "700", color: "#334155" },
  seccionEspacio: { width: 84 },
  sinPrestamos: { color: "#64748b", fontSize: 13, marginTop: 10 },
  prestamoItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  prestamoItemSeleccionado: {
    borderColor: "#86efac",
    borderWidth: 2,
    backgroundColor: "#f0fdf4",
  },
  prestamoInfo: { flex: 1, marginRight: 8 },
  prestamoValor: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  prestamoDetalle: { color: "#64748b", fontSize: 12, marginTop: 2 },
  prestamoEstatus: { color: "#475569", fontSize: 12, marginTop: 2, fontWeight: "600" },
  detallePrestamo: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    gap: 8,
    marginTop: 4,
  },
  detalleTitulo: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  detalleLinea: { color: "#475569", fontSize: 13 },
  detalleCarga: { marginVertical: 16 },
  detalleError: { color: "#dc2626", fontSize: 13 },
  leyenda: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  leyendaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  leyendaColor: { width: 12, height: 12, borderRadius: 999 },
  leyendaTexto: { color: "#475569", fontSize: 11 },
  canvas: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cuadro: {
    width: "22%",
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
    alignItems: "center",
    gap: 2,
  },
  cuadroNumero: { fontSize: 16, fontWeight: "700", color: "#334155" },
  cuadroValor: { fontSize: 11, color: "#475569", fontWeight: "600" },
  cuadroFecha: { fontSize: 9, color: "#64748b" },
  cuadroAbono: { fontSize: 9, color: "#16a34a", fontWeight: "600" },
  cuadroSaldo: { fontSize: 9, color: "#2563eb", fontWeight: "600" },
  cuadroEtiqueta: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginTop: 2,
  },
  cuadroEtiquetaTexto: { fontSize: 9, fontWeight: "600" },
  botonWhatsApp: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#16a34a",
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 6,
  },
  botonWhatsAppTexto: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
  acciones: { flexDirection: "row", gap: 10, marginTop: 2 },
  botonAccion: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    paddingVertical: 12,
  },
  botonPago: { backgroundColor: "#16a34a" },
  botonNoPago: { backgroundColor: "#d97706" },
  botonAccionTexto: { color: "#ffffff", fontWeight: "600" },
  deshabilitado: { opacity: 0.5 },
  label: { fontSize: 13, color: "#475569", marginTop: 2 },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1e293b",
  },
  filaCoordenadas: { flexDirection: "row", gap: 8 },
  inputCoordenada: { flex: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActivo: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  chipTexto: { color: "#334155", fontSize: 13 },
  chipTextoActivo: { color: "#ffffff", fontSize: 13 },
  promesaNota: { color: "#64748b", fontSize: 13 },
  mensaje: { color: "#16a34a", fontSize: 14, marginTop: 2 },
  errorTexto: { color: "#dc2626", fontSize: 13, marginTop: 2 },
  evidenciaPreview: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    resizeMode: "cover",
  },
  evidenciaVacio: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 16,
  },
  evidenciaVacioTexto: { color: "#64748b", fontSize: 13 },
  botonEvidencia: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 10,
  },
  botonEvidenciaTexto: { color: "#2563eb", fontWeight: "600" },
  cuotaResumen: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  cuotaLinea: { color: "#334155", fontSize: 14, fontWeight: "600" },
  cuotaFecha: { color: "#64748b", fontSize: 12 },
  cuotaSubtitulo: { fontSize: 13, fontWeight: "700", color: "#475569", marginTop: 4 },
  cuotaVacio: { color: "#94a3b8", fontSize: 13 },
  pagoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pagoTexto: { color: "#334155", fontSize: 13, fontWeight: "600" },
  pagoFecha: { color: "#64748b", fontSize: 12 },
});