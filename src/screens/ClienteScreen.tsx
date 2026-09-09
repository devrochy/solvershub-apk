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
import * as Location from "expo-location";
import { apiErrorStatus, esErrorDeRed } from "../api/client";
import { Avatar } from "../components/Avatar";
import { HeaderPantalla, estilosHeader } from "../components/HeaderPantalla";
import { CampoTelefono } from "../components/CampoTelefono";
import { CargaError } from "../components/CargaError";
import { ColorBadge, colorDeEstado } from "../components/ColorBadge";
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

const COLORES_CANVAS: Record<TipoCuotaCanvas, { fondo: string; borde: string }> = {
  pagada: { fondo: "#dcfce7", borde: "#16a34a" },
  actual: { fondo: "#dbeafe", borde: "#172f6c" },
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

function esPendienteOAtrasada(estatus: string): boolean {
  return estatus === "pendiente" || estatus === "atrasada";
}

function formatearFechaHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ClienteScreen(props: Props | ClienteScreenDirectProps) {
  const params =
    "route" in props ? props.route.params : (props as ClienteScreenDirectProps);
  const { rutaId, clienteId, latitud, longitud, latitudDomicilio, longitudDomicilio, prestamoAutoSeleccionado } = params;
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
  // Acción desplegada dentro de la modal de cuota (registrar pago/no pago).
  const [accionCuota, setAccionCuota] = useState<"ninguno" | "pago" | "no_pago">("ninguno");
  // Borrar pago/abono desde la modal de cuota.
  const [borrarTarget, setBorrarTarget] = useState<{
    tipo: "pago" | "abono";
    id: number;
    valor: number;
  } | null>(null);
  const [borrarPassword, setBorrarPassword] = useState("");
  const [borrarMotivo, setBorrarMotivo] = useState("");
  const [borrando, setBorrando] = useState(false);
  const [borrarMensaje, setBorrarMensaje] = useState<string | null>(null);

  // Formulario pago/no_pago (dentro de la modal de cuota).
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
    () =>
      prestamoSeleccionado?.cuotas.find((c) => esPendienteOAtrasada(c.estatus)),
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
      const cuota = p.cuotas.find((c) => esPendienteOAtrasada(c.estatus));
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

  async function enviarAccionCuota() {
    if (!prestamoSeleccionado) {
      setMensaje("Selecciona un préstamo.");
      return;
    }
    if (accionCuota === "pago") {
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
        cuotaId: tipoPago === "cuota" ? detalleCuota?.cuotaId : undefined,
        valor: monto,
        metodoPago,
      };
      try {
        await api.registrarVisitaPago(rutaId, input);
        setAccionCuota("ninguno");
        setValor("");
        setMensaje("Pago registrado.");
        await recargarDetalleCuota();
        await recargarEstadoPrestamo();
        await cargar();
      } catch (err) {
        if (apiErrorStatus(err) === 401) {
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
      return;
    }
    if (accionCuota === "no_pago") {
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
        setAccionCuota("ninguno");
        setFechaPrometida("");
        setValorPrometido("");
        setMensaje("Visita registrada.");
        await recargarDetalleCuota();
        await recargarEstadoPrestamo();
      } catch (err) {
        if (apiErrorStatus(err) === 401) {
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

  function toggleAccionCuota(accion: "pago" | "no_pago") {
    setBorrarTarget(null);
    setBorrarMensaje(null);
    if (accionCuota === accion) {
      setAccionCuota("ninguno");
      setMensaje(null);
      return;
    }
    setMensaje(null);
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
    setMensaje(null);
    setModal("ninguno");
  }

  function iniciarBorrarPago(pago: { id: number; valor: number }) {
    setAccionCuota("ninguno");
    setMensaje(null);
    setBorrarTarget({ tipo: "pago", id: pago.id, valor: pago.valor });
    setBorrarPassword("");
    setBorrarMotivo("");
    setBorrarMensaje(null);
  }

  function iniciarBorrarAbono(abono: { id: number; valor: number }) {
    setAccionCuota("ninguno");
    setMensaje(null);
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
        await api.eliminarPago(rutaId, borrarTarget.id, input);
      } else {
        await api.eliminarAbono(rutaId, borrarTarget.id, input);
      }
      setBorrarTarget(null);
      setBorrarPassword("");
      setBorrarMotivo("");
      setMensaje(
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

  function abrirEditarUbicacion() {
    setUbicacionMensaje(null);
    setUbicacionDireccion("");
    setUbicacionCampo("negocio");
    setEdicion((e) => ({
      ...e,
      latitud: typeof latitud === "number" ? latitud : e.latitud,
      longitud: typeof longitud === "number" ? longitud : e.longitud,
      latitudDomicilio:
        typeof latitudDomicilio === "number" ? latitudDomicilio : e.latitudDomicilio,
      longitudDomicilio:
        typeof longitudDomicilio === "number" ? longitudDomicilio : e.longitudDomicilio,
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
      await api.actualizarCliente(rutaId, clienteId, input);
      setModal("ninguno");
      setMensaje("Ubicación actualizada.");
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
    } catch (err) {
      if (apiErrorStatus(err) === 401) {
        await logout();
      } else {
        setMensaje("No se pudo guardar el cambio.");
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
    setAccionCuota("ninguno");
    setBorrarTarget(null);
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

  async function recargarDetalleCuota() {
    if (!prestamoSeleccionado || !detalleCuota) {
      return;
    }
    setDetalleCuotaCargando(true);
    try {
      setDetalleCuota(
        await api.detalleCuota(rutaId, prestamoSeleccionado.id, detalleCuota.cuotaId),
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
        await api.obtenerEstadoCuentaPrestamo(rutaId, prestamoSeleccionado.id),
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
      } else if (err instanceof Error && err.message && err.message.startsWith("{")) {
        try {
          const cuerpo = JSON.parse(err.message) as { message?: string | string[] };
          if (Array.isArray(cuerpo.message)) {
            setMensaje(cuerpo.message.join(", "));
          } else {
            setMensaje(cuerpo.message ?? "No se pudo guardar la evidencia.");
          }
        } catch {
          setMensaje("No se pudo guardar la evidencia.");
        }
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

  return (
    <>
      <SafeAreaView style={styles.contenedor} edges={["left", "right"]}>
        <HeaderPantalla>
          <View testID="header-cliente" style={estilosHeader.fila}>
            <View style={estilosHeader.columnaIzq} />
            <Text style={estilosHeader.titulo}>Información del cliente</Text>
            <View style={estilosHeader.columnaDerecha} />
          </View>
        </HeaderPantalla>
        <ScrollView contentContainerStyle={styles.scroll}>
        {mensaje && modal === "ninguno" ? (
          <View testID="banner-mensaje" style={styles.banner}>
            <Text style={styles.bannerTexto}>{mensaje}</Text>
          </View>
        ) : null}

        {/* Tarjeta cédula/pasaporte: header con fondo por clasificación, foto grande
            a la izquierda y datos a la derecha; documentos como iconos grandes. */}
        <View testID="tarjeta-cedula" style={styles.tarjeta}>
          <View
            testID="header-tarjeta-cliente"
            style={[styles.tarjetaHeader, { backgroundColor: colorDeEstado(tarjeta.color) }]}
          >
            <Text style={styles.tarjetaHeaderNombre} numberOfLines={1}>
              {tarjeta.nombre}
            </Text>
            <Pressable testID="btn-editar-cliente" style={styles.tarjetaHeaderEditar} onPress={abrirEditar}>
              <MaterialIcons name="edit" size={16} color="#ffffff" />
              <Text style={styles.tarjetaHeaderEditarTexto}>Editar</Text>
            </Pressable>
          </View>

          {/* Foto grande a la izquierda + datos a la derecha */}
          <View style={styles.filaCedula}>
            <Pressable testID="btn-avatar" onPress={() => setModal("avatar")}>
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
            </View>
          </View>

          {/* Dos iconos grandes: documento frente y reverso */}
          <View style={styles.documentosFila}>
            <Pressable
              testID="doc-frente"
              style={styles.miniatura}
              onPress={() => {
                setModalDocumento("frente");
                setModal("documento");
              }}
            >
              {docFrenteUrl ? (
                <Image source={{ uri: docFrenteUrl }} style={styles.miniaturaImagenGrande} />
              ) : (
                <View style={styles.miniaturaPlaceholderGrande}>
                  <MaterialIcons name="badge" size={40} color="#94a3b8" />
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
                <Image source={{ uri: docReversoUrl }} style={styles.miniaturaImagenGrande} />
              ) : (
                <View style={styles.miniaturaPlaceholderGrande}>
                  <MaterialIcons name="badge" size={40} color="#94a3b8" />
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

          {/* Fila de acciones: cómo llegar + editar ubicación */}
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
                onPress={abrirEditarUbicacion}
              >
                <MaterialIcons name="edit-location" size={16} color="#172f6c" />
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
            <MaterialIcons name="notifications-active" size={20} color="#172f6c" />
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
            <View style={styles.detalleTituloFila}>
              <Pressable
                testID="btn-whatsapp"
                style={styles.iconoWhatsApp}
                disabled={compartiendo}
                onPress={() => void compartirDetalle()}
              >
                {compartiendo ? (
                  <ActivityIndicator size="small" color="#25D366" />
                ) : (
                  <MaterialIcons name="chat" size={18} color="#25D366" />
                )}
              </Pressable>
              <Text style={styles.detalleTitulo}>Préstamo #{prestamoSeleccionado.id}</Text>
            </View>
            {estadoPrestamoCargando ? (
              <ActivityIndicator style={styles.detalleCarga} />
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
        <CampoTelefono
          testID="editar-telefono"
          valor={edicion.telefonoWhatsapp ?? ""}
          onChange={(v) => setEdicion((e) => ({ ...e, telefonoWhatsapp: v }))}
          placeholder="Número de WhatsApp"
        />
        <Text style={styles.notaUbicacion}>
          La ubicación del negocio y del domicilio se edita desde la tarjeta del
          cliente (opción Editar ubicación).
        </Text>
        {mensaje && modal === "editar" ? (
          <Text testID="mensaje-editar" style={styles.mensajeModal}>
            {mensaje}
          </Text>
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
          <TextInput
            testID="ubicacion-direccion"
            style={[styles.input, styles.inputBusqueda]}
            placeholder="Buscar por dirección"
            value={ubicacionDireccion}
            onChangeText={setUbicacionDireccion}
          />
          <Pressable
            testID="ubicacion-buscar"
            style={styles.botonBuscar}
            disabled={ubicacionBuscando}
            onPress={() => void buscarUbicacionDireccion()}
          >
            {ubicacionBuscando ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <MaterialIcons name="search" size={18} color="#ffffff" />
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
          setMensaje(null);
        }}
        onCancelar={() => {
          setModal("ninguno");
          evidenciasCliente.quitar("foto_facial");
          evidenciasCliente.resetError();
          setMensaje(null);
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
          <MaterialIcons name="photo-library" size={16} color="#172f6c" />
          <Text style={styles.botonEvidenciaTexto}>Cargar desde librería</Text>
        </Pressable>
        <Pressable
          testID="avatar-camara"
          style={styles.botonEvidencia}
          disabled={evidenciasEnviando || evidenciasCliente.cargando}
          onPress={() => void elegirEvidencia("foto_facial", "camara")}
        >
          <MaterialIcons name="photo-camera" size={16} color="#172f6c" />
          <Text style={styles.botonEvidenciaTexto}>Tomar foto con cámara</Text>
        </Pressable>
        {evidenciasCliente.cargando || evidenciasEnviando ? (
          <ActivityIndicator />
        ) : null}
        {evidenciasCliente.error ? (
          <Text style={styles.errorTexto}>{evidenciasCliente.error}</Text>
        ) : null}
        {mensaje ? <Text style={styles.errorTexto}>{mensaje}</Text> : null}
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
          setMensaje(null);
        }}
        onCancelar={() => {
          setModal("ninguno");
          evidenciasCliente.quitar(
            modalDocumento === "reverso" ? "documento_reverso" : "documento_frente",
          );
          evidenciasCliente.resetError();
          setMensaje(null);
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
          <MaterialIcons name="photo-library" size={16} color="#172f6c" />
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
          <MaterialIcons name="photo-camera" size={16} color="#172f6c" />
          <Text style={styles.botonEvidenciaTexto}>Tomar foto con cámara</Text>
        </Pressable>
        {evidenciasCliente.cargando || evidenciasEnviando ? (
          <ActivityIndicator />
        ) : null}
        {evidenciasCliente.error ? (
          <Text style={styles.errorTexto}>{evidenciasCliente.error}</Text>
        ) : null}
        {mensaje ? <Text style={styles.errorTexto}>{mensaje}</Text> : null}
      </ModalConFooter>

      {/* Modal: detalle de cuota (rediseñada): detalle con scroll, acciones abajo,
      formularios desplegables y borrar pago/abono (solo no liquidado). */}
      <ModalConFooter
        visible={modal === "cuota"}
        titulo="Detalle de cuota"
        onCerrar={cerrarCuota}
        testID="cuota-dialog"
      >
        {detalleCuotaCargando ? (
          <ActivityIndicator />
        ) : detalleCuota ? (
          (() => {
            const cuotaAccionable = esPendienteOAtrasada(detalleCuota.estatus);
            const puedeEliminarPago = Boolean(rutaActiva?.config.eliminarPagosApk);
            const puedeEliminarAbono = Boolean(rutaActiva?.config.eliminarAbonosApk);
            return (
              <>
                <ScrollView style={styles.cuotaScroll}>
                  <View style={styles.cuotaResumen}>
                    <Text style={styles.cuotaLinea}>
                      Cuota {detalleCuota.numeroCuota} — {detalleCuota.valorEsperado} (
                      {detalleCuota.estatus})
                    </Text>
                    <Text style={styles.cuotaFecha}>
                      Vence {detalleCuota.fechaVencimiento}
                    </Text>
                  </View>

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
                          <Pressable
                            testID={`borrar-pago-${pago.id}`}
                            style={styles.botonBorrar}
                            onPress={() => iniciarBorrarPago(pago)}
                          >
                            <MaterialIcons name="delete-outline" size={16} color="#dc2626" />
                          </Pressable>
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
                          <Pressable
                            testID={`borrar-abono-${abono.id}`}
                            style={styles.botonBorrar}
                            onPress={() => iniciarBorrarAbono(abono)}
                          >
                            <MaterialIcons name="delete-outline" size={16} color="#dc2626" />
                          </Pressable>
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
                  <Text testID="cuota-mensaje" style={styles.mensajeModal}>
                    {mensaje}
                  </Text>
                ) : null}

                {/* Acciones en la parte inferior (solo cuota no paga) */}
                {cuotaAccionable ? (
                  <View style={styles.cuotaAcciones}>
                    <Pressable
                      testID="accion-pago"
                      style={[
                        styles.cuotaAccion,
                        accionCuota === "pago" && styles.cuotaAccionActiva,
                      ]}
                      onPress={() => toggleAccionCuota("pago")}
                    >
                      <MaterialIcons name="payments" size={16} color="#ffffff" />
                      <Text style={styles.cuotaAccionTexto}>Registrar pago</Text>
                    </Pressable>
                    <Pressable
                      testID="accion-no-pago"
                      style={[
                        styles.cuotaAccion,
                        styles.cuotaAccionNoPago,
                        accionCuota === "no_pago" && styles.cuotaAccionActiva,
                      ]}
                      onPress={() => toggleAccionCuota("no_pago")}
                    >
                      <MaterialIcons name="block" size={16} color="#ffffff" />
                      <Text style={styles.cuotaAccionTexto}>No pago</Text>
                    </Pressable>
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
                    <TextInput
                      testID="borrar-password"
                      style={styles.input}
                      placeholder="Tu contraseña"
                      secureTextEntry
                      value={borrarPassword}
                      onChangeText={setBorrarPassword}
                    />
                    <Text style={styles.label}>Motivo</Text>
                    <TextInput
                      testID="borrar-motivo"
                      style={styles.input}
                      placeholder="Motivo de la eliminación"
                      value={borrarMotivo}
                      onChangeText={setBorrarMotivo}
                    />
                    {borrarMensaje ? (
                      <Text style={styles.mensajeModal}>{borrarMensaje}</Text>
                    ) : null}
                    <View style={styles.borrarAcciones}>
                      <Pressable
                        testID="borrar-cancelar"
                        style={styles.botonCancelarLinea}
                        disabled={borrando}
                        onPress={cancelarBorrar}
                      >
                        <Text style={styles.botonCancelarLineaTexto}>Cancelar</Text>
                      </Pressable>
                      <Pressable
                        testID="borrar-confirmar"
                        style={[styles.botonConfirmarLinea, borrando && styles.deshabilitado]}
                        disabled={borrando}
                        onPress={() => void confirmarBorrar()}
                      >
                        {borrando ? (
                          <ActivityIndicator color="#ffffff" />
                        ) : (
                          <Text style={styles.botonConfirmarLineaTexto}>Eliminar</Text>
                        )}
                      </Pressable>
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
                          <Text
                            style={metodoPago === metodo ? styles.chipTextoActivo : styles.chipTexto}
                          >
                            {metodo}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <Pressable
                      testID="guardar-pago-cuota"
                      style={[styles.botonConfirmarLinea, enviando && styles.deshabilitado]}
                      disabled={enviando}
                      onPress={() => void enviarAccionCuota()}
                    >
                      {enviando ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <Text style={styles.botonConfirmarLineaTexto}>
                          {tipoPago === "cuota" ? "Registrar pago" : "Registrar abono"}
                        </Text>
                      )}
                    </Pressable>
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
                        <TextInput
                          testID="fecha-prometida"
                          style={styles.input}
                          placeholder="AAAA-MM-DD"
                          autoCapitalize="none"
                          value={fechaPrometida}
                          onChangeText={setFechaPrometida}
                        />
                        <Text style={styles.label}>Valor prometido</Text>
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
                    <Pressable
                      testID="guardar-no-pago"
                      style={[styles.botonConfirmarLinea, enviando && styles.deshabilitado]}
                      disabled={enviando}
                      onPress={() => void enviarAccionCuota()}
                    >
                      {enviando ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <Text style={styles.botonConfirmarLineaTexto}>Registrar visita</Text>
                      )}
                    </Pressable>
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
    </>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#f8fafc" },
  scroll: { padding: 16, gap: 12 },
  tarjetaHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    margin: -16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  tarjetaHeaderNombre: { fontSize: 16, fontWeight: "700", color: "#ffffff", flex: 1 },
  tarjetaHeaderEditar: { flexDirection: "row", alignItems: "center", gap: 4 },
  tarjetaHeaderEditarTexto: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
  filaCedula: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  datosCedula: { flex: 1, gap: 6 },
  datoCedulaLineal: { fontSize: 14, color: "#1e293b", flexWrap: "wrap" },
  datoCedulaEtiqueta: { fontWeight: "700", color: "#475569" },
  datoCedulaValor: { fontWeight: "600", color: "#1e293b" },
  documentosFila: { flexDirection: "row", gap: 14, marginTop: 16 },
  miniaturaImagenGrande: {
    width: 96,
    height: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  miniaturaPlaceholderGrande: {
    width: 96,
    height: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
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
    borderCurve: "continuous",
    padding: 16,
    overflow: "hidden",
    boxShadow: "0 4px 10px rgba(15, 23, 42, 0.08)",
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
  detalle: { color: "#475569", fontSize: 14 },
  footerTarjeta: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  comoLlegar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editarUbicacionTexto: { color: "#172f6c", fontWeight: "600", fontSize: 13 },
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
  botonNuevoTexto: { color: "#172f6c", fontSize: 14, fontWeight: "600" },
  seccionTitulo: { fontSize: 15, fontWeight: "700", color: "#334155" },
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
  canvasScreenshot: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
  },
  detallePrestamo: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderCurve: "continuous",
    padding: 16,
    boxShadow: "0 4px 10px rgba(15, 23, 42, 0.08)",
    gap: 8,
    marginTop: 4,
  },
  detalleTitulo: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  detalleTituloFila: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconoWhatsApp: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ecfdf5",
  },
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
  cuadroSaldo: { fontSize: 9, color: "#172f6c", fontWeight: "600" },
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
  filaBusqueda: { flexDirection: "row", gap: 8 },
  inputBusqueda: { flex: 1 },
  botonBuscar: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#172f6c",
    borderRadius: 8,
  },
  notaUbicacion: { color: "#64748b", fontSize: 12, marginTop: 4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActivo: { backgroundColor: "#172f6c", borderColor: "#172f6c" },
  chipTexto: { color: "#334155", fontSize: 13 },
  chipTextoActivo: { color: "#ffffff", fontSize: 13 },
  promesaNota: { color: "#64748b", fontSize: 13 },
  mensaje: { color: "#16a34a", fontSize: 14, marginTop: 2 },
  errorTexto: { color: "#dc2626", fontSize: 13, marginTop: 2 },
  evidenciaPreview: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    resizeMode: "contain",
    backgroundColor: "#f8fafc",
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
    borderColor: "#172f6c",
    borderRadius: 10,
    paddingVertical: 10,
  },
  botonEvidenciaTexto: { color: "#172f6c", fontWeight: "600" },
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
  cuotaScroll: { flexGrow: 1 },
  filaItemBorrable: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
  },
  filaItemTexto: { flex: 1 },
  botonBorrar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
  },
  borrarPanel: {
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#fff7f7",
    gap: 6,
  },
  borrarAcciones: { flexDirection: "row", gap: 10, marginTop: 4 },
  botonCancelarLinea: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  botonCancelarLineaTexto: { color: "#475569", fontWeight: "600" },
  botonConfirmarLinea: {
    flex: 1,
    backgroundColor: "#172f6c",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  botonConfirmarLineaTexto: { color: "#ffffff", fontWeight: "600" },
  formPanel: {
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#eff6ff",
    gap: 6,
  },
  cuotaAcciones: { flexDirection: "row", gap: 10, marginTop: 4 },
  cuotaAccion: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#16a34a",
    borderRadius: 10,
    paddingVertical: 11,
  },
  cuotaAccionNoPago: { backgroundColor: "#dc2626" },
  cuotaAccionActiva: { opacity: 0.85 },
  cuotaAccionTexto: { color: "#ffffff", fontWeight: "700" },
});