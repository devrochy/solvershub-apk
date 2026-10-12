import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialIcons } from "@expo/vector-icons";
import { captureRef } from "react-native-view-shot";
import { shareAsync } from "expo-sharing";
import * as Location from "expo-location";
import { apiErrorStatus, esErrorDeRed } from "@core/api/client";
import { Avatar } from "../components/Avatar";
import { HeaderApp } from "../components/HeaderApp";
import { CampoTelefono } from "../components/CampoTelefono";
import { CargaError } from "../components/CargaError";
import { BannerMensaje } from "../components/BannerMensaje";
import { ColorBadge, colorDeEstado } from "../components/ColorBadge";
import { urlArchivo } from "@core/config";
import { MapaCliente } from "../components/MapaCliente";
import { MapaPin } from "../components/MapaPin";
import { CampoModal } from "../components/CampoModal";
import { EvidenciasModal } from "../components/EvidenciasModal";
import {
  ETIQUETAS_TIPO_DOCUMENTO,
  TIPOS_DOCUMENTO,
  validarNumeroDocumento,
} from "@shared/domain/tipo-documento";
import { ModalConFooter } from "../components/ModalConFooter";
import { METODOS_PAGO, MOTIVOS_NO_PAGO } from "@shared/domain/catalogos";
import { etiquetaEstatus } from "@shared/domain/estatus";
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
import {
  CANVAS,
  COLORES_CANVAS,
  ETIQUETA_CANVAS,
  detalleDesdeEstadoCuenta,
  esPendienteOAtrasada,
  fechaCortaCuota,
  formatearFechaHora,
} from "../features/cliente/presentacion";
import {
  validarFechaPrometida,
  validarMonto,
  validarMontoContraTope,
  validarTelefonoWhatsapp,
} from "../features/visita/validaciones";
import type { RootStackParamList } from "../navigation/types";
import { useOffline } from "../offline/offline-context";
import { guardarCliente, leerCliente } from "../offline/cache";
import { guardarBorrador, leerBorrador, limpiarBorrador } from "../offline/borrador";
import { useSession } from "../session/session-context";
import { useCarteraActiva } from "../session/cartera-activa-context";
import { usePagosPendientes } from "../offline/pagos-pendientes";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { Badge, Button, IconButton, TextField, Toast, TOAST_DURACION_EXITO, useKit, type KitTema } from "@shared/ui";

import type {
  ClienteTarjetaPublic,
  DetalleCuotaPublic,
  EstadoCuentaPrestamoPublic,
  PrestamoPublic,
  LinkPagoCobro,
} from "@shared/types/gestor";

type Props = NativeStackScreenProps<RootStackParamList, "Cliente">;

export interface ClienteScreenDirectProps {
  carteraId: string;
  clienteId: string;
  nombre: string;
  latitud?: number;
  longitud?: number;
  latitudDomicilio?: number;
  longitudDomicilio?: number;
  prestamoAutoSeleccionado?: boolean;
}

type ModalActivo =
  | "ninguno"
  | "editar"
  | "ubicacion"
  | "prestamo"
  | "avatar"
  | "cuota"
  | "documento";

const COORD_DEFAULT = { lat: -17.78, lng: -63.18 };

/**
 * Textos de la casilla del canvas (un cuarto del ancho): una sola línea que se achica
 * antes de partir una palabra ("Abon / ado"), con tope para la fuente grande del sistema.
 */
const UNA_LINEA = {
  numberOfLines: 1,
  adjustsFontSizeToFit: true,
  minimumFontScale: 0.7,
  maxFontSizeMultiplier: 1.3,
} as const;

export function ClienteScreen(props: Props | ClienteScreenDirectProps) {
  const params =
    "route" in props ? props.route.params : (props as ClienteScreenDirectProps);
  const { carteraId, clienteId, latitud, longitud, latitudDomicilio, longitudDomicilio, prestamoAutoSeleccionado } = params;
  const { api, logout } = useSession();
  const offline = useOffline();
  const { carteraActiva } = useCarteraActiva();
  const kit = useKit();
  const { c } = kit;
  const styles = useMemo(() => crearEstilos(kit), [kit]);
  // Toast de éxito del kit al confirmar un pago (HU-DS-10). Se muestra dentro de
  // la modal de cuota (un toast de la raíz quedaría debajo del Modal).
  const [toastPago, setToastPago] = useState<{ id: number; mensaje: string } | null>(null);
  useEffect(() => {
    if (!toastPago) return undefined;
    const timer = setTimeout(() => setToastPago(null), TOAST_DURACION_EXITO);
    return () => clearTimeout(timer);
  }, [toastPago]);
  // Pagos guardados sin conexión que esperan su ack (badge "Pendiente").
  const pagosPendientes = usePagosPendientes(String(clienteId), offline.sinSubir);

  const [tarjeta, setTarjeta] = useState<ClienteTarjetaPublic | null>(null);
  const [prestamos, setPrestamos] = useState<PrestamoPublic[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Modales (máquina de estados: solo uno activo a la vez).
  const [modal, setModal] = useState<ModalActivo>("ninguno");
  const [modalDocumento, setModalDocumento] = useState<"frente" | "reverso">("frente");

  // Acordeón de préstamos.
  const [prestamoSeleccionadoId, setPrestamoSeleccionadoId] = useState<string | null>(null);
  const [estadoPrestamo, setEstadoPrestamo] = useState<EstadoCuentaPrestamoPublic | null>(null);
  const [estadoPrestamoCargando, setEstadoPrestamoCargando] = useState(false);

  // Detalle de cuota.
  const [detalleCuota, setDetalleCuota] = useState<DetalleCuotaPublic | null>(null);
  const [detalleCuotaCargando, setDetalleCuotaCargando] = useState(false);
  // El detalle se armó con el estado de cuenta porque no había señal.
  const [detalleSinConexion, setDetalleSinConexion] = useState(false);
  // Acción desplegada dentro de la modal de cuota (registrar pago/no pago).
  const [accionCuota, setAccionCuota] = useState<"ninguno" | "pago" | "no_pago">("ninguno");
  // Borrar pago/abono desde la modal de cuota.
  const [borrarTarget, setBorrarTarget] = useState<{
    tipo: "pago" | "abono";
    id: string;
    valor: number;
  } | null>(null);
  const [borrarPassword, setBorrarPassword] = useState("");
  const [borrarMotivo, setBorrarMotivo] = useState("");
  const [borrando, setBorrando] = useState(false);
  const [borrarMensaje, setBorrarMensaje] = useState<string | null>(null);

  // Formulario pago/no_pago (dentro de la modal de cuota).
  const [valor, setValor] = useState("");
  const [metodoPago, setMetodoPago] = useState<(typeof METODOS_PAGO)[number]>("efectivo");
  // Métodos permitidos por la cartera (config); si no hay, se ofrecen todos.
  const metodosDisponibles = useMemo(() => {
    const permitidos = carteraActiva?.config.metodosPago ?? [];
    const filtrados = METODOS_PAGO.filter((m) => permitidos.includes(m));
    return filtrados.length > 0 ? filtrados : [...METODOS_PAGO];
  }, [carteraActiva?.config.metodosPago]);
  const bloquearInteres = Boolean(carteraActiva?.config.bloquearCambioInteres);

  useEffect(() => {
    if (!metodosDisponibles.includes(metodoPago)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- alinea el método con la config de la cartera
      setMetodoPago(metodosDisponibles[0]);
    }
  }, [metodosDisponibles, metodoPago]);
  const [motivoNoPago, setMotivoNoPago] = useState<(typeof MOTIVOS_NO_PAGO)[number]>("no_esta");
  const [tipoPago, setTipoPago] = useState<"cuota" | "abono">("cuota");
  const [qrAbierto, setQrAbierto] = useState(false);
  const [qrCargando, setQrCargando] = useState(false);
  const [qrCobro, setQrCobro] = useState<LinkPagoCobro | null>(null);
  const [qrMensaje, setQrMensaje] = useState<string | null>(null);
  const [fechaPrometida, setFechaPrometida] = useState("");
  const [valorPrometido, setValorPrometido] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [mensajeTono, setMensajeTono] = useState<"exito" | "error" | "aviso">("error");
  const mensajeError = (texto: string | null) => {
    setMensaje(texto);
    setMensajeTono("error");
  };
  const mensajeExito = (texto: string) => {
    setMensaje(texto);
    setMensajeTono("exito");
  };
  // Guardado sin conexión: no es un fallo, pero todavía falta enviarlo.
  const mensajeAviso = (texto: string) => {
    setMensaje(texto);
    setMensajeTono("aviso");
  };

  // Formulario editar cliente.
  const [edicion, setEdicion] = useState<CambioClienteInput>({});
  const [edicionOriginal, setEdicionOriginal] = useState<CambioClienteInput>({});
  const [editando, setEditando] = useState(false);

  // Editar ubicación (N6): campo (negocio/domicilio), dirección a buscar y envío.
  const [ubicacionCampo, setUbicacionCampo] = useState<"negocio" | "domicilio">("negocio");
  const [ubicacionDireccion, setUbicacionDireccion] = useState("");
  const [ubicacionBuscando, setUbicacionBuscando] = useState(false);
  const [ubicacionEnviando, setUbicacionEnviando] = useState(false);
  const [ubicacionMensaje, setUbicacionMensaje] = useState<string | null>(null);

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
        api.tarjeta(carteraId, clienteId),
        api.listarPrestamosDeCliente(carteraId, clienteId),
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
      await guardarCliente(carteraId, clienteId, { tarjeta: t, prestamos: p });
    } catch (err) {
      if (apiErrorStatus(err) === 401) {
        await logout();
      } else if (esErrorDeRed(err)) {
        const cache = await leerCliente(carteraId, clienteId);
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
  }, [api, carteraId, clienteId, logout, prestamoAutoSeleccionado]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount (async; no setState síncrono)
    cargar();
    // `versionRecarga` sube cuando se envía la cola: la ficha muestra lo que quedó en el servidor.
  }, [cargar, offline.versionRecarga]);

  const prestamoSeleccionado = useMemo(
    () => prestamos.find((p) => p.id === prestamoSeleccionadoId) ?? null,
    [prestamos, prestamoSeleccionadoId],
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
      .obtenerEstadoCuentaPrestamo(carteraId, prestamoDetalleId)
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
  }, [api, carteraId, logout, prestamoDetalleId, offline.versionRecarga]);

  const proximoCobro = useMemo(() => {
    const activos = prestamos.filter((p) => p.estatus === "vigente");
    let total = 0;
    let cuentasPendientes = 0;
    for (const p of activos) {
      const cuota = p.cuotas.find((c) => esPendienteOAtrasada(c.estatus));
      if (cuota) {
        total += cuota.valorEsperado;
        cuentasPendientes += 1;
      }
    }
    return { total, cuentasPendientes };
  }, [prestamos]);

  function onPrestamoPress(id: string) {
    if (prestamoSeleccionadoId === id) {
      setPrestamoSeleccionadoId(null);
      return;
    }
    setEstadoPrestamo(null);
    setEstadoPrestamoCargando(true);
    setPrestamoSeleccionadoId(id);
  }

  async function enviarAccionCuota() {
    if (!prestamoSeleccionado) {
      mensajeError("Selecciona un préstamo.");
      return;
    }
    if (accionCuota === "pago") {
      const monto = Number(valor);
      const errorMonto = validarMonto(monto);
      if (errorMonto) {
        mensajeError(errorMonto);
        return;
      }
      const tope =
        tipoPago === "cuota"
          ? (detalleCuota?.saldoPendiente ?? null)
          : (estadoPrestamo?.saldoPendiente ?? null);
      const errorTope = validarMontoContraTope(monto, tope);
      if (errorTope) {
        mensajeError(errorTope);
        return;
      }
      setEnviando(true);
      mensajeError(null);
      const input = {
        prestamoId: prestamoSeleccionado.id,
        clienteId,
        resultado: "pago" as const,
        tipoPago,
        cuotaId: tipoPago === "cuota" ? detalleCuota?.cuotaId : undefined,
        valor: monto,
        metodoPago,
      };
      try {
        await api.registrarVisitaPago(carteraId, input);
        setAccionCuota("ninguno");
        setValor("");
        mensajeExito("Pago registrado.");
        // Confirmación del kit (HU-DS-10): sin animación con "reducir movimiento".
        // El háptico queda para la próxima release nativa (fingerprint de la OTA).
        setToastPago((previo) => ({ id: (previo?.id ?? 0) + 1, mensaje: "Pago registrado." }));
        await recargarDetalleCuota();
        await recargarEstadoPrestamo();
        await cargar();
      } catch (err) {
        if (apiErrorStatus(err) === 401) {
          await guardarBorrador(`cobro:${carteraId}:${clienteId}`, {
            accionCuota: "pago",
            valor,
            metodoPago,
            tipoPago,
          });
          await logout();
        } else if (esErrorDeRed(err)) {
          const encolado = await offline.encolarSiNoExiste(
            "visita",
            input,
            `pago-${input.prestamoId}-${input.clienteId}-${input.cuotaId ?? "abono"}`,
          );
          if (encolado) {
            setAccionCuota("ninguno");
            setValor("");
            mensajeAviso("Guardado sin conexión. Se enviará al volver la señal.");
          } else {
            mensajeError(
              "Ya hay un pago pendiente por sincronizar para este préstamo.",
            );
          }
        } else {
          mensajeError("No se pudo registrar el pago.");
        }
      } finally {
        setEnviando(false);
      }
      return;
    }
    if (accionCuota === "no_pago") {
      const esCompromiso = motivoNoPago === "compromiso_de_pago";
      const errorFecha = validarFechaPrometida(fechaPrometida);
      if (errorFecha) {
        mensajeError(errorFecha);
        return;
      }
      if (esCompromiso && !fechaPrometida.trim()) {
        mensajeError("Para compromiso de pago se requiere la fecha prometida.");
        return;
      }
      const montoPrometido = valorPrometido.trim() ? Number(valorPrometido) : null;
      if (montoPrometido !== null) {
        const errorMonto = validarMonto(montoPrometido);
        if (errorMonto) {
          mensajeError(errorMonto);
          return;
        }
      }
      setEnviando(true);
      mensajeError(null);
      const input = {
        prestamoId: prestamoSeleccionado.id,
        clienteId,
        resultado: "no_pago" as const,
        motivoNoPago,
        fechaPrometida: fechaPrometida.trim() || undefined,
        valorPrometido: montoPrometido ?? undefined,
      };
      try {
        await api.registrarVisitaNoPago(carteraId, input);
        setAccionCuota("ninguno");
        setFechaPrometida("");
        setValorPrometido("");
        mensajeExito("Visita registrada.");
        await recargarDetalleCuota();
        await recargarEstadoPrestamo();
      } catch (err) {
        if (apiErrorStatus(err) === 401) {
          await guardarBorrador(`no_pago:${carteraId}:${clienteId}`, {
            accionCuota: "no_pago",
            motivoNoPago,
            fechaPrometida,
            valorPrometido,
          });
          await logout();
        } else if (esErrorDeRed(err)) {
          const encolado = await offline.encolarSiNoExiste(
            "visita",
            input,
            `no_pago-${input.prestamoId}-${input.clienteId}`,
          );
          if (encolado) {
            setAccionCuota("ninguno");
            setFechaPrometida("");
            setValorPrometido("");
            mensajeAviso("Guardado sin conexión. Se enviará al volver la señal.");
          } else {
            mensajeError(
              "Ya hay una visita de no pago pendiente por sincronizar para este préstamo.",
            );
          }
        } else {
          mensajeError("No se pudo registrar la visita.");
        }
      } finally {
        setEnviando(false);
      }
    }
  }

  function toggleAccionCuota(accion: "pago" | "no_pago") {
    setBorrarTarget(null);
    setBorrarMensaje(null);
    if (accionCuota === accion) {
      setAccionCuota("ninguno");
      mensajeError(null);
      return;
    }
    mensajeError(null);
    if (accion === "pago") {
      setTipoPago("cuota");
      setMetodoPago("efectivo");
      setValor(detalleCuota ? String(detalleCuota.valorEsperado) : "");
    } else {
      setMotivoNoPago("no_esta");
      setFechaPrometida("");
      setValorPrometido("");
    }
    setAccionCuota(accion);
  }

  function cerrarCuota() {
    setAccionCuota("ninguno");
    setBorrarTarget(null);
    mensajeError(null);
    setModal("ninguno");
  }

  function iniciarBorrarPago(pago: { id: string; valor: number }) {
    setAccionCuota("ninguno");
    mensajeError(null);
    setBorrarTarget({ tipo: "pago", id: pago.id, valor: pago.valor });
    setBorrarPassword("");
    setBorrarMotivo("");
    setBorrarMensaje(null);
  }

  function iniciarBorrarAbono(abono: { id: string; valor: number }) {
    setAccionCuota("ninguno");
    mensajeError(null);
    setBorrarTarget({ tipo: "abono", id: abono.id, valor: abono.valor });
    setBorrarPassword("");
    setBorrarMotivo("");
    setBorrarMensaje(null);
  }

  function cancelarBorrar() {
    setBorrarTarget(null);
    setBorrarMensaje(null);
  }

  async function confirmarBorrar() {
    if (!borrarTarget) {
      return;
    }
    if (!borrarPassword || !borrarMotivo.trim()) {
      setBorrarMensaje("Password y motivo son obligatorios.");
      return;
    }
    setBorrando(true);
    setBorrarMensaje(null);
    try {
      const input = { password: borrarPassword, motivo: borrarMotivo.trim() };
      if (borrarTarget.tipo === "pago") {
        await api.eliminarPago(carteraId, borrarTarget.id, input);
      } else {
        await api.eliminarAbono(carteraId, borrarTarget.id, input);
      }
      setBorrarTarget(null);
      setBorrarPassword("");
      setBorrarMotivo("");
      mensajeError(
        borrarTarget.tipo === "pago"
          ? "Pago eliminado."
          : "Abono eliminado.",
      );
      await recargarDetalleCuota();
      await recargarEstadoPrestamo();
    } catch (err) {
      if (apiErrorStatus(err) === 401) {
        await logout();
      } else if (esErrorDeRed(err)) {
        setBorrarMensaje("Se requiere conexión para eliminar.");
      } else if (err instanceof Error && err.message) {
        try {
          const cuerpo = JSON.parse(err.message) as { message?: string };
          setBorrarMensaje(
            typeof cuerpo.message === "string" ? cuerpo.message : "No se pudo eliminar.",
          );
        } catch {
          setBorrarMensaje("No se pudo eliminar.");
        }
      } else {
        setBorrarMensaje("No se pudo eliminar.");
      }
    } finally {
      setBorrando(false);
    }
  }

  // REQ-APK-014: recupera un cobro/visita capturado si un 401 tumbó la sesión.
  const borradorRevisadoRef = useRef(false);
  useEffect(() => {
    if (borradorRevisadoRef.current) {
      return;
    }
    borradorRevisadoRef.current = true;
    void (async () => {
      const cobro = await leerBorrador<{
        accionCuota: "pago";
        valor: string;
        metodoPago: typeof metodoPago;
        tipoPago: "cuota" | "abono";
      }>(`cobro:${carteraId}:${clienteId}`);
      const noPago = await leerBorrador<{
        accionCuota: "no_pago";
        motivoNoPago: typeof motivoNoPago;
        fechaPrometida: string;
        valorPrometido: string;
      }>(`no_pago:${carteraId}:${clienteId}`);
      if (cobro) {
        setAccionCuota("pago");
        setValor(cobro.valor);
        setMetodoPago(cobro.metodoPago);
        setTipoPago(cobro.tipoPago);
        await limpiarBorrador(`cobro:${carteraId}:${clienteId}`);
        mensajeExito("Recuperamos el cobro que estabas capturando.");
      } else if (noPago) {
        setAccionCuota("no_pago");
        setMotivoNoPago(noPago.motivoNoPago);
        setFechaPrometida(noPago.fechaPrometida);
        setValorPrometido(noPago.valorPrometido);
        await limpiarBorrador(`no_pago:${carteraId}:${clienteId}`);
        mensajeExito("Recuperamos la visita que estabas capturando.");
      }
    })().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, []);

  async function abrirCobroQr() {
    if (!detalleCuota?.cuotaId) {
      return;
    }
    setQrAbierto(true);
    setQrCobro(null);
    setQrMensaje(null);
    setQrCargando(true);
    try {
      const data = await api.crearLinkPago(carteraId, detalleCuota.cuotaId);
      setQrCobro(data);
    } catch (err) {
      if (apiErrorStatus(err) === 401) {
        await logout();
        return;
      }
      setQrMensaje("No se pudo generar el cobro con QR.");
    } finally {
      setQrCargando(false);
    }
  }

  async function compartirCobro() {
    const d = qrCobro;
    if (!d) {
      return;
    }
    const texto =
      d.modo === "online" && d.url
        ? `Paga tu cuota aquí: ${d.url}`
        : ["Paga tu cuota", d.titular, d.banco, d.tipoCuenta, d.numeroCuenta, d.alias]
            .filter(Boolean)
            .join(" · ");
    try {
      await Share.share({ message: texto });
    } catch {
      // El usuario canceló o no hay app de compartir: no es un error.
    }
  }

  function abrirEditar() {
    mensajeError(null);
    const lat = tarjeta?.latitud ?? latitud;
    const lng = tarjeta?.longitud ?? longitud;
    const actual: CambioClienteInput = {
      ...edicionDesdeTarjeta(tarjeta as ClienteTarjetaPublic),
      latitud: typeof lat === "number" ? lat : undefined,
      longitud: typeof lng === "number" ? lng : undefined,
    };
    setEdicion(actual);
    setEdicionOriginal(actual);
    setModal("editar");
  }

  function cerrarEdicion() {
    const hayCambios =
      Object.keys(camposCambiados(edicion, edicionOriginal)).length > 0;
    if (!hayCambios) {
      setModal("ninguno");
      mensajeError(null);
      return;
    }
    Alert.alert(
      "Descartar cambios",
      "Tienes cambios sin guardar. ¿Deseas descartarlos?",
      [
        { text: "Seguir editando", style: "cancel" },
        {
          text: "Descartar",
          style: "destructive",
          onPress: () => {
            setModal("ninguno");
            mensajeError(null);
          },
        },
      ],
    );
  }

  function abrirEditarUbicacion() {
    setUbicacionMensaje(null);
    setUbicacionDireccion("");
    setUbicacionCampo("negocio");
    const lat = tarjeta?.latitud ?? latitud;
    const lng = tarjeta?.longitud ?? longitud;
    const latDom = tarjeta?.latitudDomicilio ?? latitudDomicilio;
    const lngDom = tarjeta?.longitudDomicilio ?? longitudDomicilio;
    setEdicion((e) => ({
      ...e,
      latitud: typeof lat === "number" ? lat : e.latitud,
      longitud: typeof lng === "number" ? lng : e.longitud,
      latitudDomicilio: typeof latDom === "number" ? latDom : e.latitudDomicilio,
      longitudDomicilio: typeof lngDom === "number" ? lngDom : e.longitudDomicilio,
    }));
    setModal("ubicacion");
  }

  async function buscarUbicacionDireccion() {
    if (!ubicacionDireccion.trim()) {
      setUbicacionMensaje("Escribe una dirección para buscar.");
      return;
    }
    setUbicacionBuscando(true);
    setUbicacionMensaje(null);
    try {
      const resultados = await Location.geocodeAsync(ubicacionDireccion.trim());
      if (resultados.length === 0) {
        setUbicacionMensaje("No se encontró la dirección.");
        return;
      }
      const mejor = resultados[0];
      if (ubicacionCampo === "domicilio") {
        setEdicion((e) => ({
          ...e,
          latitudDomicilio: mejor.latitude,
          longitudDomicilio: mejor.longitude,
        }));
      } else {
        setEdicion((e) => ({
          ...e,
          latitud: mejor.latitude,
          longitud: mejor.longitude,
        }));
      }
    } catch {
      setUbicacionMensaje("No se pudo buscar la dirección.");
    } finally {
      setUbicacionBuscando(false);
    }
  }

  async function guardarUbicacion() {
    const lat = ubicacionCampo === "domicilio" ? edicion.latitudDomicilio : edicion.latitud;
    const lng = ubicacionCampo === "domicilio" ? edicion.longitudDomicilio : edicion.longitud;
    if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      setUbicacionMensaje("Arrastra el marcador para fijar la ubicación.");
      return;
    }
    setUbicacionEnviando(true);
    setUbicacionMensaje(null);
    try {
      const input =
        ubicacionCampo === "domicilio"
          ? { latitudDomicilio: lat, longitudDomicilio: lng }
          : { latitud: lat, longitud: lng };
      await api.actualizarCliente(carteraId, clienteId, input);
      setModal("ninguno");
      mensajeExito("Ubicación actualizada.");
      await cargar();
    } catch (err) {
      if (apiErrorStatus(err) === 401) {
        await logout();
      } else {
        setUbicacionMensaje("No se pudo guardar la ubicación.");
      }
    } finally {
      setUbicacionEnviando(false);
    }
  }

  async function guardarCambioCliente() {
    // Solo valida el documento si la edición lo toca: un cliente sin documento
    // debe poder editar nombre/negocio/teléfono.
    const documentoTocado =
      (edicion.tipoDocumento ?? null) !== (edicionOriginal.tipoDocumento ?? null) ||
      (edicion.numeroDocumento ?? "") !== (edicionOriginal.numeroDocumento ?? "");
    if (documentoTocado) {
      if (
        !edicion.tipoDocumento ||
        !validarNumeroDocumento(
          edicion.tipoDocumento,
          edicion.numeroDocumento ?? "",
        )
      ) {
        mensajeError("El número de documento no es válido para el tipo seleccionado.");
        return;
      }
    }
    if (
      carteraActiva?.config.registroDocumentoCliente &&
      !edicion.tipoDocumento &&
      !edicion.numeroDocumento
    ) {
      mensajeError("Esta cartera exige documento de identidad. Complétalo para guardar.");
      return;
    }
    // Consistencia con el alta: si se toca el teléfono, debe ser válido.
    const telefonoTocado =
      (edicion.telefonoWhatsapp ?? "") !== (edicionOriginal.telefonoWhatsapp ?? "");
    if (telefonoTocado) {
      const errorTelefono = validarTelefonoWhatsapp(edicion.telefonoWhatsapp ?? "");
      if (errorTelefono) {
        mensajeError(errorTelefono);
        return;
      }
    }
    const input = camposCambiados(edicion, edicionOriginal);
    if (Object.keys(input).length === 0) {
      mensajeError("No hay cambios para guardar.");
      return;
    }
    setEditando(true);
    mensajeError(null);
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
        mensajeAviso("Cambio guardado sin conexión. Se enviará al volver la señal.");
      } else {
        mensajeError("Ya hay un cambio pendiente por sincronizar.");
      }
    } catch (err) {
      if (apiErrorStatus(err) === 401) {
        await logout();
      } else {
        mensajeError("No se pudo guardar el cambio.");
      }
    } finally {
      setEditando(false);
    }
  }

  function abrirNuevoPrestamo() {
    mensajeError(null);
    setPrestamoMensaje(null);
    setPrestamoInteres(carteraActiva ? String(carteraActiva.tipoInteres) : "");
    setPrestamoCuotas(carteraActiva ? String(carteraActiva.numCuotas) : "");
    const cupo = carteraActiva?.config.cupoDefault;
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
      await api.crearPrestamo(carteraId, {
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

  async function abrirDetalleCuota(cuotaId: string) {
    if (!prestamoSeleccionado) {
      return;
    }
    setAccionCuota("ninguno");
    setBorrarTarget(null);
    setDetalleCuota(null);
    setDetalleSinConexion(false);
    setDetalleCuotaCargando(true);
    setModal("cuota");
    try {
      setDetalleCuota(
        await api.detalleCuota(carteraId, prestamoSeleccionado.id, cuotaId),
      );
    } catch (err) {
      // Sin señal se puede cobrar igual: el detalle sale del canvas y el pago se encola.
      const desdeCanvas = esErrorDeRed(err) ? detalleDesdeEstadoCuenta(estadoPrestamo, cuotaId) : null;
      setDetalleCuota(desdeCanvas);
      setDetalleSinConexion(desdeCanvas != null);
    } finally {
      setDetalleCuotaCargando(false);
    }
  }

  async function recargarDetalleCuota() {
    if (!prestamoSeleccionado || !detalleCuota) {
      return;
    }
    setDetalleCuotaCargando(true);
    try {
      setDetalleCuota(
        await api.detalleCuota(carteraId, prestamoSeleccionado.id, detalleCuota.cuotaId),
      );
    } catch {
      // Se conserva el detalle previo si falla la recarga.
    } finally {
      setDetalleCuotaCargando(false);
    }
  }

  async function recargarEstadoPrestamo() {
    if (!prestamoSeleccionado) {
      return;
    }
    try {
      setEstadoPrestamo(
        await api.obtenerEstadoCuentaPrestamo(carteraId, prestamoSeleccionado.id),
      );
    } catch {
      // Se conserva el estado previo si falla la recarga.
    }
  }

  async function elegirEvidencia(
    campo: "foto_facial" | "documento_frente" | "documento_reverso",
    fuente: FuenteEvidencia,
  ) {
    // Solo selecciona y previsualiza; la subida ocurre al tocar "Guardar".
    mensajeError(null);
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
      mensajeError("Selecciona una imagen primero.");
      return;
    }
    setEvidenciasEnviando(true);
    mensajeError(null);
    try {
      await api.agregarEvidenciasCliente(carteraId, clienteId, [pendiente]);
      evidenciasCliente.quitar(campo);
      setModal("ninguno");
      mensajeError(
        campo === "foto_facial"
          ? "Foto actualizada."
          : "Documento actualizado.",
      );
      await cargar();
    } catch (err) {
      if (apiErrorStatus(err) === 401) {
        await logout();
      } else if (err instanceof Error && err.message && err.message.startsWith("{")) {
        try {
          const cuerpo = JSON.parse(err.message) as { message?: string | string[] };
          if (Array.isArray(cuerpo.message)) {
            mensajeError(cuerpo.message.join(", "));
          } else {
            mensajeError(cuerpo.message ?? "No se pudo guardar la evidencia.");
          }
        } catch {
          mensajeError("No se pudo guardar la evidencia.");
        }
      } else {
        mensajeError("No se pudo guardar la evidencia.");
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

  const latNegocio = tarjeta.latitud ?? latitud;
  const lngNegocio = tarjeta.longitud ?? longitud;
  const tieneCoordenadas =
    typeof latNegocio === "number" && typeof lngNegocio === "number";
  const prestamosVisibles =
    prestamoSeleccionadoId == null
      ? prestamos
      : prestamos.filter((p) => p.id === prestamoSeleccionadoId);
  const cuotasCanvas = estadoPrestamo ? clasificarCuotas(estadoPrestamo.cuotas) : [];
  const docFrenteUrl = urlArchivo(tarjeta.documentoFrenteUrl);
  const docReversoUrl = urlArchivo(tarjeta.documentoReversoUrl);

  return (
    <>
      <SafeAreaView style={styles.contenedor} edges={["left", "right", "bottom"]}>
        <HeaderApp titulo="Información del cliente" />
        <ScrollView contentContainerStyle={styles.scroll}>
        {mensaje && modal === "ninguno" ? (
          <BannerMensaje texto={mensaje} tipo={mensajeTono} />
        ) : null}

        {/* Tarjeta cédula/pasaporte: header con fondo por clasificación, foto grande
            a la izquierda y datos a la derecha; documentos como iconos grandes. */}
        <View testID="tarjeta-cedula" style={styles.tarjeta}>
          <View
            testID="header-tarjeta-cliente"
            style={[styles.tarjetaHeader, { backgroundColor: colorDeEstado(tarjeta.color) }]}
          >
            <Text accessibilityRole="header" style={styles.tarjetaHeaderNombre} numberOfLines={1}>
              {tarjeta.nombre}
            </Text>
            <Pressable
              testID="btn-editar-cliente"
              accessibilityRole="button"
              accessibilityLabel="Editar cliente"
              android_ripple={{ color: kit.ripple.relleno }}
              style={styles.tarjetaHeaderEditar}
              onPress={abrirEditar}
            >
              <MaterialIcons name="edit" size={18} color={kit.relleno.sobrePrimario} />
              <Text style={styles.tarjetaHeaderEditarTexto}>Editar</Text>
            </Pressable>
          </View>

          {/* Foto grande a la izquierda + datos a la derecha */}
          <View style={styles.filaCedula}>
            <Pressable
              testID="btn-avatar"
              accessibilityRole="button"
              accessibilityLabel={`Foto de ${tarjeta.nombre}`}
              onPress={() => setModal("avatar")}
            >
              <Avatar nombre={tarjeta.nombre} fotoUrl={tarjeta.fotoUrl} size={92} />
            </Pressable>
            <View style={styles.datosCedula}>
              {tarjeta.negocio ? (
                <Text style={styles.datoCedulaLineal}>
                  <Text style={styles.datoCedulaEtiqueta}>Negocio: </Text>
                  <Text style={styles.datoCedulaValor}>{tarjeta.negocio}</Text>
                </Text>
              ) : null}
              {tarjeta.tipoPago ? (
                <Text style={styles.datoCedulaLineal}>
                  <Text style={styles.datoCedulaEtiqueta}>Tipo de pago: </Text>
                  <Text style={styles.datoCedulaValor}>{tarjeta.tipoPago}</Text>
                </Text>
              ) : null}
              <Text style={styles.datoCedulaLineal}>
                <Text style={styles.datoCedulaEtiqueta}>Saldo pendiente: </Text>
                <Text style={styles.datoCedulaValor}>{tarjeta.saldoPendiente}</Text>
              </Text>
              <Text style={styles.datoCedulaLineal}>
                <Text style={styles.datoCedulaEtiqueta}>Mora: </Text>
                <Text style={styles.datoCedulaValor}>{tarjeta.diasMora} días</Text>
              </Text>
              <Text style={styles.datoCedulaLineal}>
                <Text style={styles.datoCedulaEtiqueta}>WhatsApp: </Text>
                <Text style={styles.datoCedulaValor}>{tarjeta.telefonoWhatsapp}</Text>
              </Text>
              <Text testID="dato-documento" style={styles.datoCedulaLineal}>
                <Text style={styles.datoCedulaEtiqueta}>Documento: </Text>
                <Text style={styles.datoCedulaValor}>
                  {tarjeta.numeroDocumento
                    ? `${
                        tarjeta.tipoDocumento
                          ? ETIQUETAS_TIPO_DOCUMENTO[tarjeta.tipoDocumento]
                          : "Documento"
                      } ${tarjeta.numeroDocumento}`
                    : "—"}
                </Text>
              </Text>
            </View>
          </View>

          {/* Dos iconos grandes: documento frente y reverso */}
          <View style={styles.documentosFila}>
            <Pressable
              testID="doc-frente"
              accessibilityRole="button"
              accessibilityLabel={`Documento, frente: ${docFrenteUrl ? "verificado" : "pendiente"}`}
              style={styles.miniatura}
              onPress={() => {
                setModalDocumento("frente");
                setModal("documento");
              }}
            >
              <View
                testID="doc-frente-icono"
                style={[
                  styles.miniaturaIconoMarco,
                  docFrenteUrl
                    ? styles.miniaturaIconoVerificado
                    : styles.miniaturaIconoPendiente,
                ]}
              >
                <MaterialIcons
                  name="badge"
                  size={40}
                  color={docFrenteUrl ? c.statusSuccessFg : c.textSoft}
                />
              </View>
              {docFrenteUrl ? (
                <Badge testID="doc-frente-badge" tone="success" icon="check" label="Verificado" />
              ) : (
                <Badge testID="doc-frente-badge" tone="warning" icon="schedule" label="Pendiente" />
              )}
              <Text style={styles.miniaturaEtiqueta}>Frente</Text>
            </Pressable>
            <Pressable
              testID="doc-reverso"
              accessibilityRole="button"
              accessibilityLabel={`Documento, reverso: ${docReversoUrl ? "verificado" : "pendiente"}`}
              style={styles.miniatura}
              onPress={() => {
                setModalDocumento("reverso");
                setModal("documento");
              }}
            >
              <View
                testID="doc-reverso-icono"
                style={[
                  styles.miniaturaIconoMarco,
                  docReversoUrl
                    ? styles.miniaturaIconoVerificado
                    : styles.miniaturaIconoPendiente,
                ]}
              >
                <MaterialIcons
                  name="credit-card"
                  size={40}
                  color={docReversoUrl ? c.statusSuccessFg : c.textSoft}
                />
              </View>
              {docReversoUrl ? (
                <Badge testID="doc-reverso-badge" tone="success" icon="check" label="Verificado" />
              ) : (
                <Badge testID="doc-reverso-badge" tone="warning" icon="schedule" label="Pendiente" />
              )}
              <Text style={styles.miniaturaEtiqueta}>Reverso</Text>
            </Pressable>
          </View>

          {/* Fila de acciones: cómo llegar + editar ubicación */}
          {tieneCoordenadas ? (
            <View style={styles.footerTarjeta}>
              <Button
                testID="btn-como-llegar"
                variant="secondary"
                size="sm"
                iconLeft="directions"
                iconRight={mapaAbierto ? "expand-less" : "expand-more"}
                onPress={() => setMapaAbierto((abierto) => !abierto)}
              >
                Cómo llegar
              </Button>
              <Button
                testID="btn-editar-ubicacion"
                variant="secondary"
                size="sm"
                iconLeft="edit-location"
                onPress={abrirEditarUbicacion}
              >
                Editar ubicación
              </Button>
            </View>
          ) : null}
        </View>

        {mapaAbierto && tieneCoordenadas ? (
          <View style={styles.seccionMapa}>
            <MapaCliente latitud={latNegocio} longitud={lngNegocio} nombre={tarjeta.nombre} />
            <View style={styles.navegacion}>
              <Button
                testID="navegar-maps"
                variant="secondary"
                iconLeft="map"
                fullWidth
                style={styles.botonNavegar}
                onPress={() => abrirNavegacion(latNegocio, lngNegocio, "maps")}
              >
                Google Maps
              </Button>
              <Button
                testID="navegar-waze"
                variant="secondary"
                iconLeft="navigation"
                fullWidth
                style={styles.botonNavegar}
                onPress={() => abrirNavegacion(latNegocio, lngNegocio, "waze")}
              >
                Waze
              </Button>
            </View>
          </View>
        ) : null}

        {/* Notificación de próximo cobro */}
        {proximoCobro.total > 0 ? (
          <View testID="notif-proximo-cobro" style={styles.notificacion}>
            <MaterialIcons name="notifications-active" size={20} color={c.statusInfoFg} />
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
            <Text accessibilityRole="header" style={styles.seccionTitulo}>Préstamos</Text>
            <Button
              testID="btn-nuevo-prestamo"
              variant="ghost"
              size="sm"
              accessibilityHint="Registra un préstamo nuevo para el cliente"
              disabled={!offline.isOnline}
              onPress={abrirNuevoPrestamo}
            >
              + Nuevo
            </Button>
          </View>

          {!offline.isOnline ? (
            <View style={styles.filaAviso}>
              <MaterialIcons name="cloud-off" size={16} color={c.statusWarningFg} />
              <Text testID="prestamos-requiere-conexion" style={styles.requiereConexion}>
                Requiere conexión para registrar préstamos.
              </Text>
            </View>
          ) : null}

          {prestamosVisibles.length === 0 ? (
            <Text style={styles.sinPrestamos}>Este cliente no tiene préstamos.</Text>
          ) : (
            prestamosVisibles.map((p) => {
              const seleccionado = p.id === prestamoSeleccionadoId;
              return (
                <Pressable
                  key={p.id}
                  testID={`prestamo-item-${p.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: seleccionado }}
                  android_ripple={{ color: kit.ripple.superficie }}
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
                    <Text style={styles.prestamoEstatus}>{etiquetaEstatus(p.estatus)}</Text>
                    {pagosPendientes.prestamos.has(String(p.id)) ? (
                      <View style={styles.badgePendiente}>
                        <Badge
                          testID={`pendiente-prestamo-${p.id}`}
                          tone="warning"
                          icon="cloud-upload"
                          label="Pendiente"
                        />
                      </View>
                    ) : null}
                  </View>
                  {seleccionado ? (
                    <View testID={`check-prestamo-${p.id}`}>
                      <MaterialIcons name="check-circle" size={22} color={c.statusSuccessFg} />
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
            <View style={styles.detalleTituloFila}>
              <Pressable
                testID="btn-whatsapp"
                accessibilityRole="button"
                accessibilityLabel="Compartir estado del préstamo por WhatsApp"
                accessibilityState={{ disabled: compartiendo, busy: compartiendo }}
                android_ripple={{ color: kit.ripple.superficie, borderless: true, radius: shDensity.controlLg / 2 }}
                style={styles.iconoWhatsApp}
                disabled={compartiendo}
                onPress={() => void compartirDetalle()}
              >
                {compartiendo ? (
                  <ActivityIndicator size="small" color={c.statusSuccessFg} />
                ) : (
                  <MaterialIcons name="chat" size={20} color={c.statusSuccessFg} />
                )}
              </Pressable>
              <Text accessibilityRole="header" style={styles.detalleTitulo}>
                Préstamo #{prestamoSeleccionado.id}
              </Text>
            </View>
            {estadoPrestamoCargando ? (
              <ActivityIndicator style={styles.detalleCarga} color={c.link} />
            ) : estadoPrestamo ? (
              <View
                ref={refCanvas}
                collapsable={false}
                testID="canvas-prestamo"
                style={styles.canvasScreenshot}
              >
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
                        {pagosPendientes.cuotas.has(String(cuota.cuotaId)) ? (
                          <Badge
                            testID={`pendiente-cuota-${cuota.numeroCuota}`}
                            tone="warning"
                            icon="cloud-upload"
                            label="Pendiente"
                          />
                        ) : null}
                        <Text style={styles.cuadroValor} {...UNA_LINEA}>
                          {cuota.valorEsperado} {estadoPrestamo.moneda}
                        </Text>
                        <Text style={styles.cuadroFecha} {...UNA_LINEA}>{fechaCortaCuota(cuota.fechaVencimiento)}</Text>
                        {cuota.saldoPendiente > 0 && cuota.saldoPendiente < cuota.valorEsperado ? (
                          <Text style={styles.cuadroSaldo} {...UNA_LINEA}>
                            Falta: {cuota.saldoPendiente}
                          </Text>
                        ) : null}
                        {cuota.abonosAcumulados > 0 ? (
                          <Text style={styles.cuadroAbono} {...UNA_LINEA}>
                            Abonado: {cuota.abonosAcumulados}
                          </Text>
                        ) : null}
                        <View style={[styles.cuadroEtiqueta, { borderColor: color.borde }]}>
                          <Text style={[styles.cuadroEtiquetaTexto, { color: color.borde }]} {...UNA_LINEA}>
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
          </View>
        ) : null}
      </ScrollView>
      </SafeAreaView>

      {/* Modal: editar cliente */}
      <ModalConFooter
        visible={modal === "editar"}
        titulo="Editar cliente"
        onCerrar={cerrarEdicion}
        onCancelar={cerrarEdicion}
        onConfirmar={() => void guardarCambioCliente()}
        confirmando={editando}
        confirmarTestID="guardar-cambio-cliente"
        testID="editar-cliente-form"
      >
        <CampoModal
          testID="editar-nombre"
          label="Nombre"
          placeholder="Nombre"
          value={edicion.nombre ?? ""}
          onChangeText={(v) => setEdicion((e) => ({ ...e, nombre: v }))}
        />
        <CampoModal
          testID="editar-apellido"
          label="Apellido"
          placeholder="Apellido"
          value={edicion.apellido ?? ""}
          onChangeText={(v) => setEdicion((e) => ({ ...e, apellido: v }))}
        />
        <CampoModal
          testID="editar-negocio"
          label="Negocio"
          placeholder="Negocio"
          value={edicion.negocio ?? ""}
          onChangeText={(v) => setEdicion((e) => ({ ...e, negocio: v }))}
        />
        <Text style={styles.label}>WhatsApp</Text>
        <CampoTelefono
          testID="editar-telefono"
          valor={edicion.telefonoWhatsapp ?? ""}
          onChange={(v) => setEdicion((e) => ({ ...e, telefonoWhatsapp: v }))}
          placeholder="Número de WhatsApp"
        />
        <Text style={styles.label}>Tipo de documento</Text>
        <View style={styles.chips}>
          {TIPOS_DOCUMENTO.map((tipo) => (
            <Pressable
              key={tipo}
              testID={`editar-doc-tipo-${tipo}`}
              hitSlop={4}
              accessibilityRole="radio"
              style={[
                styles.chip,
                edicion.tipoDocumento === tipo && styles.chipActivo,
              ]}
              onPress={() => setEdicion((e) => ({ ...e, tipoDocumento: tipo }))}
            >
              <Text
                style={
                  edicion.tipoDocumento === tipo
                    ? styles.chipTextoActivo
                    : styles.chipTexto
                }
              >
                {ETIQUETAS_TIPO_DOCUMENTO[tipo]}
              </Text>
            </Pressable>
          ))}
        </View>
        <CampoModal
          testID="editar-doc-numero"
          label="Número de documento"
          placeholder="Número de documento"
          autoCapitalize="characters"
          value={edicion.numeroDocumento ?? ""}
          onChangeText={(v) => setEdicion((e) => ({ ...e, numeroDocumento: v }))}
        />
        <Text style={styles.notaUbicacion}>
          La ubicación del negocio y del domicilio se edita desde la tarjeta del
          cliente (opción Editar ubicación).
        </Text>
        {mensaje && modal === "editar" ? (
          <View testID="mensaje-editar" style={styles.mensajeCuota}>
            <BannerMensaje texto={mensaje} tipo={mensajeTono} />
          </View>
        ) : null}
      </ModalConFooter>

      {/* Modal: editar ubicación (N6) */}
      <ModalConFooter
        visible={modal === "ubicacion"}
        titulo="Editar ubicación"
        onCerrar={() => {
          setModal("ninguno");
          setUbicacionMensaje(null);
        }}
        onCancelar={() => {
          setModal("ninguno");
          setUbicacionMensaje(null);
        }}
        onConfirmar={() => void guardarUbicacion()}
        confirmando={ubicacionEnviando}
        confirmarTestID="guardar-ubicacion"
        testID="ubicacion-form"
      >
        <View style={styles.chips}>
          <Pressable
            testID="ubicacion-negocio"
            hitSlop={4}
            accessibilityRole="radio"
            style={[styles.chip, ubicacionCampo === "negocio" && styles.chipActivo]}
            onPress={() => {
              setUbicacionCampo("negocio");
              setUbicacionMensaje(null);
            }}
          >
            <Text style={ubicacionCampo === "negocio" ? styles.chipTextoActivo : styles.chipTexto}>
              Negocio
            </Text>
          </Pressable>
          <Pressable
            testID="ubicacion-domicilio"
            hitSlop={4}
            accessibilityRole="radio"
            style={[styles.chip, ubicacionCampo === "domicilio" && styles.chipActivo]}
            onPress={() => {
              setUbicacionCampo("domicilio");
              setUbicacionMensaje(null);
            }}
          >
            <Text style={ubicacionCampo === "domicilio" ? styles.chipTextoActivo : styles.chipTexto}>
              Domicilio
            </Text>
          </Pressable>
        </View>

        <View style={styles.filaBusqueda}>
          <TextField
            testID="ubicacion-direccion"
            accessibilityLabel="Buscar por dirección"
            style={styles.inputBusqueda}
            placeholder="Buscar por dirección"
            value={ubicacionDireccion}
            onChangeText={setUbicacionDireccion}
          />
          <Pressable
            testID="ubicacion-buscar"
            accessibilityRole="button"
            accessibilityLabel="Buscar dirección"
            accessibilityState={{ disabled: ubicacionBuscando, busy: ubicacionBuscando }}
            android_ripple={{ color: kit.ripple.relleno }}
            style={styles.botonBuscar}
            disabled={ubicacionBuscando}
            onPress={() => void buscarUbicacionDireccion()}
          >
            {ubicacionBuscando ? (
              <ActivityIndicator color={kit.relleno.sobrePrimario} size="small" />
            ) : (
              <MaterialIcons name="search" size={20} color={kit.relleno.sobrePrimario} />
            )}
          </Pressable>
        </View>

        <MapaPin
          testID="mapa-pin-ubicacion"
          latitud={
            ubicacionCampo === "domicilio"
              ? edicion.latitudDomicilio ?? COORD_DEFAULT.lat
              : edicion.latitud ?? COORD_DEFAULT.lat
          }
          longitud={
            ubicacionCampo === "domicilio"
              ? edicion.longitudDomicilio ?? COORD_DEFAULT.lng
              : edicion.longitud ?? COORD_DEFAULT.lng
          }
          onChange={(latU, lngU) => {
            if (ubicacionCampo === "domicilio") {
              setEdicion((e) => ({
                ...e,
                latitudDomicilio: latU,
                longitudDomicilio: lngU,
              }));
            } else {
              setEdicion((e) => ({ ...e, latitud: latU, longitud: lngU }));
            }
          }}
        />

        {ubicacionMensaje ? (
          <Text testID="mensaje-ubicacion" style={styles.mensajeModal}>
            {ubicacionMensaje}
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
        <CampoModal
          testID="prestamo-valor"
          label="Valor"
          placeholder="Valor"
          keyboardType="decimal-pad"
          value={prestamoValor}
          onChangeText={setPrestamoValor}
        />
        <CampoModal
          testID="prestamo-cuotas"
          label="Número de cuotas"
          placeholder="Número de cuotas"
          keyboardType="number-pad"
          value={prestamoCuotas}
          onChangeText={setPrestamoCuotas}
        />
        <CampoModal
          testID="prestamo-dias"
          label="Días entre cuotas"
          placeholder="Días entre cuotas"
          keyboardType="number-pad"
          value={prestamoDias}
          onChangeText={setPrestamoDias}
        />
        <CampoModal
          testID="prestamo-interes"
          label="Tipo de interés (%) — opcional"
          placeholder="Tipo de interés (%) — opcional"
          keyboardType="decimal-pad"
          value={prestamoInteres}
          onChangeText={setPrestamoInteres}
          editable={!bloquearInteres}
        />
        {prestamoMensaje ? <Text style={styles.mensaje}>{prestamoMensaje}</Text> : null}
      </ModalConFooter>

      {/* Modal: avatar */}
      <EvidenciasModal
        visible={modal === "avatar"}
        titulo="Foto del cliente"
        pendiente={evidenciasSeleccionadasPara("foto_facial")[0]}
        urlActual={tarjeta.fotoUrl ? urlArchivo(tarjeta.fotoUrl) : null}
        cargando={evidenciasCliente.cargando}
        confirmando={evidenciasEnviando}
        error={evidenciasCliente.error}
        mensaje={mensaje}
        iconoVacio="person"
        textoVacio="Este cliente no tiene foto."
        testID="avatar-modal"
        prefijoTestID="avatar"
        guardarTestID="avatar-guardar"
        onElegir={(fuente) => void elegirEvidencia("foto_facial", fuente)}
        onCerrar={() => {
          setModal("ninguno");
          evidenciasCliente.quitar("foto_facial");
          evidenciasCliente.resetError();
          mensajeError(null);
        }}
        onConfirmar={() => void guardarEvidenciaSeleccionada("foto_facial")}
      />

      {/* Modal: documento */}
      <EvidenciasModal
        visible={modal === "documento"}
        titulo={modalDocumento === "frente" ? "Documento — frente" : "Documento — reverso"}
        pendiente={
          evidenciasSeleccionadasPara(
            modalDocumento === "reverso" ? "documento_reverso" : "documento_frente",
          )[0]
        }
        urlActual={modalDocumento === "reverso" ? docReversoUrl : docFrenteUrl}
        cargando={evidenciasCliente.cargando}
        confirmando={evidenciasEnviando}
        error={evidenciasCliente.error}
        mensaje={mensaje}
        iconoVacio="badge"
        textoVacio={
          modalDocumento === "frente"
            ? "El frente del documento aún no está cargado."
            : "El reverso del documento aún no está disponible."
        }
        testID="documento-modal"
        prefijoTestID="documento"
        guardarTestID="documento-guardar"
        onElegir={(fuente) =>
          void elegirEvidencia(
            modalDocumento === "reverso" ? "documento_reverso" : "documento_frente",
            fuente,
          )
        }
        onCerrar={() => {
          setModal("ninguno");
          evidenciasCliente.quitar(
            modalDocumento === "reverso" ? "documento_reverso" : "documento_frente",
          );
          evidenciasCliente.resetError();
          mensajeError(null);
        }}
        onConfirmar={() =>
          void guardarEvidenciaSeleccionada(
            modalDocumento === "reverso" ? "documento_reverso" : "documento_frente",
          )
        }
      />

      {/* Modal: detalle de cuota (rediseñada): detalle con scroll, acciones abajo,
      formularios desplegables y borrar pago/abono (solo no liquidado). */}
      <ModalConFooter
        visible={modal === "cuota"}
        titulo="Detalle de cuota"
        onCerrar={cerrarCuota}
        testID="cuota-dialog"
        aviso={
          toastPago ? (
            <Toast key={toastPago.id} tone="success" message={toastPago.mensaje} testID="toast-pago" />
          ) : null
        }
      >
        {detalleCuotaCargando ? (
          <ActivityIndicator color={c.link} />
        ) : detalleCuota ? (
          (() => {
            const cuotaAccionable = esPendienteOAtrasada(detalleCuota.estatus);
            const puedeEliminarPago = Boolean(carteraActiva?.config.eliminarPagosApk);
            const puedeEliminarAbono = Boolean(carteraActiva?.config.eliminarAbonosApk);
            return (
              <>
                <ScrollView style={styles.cuotaScroll}>
                  <View style={styles.cuotaResumen}>
                    <Text style={styles.cuotaLinea}>
                      Cuota {detalleCuota.numeroCuota} — {detalleCuota.valorEsperado} (
                      {etiquetaEstatus(detalleCuota.estatus)})
                    </Text>
                    <Text style={styles.cuotaFecha}>
                      Vence {detalleCuota.fechaVencimiento}
                    </Text>
                    {pagosPendientes.cuotas.has(String(detalleCuota.cuotaId)) ? (
                      <Badge
                        testID="pendiente-detalle-cuota"
                        tone="warning"
                        icon="cloud-upload"
                        label="Pendiente"
                      />
                    ) : null}
                  </View>

                  {detalleSinConexion ? (
                    <View testID="cuota-sin-conexion" style={styles.mensajeCuota}>
                      <BannerMensaje
                        tipo="aviso"
                        texto="Sin señal: estos son los datos de la última carga. El pago se guarda en el teléfono y se envía al volver la señal."
                      />
                    </View>
                  ) : null}

                  <Text style={styles.cuotaSubtitulo}>Pagos</Text>
                  {detalleCuota.pagos.length === 0 ? (
                    <Text style={styles.cuotaVacio}>Sin pagos registrados.</Text>
                  ) : (
                    detalleCuota.pagos.map((pago) => (
                      <View key={pago.id} style={styles.filaItemBorrable}>
                        <View style={styles.filaItemTexto}>
                          <Text style={styles.pagoTexto}>
                            ${pago.valor} · {pago.metodoPago ?? "—"}
                          </Text>
                          <Text style={styles.pagoFecha}>
                            {formatearFechaHora(pago.fechaHora)}
                            {pago.liquidado ? " · liquidado" : ""}
                          </Text>
                        </View>
                        {!pago.liquidado && puedeEliminarPago ? (
                          <IconButton
                            testID={`borrar-pago-${pago.id}`}
                            icon="delete-outline"
                            label={`Eliminar pago de $${pago.valor}`}
                            tone="danger"
                            size="sm"
                            disabled={!offline.isOnline}
                            onPress={() => iniciarBorrarPago(pago)}
                          />
                        ) : null}
                      </View>
                    ))
                  )}

                  <Text style={styles.cuotaSubtitulo}>Abonos del préstamo</Text>
                  {detalleCuota.abonos.length === 0 ? (
                    <Text style={styles.cuotaVacio}>Sin abonos registrados.</Text>
                  ) : (
                    detalleCuota.abonos.map((abono) => (
                      <View key={abono.id} style={styles.filaItemBorrable}>
                        <View style={styles.filaItemTexto}>
                          <Text style={styles.pagoTexto}>${abono.valor}</Text>
                          <Text style={styles.pagoFecha}>
                            {formatearFechaHora(abono.fechaHora)}
                            {abono.liquidado ? " · liquidado" : ""}
                          </Text>
                        </View>
                        {!abono.liquidado && puedeEliminarAbono ? (
                          <IconButton
                            testID={`borrar-abono-${abono.id}`}
                            icon="delete-outline"
                            label={`Eliminar abono de $${abono.valor}`}
                            tone="danger"
                            size="sm"
                            disabled={!offline.isOnline}
                            onPress={() => iniciarBorrarAbono(abono)}
                          />
                        ) : null}
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

                {mensaje ? (
                  <View testID="cuota-mensaje" style={styles.mensajeCuota}>
                    <BannerMensaje texto={mensaje} tipo={mensajeTono} />
                  </View>
                ) : null}

                {/* Acciones en la parte inferior (solo cuota no paga) */}
                {cuotaAccionable ? (
                  <View style={styles.cuotaAcciones}>
                    <Button
                      testID="accion-pago"
                      variant={accionCuota === "pago" ? "primary" : "secondary"}
                      iconLeft="payments"
                      fullWidth
                      style={styles.cuotaAccion}
                      onPress={() => toggleAccionCuota("pago")}
                    >
                      Registrar pago
                    </Button>
                    <Button
                      testID="accion-no-pago"
                      variant={accionCuota === "no_pago" ? "primary" : "secondary"}
                      iconLeft="block"
                      fullWidth
                      style={styles.cuotaAccion}
                      onPress={() => toggleAccionCuota("no_pago")}
                    >
                      No pago
                    </Button>
                    {carteraActiva?.pagoQrActivo ? (
                      <Button
                        testID="accion-qr"
                        variant="secondary"
                        iconLeft="qr-code"
                        fullWidth
                        style={styles.cuotaAccion}
                        onPress={() => void abrirCobroQr()}
                      >
                        Cobro con QR
                      </Button>
                    ) : null}
                  </View>
                ) : null}

                {/* Confirmación de borrado de pago/abono */}
                {borrarTarget ? (
                  <View style={styles.borrarPanel} testID="borrar-confirm">
                    <Text style={styles.cuotaLinea}>
                      Eliminar {borrarTarget.tipo} de ${borrarTarget.valor} — este cambio
                      requiere tu contraseña y un motivo.
                    </Text>
                    <Text style={styles.label}>Password</Text>
                    <TextField
                      testID="borrar-password"
                      accessibilityLabel="Password"
                      placeholder="Tu contraseña"
                      secureTextEntry
                      value={borrarPassword}
                      onChangeText={setBorrarPassword}
                    />
                    <Text style={styles.label}>Motivo</Text>
                    <TextField
                      testID="borrar-motivo"
                      accessibilityLabel="Motivo"
                      placeholder="Motivo de la eliminación"
                      value={borrarMotivo}
                      onChangeText={setBorrarMotivo}
                    />
                    {borrarMensaje ? (
                      <Text style={styles.mensajeModal}>{borrarMensaje}</Text>
                    ) : null}
                    <View style={styles.borrarAcciones}>
                      <Button
                        testID="borrar-cancelar"
                        variant="secondary"
                        fullWidth
                        style={styles.botonLinea}
                        disabled={borrando}
                        onPress={cancelarBorrar}
                      >
                        Cancelar
                      </Button>
                      <Button
                        testID="borrar-confirmar"
                        variant="danger"
                        fullWidth
                        style={styles.botonLinea}
                        loading={borrando}
                        onPress={() => void confirmarBorrar()}
                      >
                        Eliminar
                      </Button>
                    </View>
                  </View>
                ) : null}

                {/* Formulario desplegable: registrar pago (pago de cuota / abono parcial) */}
                {accionCuota === "pago" ? (
                  <View testID="form-pago" style={styles.formPanel}>
                    <Text style={styles.label}>Tipo</Text>
                    <View style={styles.chips}>
                      <Pressable
                        testID="tipo-cuota"
                        hitSlop={4}
                        accessibilityRole="radio"
                        style={[styles.chip, tipoPago === "cuota" && styles.chipActivo]}
                        onPress={() => setTipoPago("cuota")}
                      >
                        <Text
                          style={tipoPago === "cuota" ? styles.chipTextoActivo : styles.chipTexto}
                        >
                          Pago de cuota
                        </Text>
                      </Pressable>
                      <Pressable
                        testID="tipo-abono"
                        hitSlop={4}
                        accessibilityRole="radio"
                        style={[styles.chip, tipoPago === "abono" && styles.chipActivo]}
                        onPress={() => setTipoPago("abono")}
                      >
                        <Text
                          style={tipoPago === "abono" ? styles.chipTextoActivo : styles.chipTexto}
                        >
                          Abono parcial
                        </Text>
                      </Pressable>
                    </View>
                    <Text style={styles.label}>Valor</Text>
                    <TextField
                      testID="pago-valor"
                      accessibilityLabel="Valor"
                      placeholder="Valor"
                      keyboardType="decimal-pad"
                      value={valor}
                      onChangeText={setValor}
                    />
                    <Text style={styles.label}>Método</Text>
                    <View style={styles.chips}>
                      {metodosDisponibles.map((metodo) => (
                        <Pressable
                          key={metodo}
                          hitSlop={4}
                          accessibilityRole="radio"
                          style={[styles.chip, metodoPago === metodo && styles.chipActivo]}
                          onPress={() => setMetodoPago(metodo)}
                        >
                          <Text
                            style={metodoPago === metodo ? styles.chipTextoActivo : styles.chipTexto}
                          >
                            {metodo}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <Button
                      testID="guardar-pago-cuota"
                      variant="primary"
                      size="lg"
                      fullWidth
                      loading={enviando}
                      onPress={() => void enviarAccionCuota()}
                    >
                      {tipoPago === "cuota" ? "Registrar pago" : "Registrar abono"}
                    </Button>
                  </View>
                ) : null}

                {/* Formulario desplegable: registrar no pago */}
                {accionCuota === "no_pago" ? (
                  <View testID="form-no-pago" style={styles.formPanel}>
                    <Text style={styles.label}>Motivo de no pago</Text>
                    <View style={styles.chips}>
                      {MOTIVOS_NO_PAGO.map((motivo) => (
                        <Pressable
                          key={motivo}
                          hitSlop={4}
                          accessibilityRole="radio"
                          style={[styles.chip, motivoNoPago === motivo && styles.chipActivo]}
                          onPress={() => setMotivoNoPago(motivo)}
                        >
                          <Text
                            style={
                              motivoNoPago === motivo ? styles.chipTextoActivo : styles.chipTexto
                            }
                          >
                            {motivo}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    {motivoNoPago === "compromiso_de_pago" ? (
                      <>
                        <Text style={styles.label}>Fecha prometida</Text>
                        <TextField
                          testID="fecha-prometida"
                          accessibilityLabel="Fecha prometida"
                          placeholder="AAAA-MM-DD"
                          autoCapitalize="none"
                          value={fechaPrometida}
                          onChangeText={setFechaPrometida}
                        />
                        <Text style={styles.label}>Valor prometido</Text>
                        <TextField
                          testID="valor-prometido"
                          accessibilityLabel="Valor prometido"
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
                    <Button
                      testID="guardar-no-pago"
                      variant="primary"
                      size="lg"
                      fullWidth
                      loading={enviando}
                      onPress={() => void enviarAccionCuota()}
                    >
                      Registrar visita
                    </Button>
                  </View>
                ) : null}

                </ScrollView>
              </>
            );
          })()
        ) : (
          <Text style={styles.errorTexto}>No se pudo cargar el detalle de la cuota.</Text>
        )}
      </ModalConFooter>

      {/* Cobro con QR / pago en línea (ADR-0067) */}
      <ModalConFooter
        visible={qrAbierto}
        titulo="Cobro con QR"
        onCerrar={() => setQrAbierto(false)}
        onCancelar={() => setQrAbierto(false)}
        onConfirmar={() => void compartirCobro()}
        labelConfirmar="Compartir"
        confirmarTestID="qr-compartir"
        testID="cobro-qr"
      >
        {qrCargando ? (
          <ActivityIndicator color={c.link} />
        ) : qrMensaje ? (
          <Text testID="qr-mensaje" style={styles.mensajeModal}>
            {qrMensaje}
          </Text>
        ) : qrCobro ? (
          <>
            <Text style={styles.cuotaLinea}>Monto: {qrCobro.monto}</Text>
            {qrCobro.qrPng ? (
              <Image
                testID="qr-imagen"
                source={{ uri: qrCobro.qrPng }}
                style={styles.qrImagen}
              />
            ) : null}
            {qrCobro.modo === "online" && qrCobro.url ? (
              <Text style={styles.cuotaLinea}>{qrCobro.url}</Text>
            ) : null}
            {qrCobro.modo === "informativo" ? (
              <>
                <Text style={styles.cuotaLinea}>Titular: {qrCobro.titular}</Text>
                <Text style={styles.cuotaLinea}>
                  Banco: {qrCobro.banco} {qrCobro.tipoCuenta}
                </Text>
                <Text style={styles.cuotaLinea}>Cuenta: {qrCobro.numeroCuenta}</Text>
                {qrCobro.alias ? (
                  <Text style={styles.cuotaLinea}>Alias: {qrCobro.alias}</Text>
                ) : null}
                <Text style={styles.cuotaLinea}>{qrCobro.nota}</Text>
              </>
            ) : null}
          </>
        ) : null}
      </ModalConFooter>
    </>
  );
}

function crearEstilos({ c, relleno }: KitTema) {
  // El canvas de cuotas se comparte como imagen: siempre en el tema claro.
  const lienzo = CANVAS.c;
  return StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: c.bg },
  scroll: { padding: shSpace[4], gap: shSpace[3] },
  tarjetaHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    margin: -shSpace[4],
    marginBottom: shSpace[4],
    paddingLeft: shSpace[4],
    paddingRight: shSpace[2],
    paddingVertical: shSpace[1],
    borderTopLeftRadius: shRadius.lg,
    borderTopRightRadius: shRadius.lg,
  },
  tarjetaHeaderNombre: { ...shType.block, color: relleno.sobrePrimario, flex: 1 },
  tarjetaHeaderEditar: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[1],
    minHeight: shDensity.controlLg,
    paddingHorizontal: shSpace[2],
    borderRadius: shRadius.sm,
    overflow: "hidden",
  },
  tarjetaHeaderEditarTexto: { ...shType.label, fontFamily: shType.block.fontFamily, color: relleno.sobrePrimario },
  filaCedula: { flexDirection: "row", gap: shSpace[4], alignItems: "flex-start" },
  datosCedula: { flex: 1, gap: 6 },
  datoCedulaLineal: { ...shType.dense, color: c.text, flexWrap: "wrap" },
  datoCedulaEtiqueta: { fontFamily: shType.label.fontFamily, color: c.textMuted },
  datoCedulaValor: { fontFamily: shType.block.fontFamily, color: c.text },
  documentosFila: { flexDirection: "row", gap: 14, marginTop: shSpace[4] },
  miniaturaIconoMarco: {
    width: 96,
    height: 64,
    borderRadius: shRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  miniaturaIconoVerificado: {
    borderColor: c.statusSuccessBorder,
    backgroundColor: c.statusSuccessBg,
  },
  miniaturaIconoPendiente: {
    borderColor: c.border,
    borderStyle: "dashed",
    backgroundColor: c.bg,
  },
  mensajeModal: { ...shType.dense, color: c.statusDangerFg, marginTop: shSpace[2] },
  mensajeCuota: { marginTop: shSpace[2] },
  tarjeta: {
    backgroundColor: c.surface,
    borderRadius: shRadius.lg,
    borderCurve: "continuous",
    padding: shSpace[4],
    overflow: "hidden",
    boxShadow: c.elev1,
    borderWidth: 1,
    borderColor: c.borderSoft,
    gap: 6,
  },
  miniatura: { alignItems: "center", gap: shSpace[1], flex: 1, minHeight: shDensity.controlLg },
  miniaturaEtiqueta: { ...shType.caption, fontFamily: shType.label.fontFamily, color: c.textMuted },
  badgePendiente: { marginTop: shSpace[1] },
  footerTarjeta: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: c.borderSoft,
    paddingTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: shSpace[2],
  },
  seccionMapa: { gap: shSpace[2] },
  navegacion: { flexDirection: "row", gap: 10 },
  botonNavegar: { flex: 1 },
  notificacion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: c.statusInfoBg,
    borderWidth: 1,
    borderColor: c.statusInfoBorder,
    borderRadius: shRadius.md,
    paddingHorizontal: 14,
    paddingVertical: shSpace[3],
  },
  notificacionContenido: { flex: 1 },
  notificacionTitulo: { ...shType.label, fontFamily: shType.hero.fontFamily, color: c.statusInfoFg },
  notificacionDetalle: { ...shType.dense, color: c.text, marginTop: 2, fontVariant: ["tabular-nums"] },
  seccion: {
    marginTop: shSpace[3],
    backgroundColor: c.surface,
    borderRadius: shRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: 14,
    gap: shSpace[2],
  },
  seccionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  seccionTitulo: { ...shType.block, color: c.text },
  sinPrestamos: { ...shType.dense, color: c.textMuted, marginTop: 10 },
  filaAviso: { flexDirection: "row", alignItems: "center", gap: shSpace[1], marginTop: 6 },
  requiereConexion: { ...shType.caption, flex: 1, color: c.statusWarningFg },
  prestamoItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: shSpace[2],
    minHeight: shDensity.controlLg,
    backgroundColor: c.surface,
    borderRadius: shRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: shSpace[3],
    paddingVertical: 10,
    marginTop: shSpace[2],
    overflow: "hidden",
  },
  prestamoItemSeleccionado: {
    borderColor: c.statusSuccessBorder,
    borderWidth: 2,
    backgroundColor: c.statusSuccessBg,
  },
  prestamoInfo: { flex: 1, marginRight: shSpace[2] },
  prestamoValor: { ...shType.label, fontFamily: shType.hero.fontFamily, color: c.text, fontVariant: ["tabular-nums"] },
  prestamoDetalle: { ...shType.caption, color: c.textMuted, marginTop: 2 },
  prestamoEstatus: { ...shType.caption, fontFamily: shType.label.fontFamily, color: c.textMuted, marginTop: 2 },
  // Fondo blanco fijo: la captura se comparte por WhatsApp (tema claro siempre).
  canvasScreenshot: {
    backgroundColor: lienzo.surface,
    borderRadius: shRadius.md,
    padding: shSpace[3],
  },
  detallePrestamo: {
    backgroundColor: c.surface,
    borderRadius: shRadius.lg,
    borderCurve: "continuous",
    padding: shSpace[4],
    boxShadow: c.elev1,
    borderWidth: 1,
    borderColor: c.borderSoft,
    gap: shSpace[2],
    marginTop: shSpace[1],
  },
  detalleTitulo: { ...shType.block, color: c.text },
  detalleTituloFila: { flexDirection: "row", alignItems: "center", gap: shSpace[1] },
  iconoWhatsApp: {
    width: shDensity.controlLg,
    height: shDensity.controlLg,
    borderRadius: shRadius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.statusSuccessBg,
  },
  detalleLinea: { ...shType.dense, color: lienzo.textMuted, fontVariant: ["tabular-nums"] },
  detalleCarga: { marginVertical: shSpace[4] },
  detalleError: { ...shType.dense, color: c.statusDangerFg },
  leyenda: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[3] },
  leyendaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  leyendaColor: { width: 12, height: 12, borderRadius: shRadius.pill },
  leyendaTexto: { ...shType.caption, color: lienzo.textMuted },
  canvas: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cuadro: {
    width: "22%",
    borderRadius: shRadius.sm,
    borderWidth: 1,
    padding: shSpace[2],
    alignItems: "center",
    gap: 2,
  },
  cuadroNumero: { ...shType.block, fontFamily: shType.hero.fontFamily, color: lienzo.text },
  cuadroValor: { ...shType.caption, fontFamily: shType.label.fontFamily, fontSize: 11, color: lienzo.textMuted, fontVariant: ["tabular-nums"] },
  cuadroFecha: { ...shType.caption, fontSize: 11, color: lienzo.textMuted },
  cuadroAbono: { ...shType.caption, fontFamily: shType.label.fontFamily, fontSize: 11, color: lienzo.statusSuccessFg },
  cuadroSaldo: { ...shType.caption, fontFamily: shType.label.fontFamily, fontSize: 11, color: lienzo.link },
  cuadroEtiqueta: {
    borderWidth: 1,
    borderRadius: shRadius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginTop: 2,
  },
  cuadroEtiquetaTexto: { ...shType.caption, fontFamily: shType.label.fontFamily, fontSize: 10, lineHeight: 14 },
  label: { ...shType.label, color: c.textMuted, marginTop: 2 },
  filaBusqueda: { flexDirection: "row", gap: shSpace[2] },
  inputBusqueda: { flex: 1 },
  botonBuscar: {
    width: shDensity.controlLg,
    minHeight: shDensity.controlLg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: relleno.primario,
    borderRadius: shRadius.sm,
    overflow: "hidden",
  },
  notaUbicacion: { ...shType.caption, color: c.textMuted, marginTop: shSpace[1] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  // 40 dp de alto + hitSlop de 4 = blanco táctil de 48 dp.
  chip: {
    justifyContent: "center",
    minHeight: shDensity.controlMd,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.controlBorder,
    borderRadius: shRadius.pill,
    paddingHorizontal: shSpace[3],
  },
  chipActivo: { backgroundColor: relleno.primario, borderColor: relleno.primario },
  chipTexto: { ...shType.label, color: c.link },
  chipTextoActivo: { ...shType.label, color: relleno.sobrePrimario },
  promesaNota: { ...shType.dense, color: c.textMuted },
  mensaje: { ...shType.dense, color: c.statusSuccessFg, marginTop: 2 },
  errorTexto: { ...shType.dense, color: c.statusDangerFg, marginTop: 2 },
  cuotaResumen: {
    backgroundColor: c.bg,
    borderRadius: shRadius.sm,
    padding: 10,
    gap: 2,
  },
  cuotaLinea: { ...shType.label, color: c.text, fontVariant: ["tabular-nums"] },
  cuotaFecha: { ...shType.caption, color: c.textMuted },
  cuotaSubtitulo: { ...shType.label, fontFamily: shType.block.fontFamily, color: c.textMuted, marginTop: shSpace[1] },
  cuotaVacio: { ...shType.dense, color: c.textMuted },
  pagoTexto: { ...shType.label, color: c.text, fontVariant: ["tabular-nums"] },
  pagoFecha: { ...shType.caption, color: c.textMuted },
  cuotaScroll: { flexGrow: 1 },
  filaItemBorrable: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: shRadius.sm,
    paddingLeft: 10,
    paddingVertical: 2,
    gap: shSpace[2],
    minHeight: shDensity.controlLg,
  },
  filaItemTexto: { flex: 1 },
  borrarPanel: {
    borderWidth: 1,
    borderColor: c.statusDangerBorder,
    borderRadius: shRadius.sm,
    padding: 10,
    backgroundColor: c.statusDangerBg,
    gap: 6,
  },
  borrarAcciones: { flexDirection: "row", gap: 10, marginTop: shSpace[1] },
  botonLinea: { flex: 1 },
  formPanel: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: shRadius.sm,
    padding: 10,
    backgroundColor: c.surface2,
    gap: 6,
  },
  cuotaAcciones: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: shSpace[1] },
  cuotaAccion: { flex: 1, minWidth: 120 },
  qrImagen: { width: 220, height: 220, alignSelf: "center", marginVertical: shSpace[2] },
});
}
