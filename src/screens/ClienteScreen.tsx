import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { apiErrorStatus, esErrorDeRed } from "../api/client";
import { Avatar } from "../components/Avatar";
import { CargaError } from "../components/CargaError";
import { ColorBadge } from "../components/ColorBadge";
import { MapaCliente } from "../components/MapaCliente";
import { METODOS_PAGO, MOTIVOS_NO_PAGO } from "../domain/catalogos";
import {
  cambioClientePayload,
  camposCambiados,
  dedupeKeyCambioCliente,
  edicionDesdeTarjeta,
  type CambioClienteInput,
} from "../features/cliente/cambio-cliente";
import { abrirNavegacion } from "../features/navegacion/navegacion";
import {
  enlaceWhatsApp,
  textoReportePrestamo,
} from "../features/estado-cuenta/estado-cuenta";
import { validarPrestamo } from "../features/prestamo/registrar-prestamo";
import { useEvidenciasCliente } from "../features/cliente/use-evidencias-cliente";
import { validarFechaPrometida, validarMonto } from "../features/visita/validaciones";
import type { RootStackParamList } from "../navigation/types";
import { useOffline } from "../offline/offline-context";
import { guardarCliente, leerCliente } from "../offline/cache";
import { useSession } from "../session/session-context";
import { useRutaActiva } from "../session/ruta-activa-context";
import type {
  ClienteTarjetaPublic,
  CuotaPublic,
  PrestamoPublic,
} from "../types/cobrador";

type Props = NativeStackScreenProps<RootStackParamList, "Cliente">;

function esPendienteOArrasada(cuota: CuotaPublic): boolean {
  return cuota.estatus === "pendiente" || cuota.estatus === "atrasada";
}

export function ClienteScreen({ route, navigation }: Props) {
  const { rutaId, clienteId, latitud, longitud } = route.params;
  const { api, logout } = useSession();
  const offline = useOffline();
  const { rutaActiva } = useRutaActiva();

  const [tarjeta, setTarjeta] = useState<ClienteTarjetaPublic | null>(null);
  const [prestamos, setPrestamos] = useState<PrestamoPublic[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [modo, setModo] = useState<"pago" | "no_pago" | "editar" | "prestamo" | "evidencias" | null>(null);
  const [valor, setValor] = useState("");
  const [metodoPago, setMetodoPago] = useState<(typeof METODOS_PAGO)[number]>(
    "efectivo",
  );
  const [motivoNoPago, setMotivoNoPago] = useState<
    (typeof MOTIVOS_NO_PAGO)[number]
  >("no_esta");
  const [tipoPago, setTipoPago] = useState<"cuota" | "abono">("cuota");
  const [fechaPrometida, setFechaPrometida] = useState("");
  const [valorPrometido, setValorPrometido] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [edicion, setEdicion] = useState<CambioClienteInput>({});
  const [edicionOriginal, setEdicionOriginal] = useState<CambioClienteInput>({});
  const [editando, setEditando] = useState(false);
  const [detalleAbierto, setDetalleAbierto] = useState(true);
  const [prestamoValor, setPrestamoValor] = useState("");
  const [prestamoCuotas, setPrestamoCuotas] = useState("");
  const [prestamoDias, setPrestamoDias] = useState("");
  const [prestamoInteres, setPrestamoInteres] = useState("");
  const [prestamoEnviando, setPrestamoEnviando] = useState(false);
  const [prestamoMensaje, setPrestamoMensaje] = useState<string | null>(null);
  const [cuotaEditando, setCuotaEditando] = useState<CuotaPublic | null>(null);
  const [cuotaEliminando, setCuotaEliminando] = useState<CuotaPublic | null>(null);
  const [cuotaNuevoValor, setCuotaNuevoValor] = useState("");
  const [cuotaPassword, setCuotaPassword] = useState("");
  const [cuotaMotivo, setCuotaMotivo] = useState("");
  const [cuotaEnviando, setCuotaEnviando] = useState(false);
  const [cuotaMensaje, setCuotaMensaje] = useState<string | null>(null);

  const evidenciasCliente = useEvidenciasCliente();
  const [evidenciasEnviando, setEvidenciasEnviando] = useState(false);
  const [evidenciasMensaje, setEvidenciasMensaje] = useState<string | null>(null);

  // Máquina de estados: solo un formulario activo a la vez (A2).
  function abrirModo(
    m: "pago" | "no_pago" | "editar" | "prestamo" | "evidencias",
  ): void {
    setCuotaEditando(null);
    setCuotaEliminando(null);
    setCuotaMensaje(null);
    setModo(m);
  }

  async function guardarEvidenciasCliente() {
    if (evidenciasCliente.evidencias.length === 0) {
      return;
    }
    setEvidenciasEnviando(true);
    setEvidenciasMensaje(null);
    try {
      await api.agregarEvidenciasCliente(rutaId, clienteId, evidenciasCliente.evidencias);
      setEvidenciasMensaje("Evidencias guardadas.");
      evidenciasCliente.quitar("foto_facial");
      evidenciasCliente.quitar("documento_frente");
      await cargar();
    } catch (err) {
      if (apiErrorStatus(err) === 401) {
        await logout();
      } else {
        setEvidenciasMensaje("No se pudieron guardar las evidencias.");
      }
    } finally {
      setEvidenciasEnviando(false);
    }
  }

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const [t, p] = await Promise.all([
        api.tarjeta(rutaId, clienteId),
        api.listarPrestamosDeCliente(rutaId, clienteId),
      ]);
      setTarjeta(t);
      setPrestamos(p);
      await guardarCliente(rutaId, clienteId, { tarjeta: t, prestamos: p });
    } catch (err) {
      if (apiErrorStatus(err) === 401) {
        await logout();
      } else if (esErrorDeRed(err)) {
        const cache = await leerCliente(rutaId, clienteId);
        if (cache) {
          setTarjeta(cache.tarjeta);
          setPrestamos(cache.prestamos);
        } else {
          setError("No se pudo cargar el cliente.");
        }
      } else {
        setError("No se pudo cargar el cliente.");
      }
    }
  }, [api, rutaId, clienteId, logout]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount (async; no setState síncrono)
    cargar();
  }, [cargar]);

  const prestamoVigente = useMemo(
    () => prestamos.find((p) => p.estatus === "vigente") ?? prestamos[0],
    [prestamos],
  );

  const cuotaPorPagar = useMemo(
    () => prestamoVigente?.cuotas.find(esPendienteOArrasada),
    [prestamoVigente],
  );

  async function enviarVisita() {
    if (!prestamoVigente) {
      setMensaje("El cliente no tiene préstamos vigentes.");
      return;
    }
    if (modo === "pago") {
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
        prestamoId: prestamoVigente.id,
        clienteId,
        resultado: "pago" as const,
        tipoPago,
        cuotaId: tipoPago === "cuota" ? cuotaPorPagar?.id : undefined,
        valor: monto,
        metodoPago,
      };
      try {
        await api.registrarVisitaPago(rutaId, input);
        setModo(null);
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
            setModo(null);
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
        prestamoId: prestamoVigente.id,
        clienteId,
        resultado: "no_pago" as const,
        motivoNoPago,
        fechaPrometida: fechaPrometida.trim() || undefined,
        valorPrometido: montoPrometido ?? undefined,
      };
      try {
        await api.registrarVisitaNoPago(rutaId, input);
        setModo(null);
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
            setModo(null);
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
        setTarjeta((actual) =>
          actual
            ? {
                ...actual,
                nombre:
                  input.nombre !== undefined
                    ? `${input.nombre} ${actual.nombre.split(" ").slice(1).join(" ")}`.trim()
                    : actual.nombre,
                negocio: input.negocio !== undefined ? input.negocio : actual.negocio,
                telefonoWhatsapp:
                  input.telefonoWhatsapp !== undefined
                    ? input.telefonoWhatsapp
                    : actual.telefonoWhatsapp,
              }
            : actual,
        );
        setMensaje("Cambio enviado (se sincronizará).");
      } else {
        setMensaje("Ya hay un cambio pendiente por sincronizar.");
      }
    } finally {
      setEditando(false);
    }
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
      setModo(null);
      setPrestamoValor("");
      setPrestamoCuotas("");
      setPrestamoDias("");
      setPrestamoInteres("");
      setPrestamoMensaje("Préstamo registrado.");
      await cargar();
    } catch {
      setPrestamoMensaje("No se pudo registrar el préstamo.");
    } finally {
      setPrestamoEnviando(false);
    }
  }

  async function guardarCuota() {
    if (!cuotaPassword.trim() || !cuotaMotivo.trim()) {
      setCuotaMensaje("La contraseña y el motivo son obligatorios.");
      return;
    }
    setCuotaEnviando(true);
    setCuotaMensaje(null);
    try {
      if (cuotaEditando) {
        const valor = Number(cuotaNuevoValor);
        if (!cuotaNuevoValor.trim() || !Number.isFinite(valor) || valor <= 0) {
          setCuotaMensaje("Ingresa un valor de cuota válido.");
          setCuotaEnviando(false);
          return;
        }
        await api.editarCuota(rutaId, cuotaEditando.id, {
          valorEsperado: valor,
          password: cuotaPassword,
          motivo: cuotaMotivo,
        });
        setCuotaEditando(null);
      } else if (cuotaEliminando) {
        await api.eliminarCuota(rutaId, cuotaEliminando.id, {
          password: cuotaPassword,
          motivo: cuotaMotivo,
        });
        setCuotaEliminando(null);
      }
      setCuotaPassword("");
      setCuotaMotivo("");
      setCuotaNuevoValor("");
      setCuotaMensaje("Cuota actualizada.");
      await cargar();
    } catch {
      setCuotaMensaje("No se pudo actualizar la cuota.");
    } finally {
      setCuotaEnviando(false);
    }
  }

  if (!tarjeta) {
    return <CargaError cargando={!error} error={error} onReintentar={cargar} />;
  }

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={styles.scroll}>
      <View style={styles.tarjetaInfo}>
        {tarjeta.fotoUrl ? <Avatar nombre={tarjeta.nombre} fotoUrl={tarjeta.fotoUrl} size={72} /> : null}
        <View style={styles.fila}>
          <Text style={styles.nombre}>{tarjeta.nombre}</Text>
          <ColorBadge color={tarjeta.color} />
        </View>
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
        {typeof latitud === "number" && typeof longitud === "number" ? (
          <>
            <MapaCliente latitud={latitud} longitud={longitud} nombre={tarjeta.nombre} />
            <View style={styles.navegacion}>
            <Pressable
              testID="navegar-maps"
              style={[styles.botonPrimario, styles.botonNavegar]}
              onPress={() => abrirNavegacion(latitud, longitud, "maps")}
            >
              <Text style={styles.botonTexto}>Google Maps</Text>
            </Pressable>
            <Pressable
              testID="navegar-waze"
              style={[styles.botonPrimario, styles.botonNavegar]}
              onPress={() => abrirNavegacion(latitud, longitud, "waze")}
            >
              <Text style={styles.botonTexto}>Waze</Text>
            </Pressable>
          </View>
          </>
        ) : null}
      </View>

      {prestamos.length > 0 ? (
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Préstamos</Text>
          {prestamos.map((p) => (
            <Pressable
              key={p.id}
              testID={`prestamo-item-${p.id}`}
              style={styles.prestamoItem}
              onPress={() =>
                navigation.navigate("Prestamo", {
                  rutaId,
                  prestamoId: p.id,
                  clienteNombre: tarjeta.nombre,
                  telefonoWhatsapp: tarjeta.telefonoWhatsapp,
                  valor: p.valor,
                  numCuotas: p.numCuotas,
                })
              }
            >
              <View style={styles.prestamoInfo}>
                <Text style={styles.prestamoValor}>
                  {p.valor} · {p.numCuotas} cuotas
                </Text>
                <Text style={styles.prestamoEstatus}>{p.estatus}</Text>
              </View>
              <ColorBadge
                color={
                  p.estatus === "vigente" || p.estatus === "liquidado"
                    ? "verde"
                    : "blanco"
                }
              />
            </Pressable>
          ))}
        </View>
      ) : null}

      {prestamoVigente && cuotaPorPagar ? (
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Próxima cuota</Text>
          <Text style={styles.detalle}>
            Cuota {cuotaPorPagar.numeroCuota} — {cuotaPorPagar.valorEsperado}{" "}
            ({cuotaPorPagar.estatus})
          </Text>
        </View>
      ) : prestamoVigente ? (
        <Text style={styles.sinCuotas}>Sin cuotas pendientes para este préstamo.</Text>
      ) : null}

      {prestamoVigente ? (
        <View style={styles.seccion}>
          <View style={styles.seccionFila}>
            <Text style={styles.seccionTitulo}>Estado de cuenta</Text>
            <Pressable
              testID="btn-detalle-estado-cuenta"
              onPress={() => setDetalleAbierto((abierto) => !abierto)}
            >
              <Text style={styles.detalleBoton}>
                {detalleAbierto ? "Ocultar" : "Ver detalle"}
              </Text>
            </Pressable>
          </View>
          <Pressable
            testID="btn-canvas-prestamo"
            style={[styles.botonPrimario, styles.botonPrestamo]}
            onPress={() =>
              navigation.navigate("Prestamo", {
                rutaId,
                prestamoId: prestamoVigente.id,
                clienteNombre: tarjeta.nombre,
                telefonoWhatsapp: tarjeta.telefonoWhatsapp,
                valor: prestamoVigente.valor,
                numCuotas: prestamoVigente.numCuotas,
              })
            }
          >
            <Text style={styles.botonTexto}>Ver canvas de cuotas</Text>
          </Pressable>
          {detalleAbierto ? (
            <View
              testID="estado-cuenta"
              accessibilityState={{ expanded: true }}
            >
              {prestamoVigente.cuotas.map((cuota) => (
                <View
                  key={cuota.id}
                  style={[styles.recuadroCuota, cuota.estatus === "atrasada" && styles.recuadroCuotaMora]}
                  testID={`cuota-${cuota.id}`}
                >
                  <Text style={styles.cuotaLinea}>
                    Cuota {cuota.numeroCuota} — {cuota.valorEsperado} ({cuota.estatus})
                  </Text>
                  <Text style={styles.cuotaFecha}>
                    Vence {cuota.fechaVencimiento}
                  </Text>
                  <View style={styles.cuotaAcciones}>
                    <Pressable
                      testID={`btn-editar-cuota-${cuota.id}`}
                      style={styles.botonCuota}
                      onPress={() => {
                        setCuotaEditando(cuota);
                        setCuotaEliminando(null);
                        setCuotaNuevoValor(String(cuota.valorEsperado));
                        setCuotaPassword("");
                        setCuotaMotivo("");
                        setCuotaMensaje(null);
                      }}
                    >
                      <Text style={styles.botonCuotaTexto}>Editar</Text>
                    </Pressable>
                    <Pressable
                      testID={`btn-eliminar-cuota-${cuota.id}`}
                      style={[styles.botonCuota, styles.botonCuotaPeligro]}
                      onPress={() => {
                        setCuotaEliminando(cuota);
                        setCuotaEditando(null);
                        setCuotaPassword("");
                        setCuotaMotivo("");
                        setCuotaMensaje(null);
                      }}
                    >
                      <Text style={styles.botonCuotaTexto}>Eliminar</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
              <Pressable
                testID="btn-whatsapp"
                style={[styles.botonPrimario, styles.botonWhatsApp]}
                onPress={() => {
                  const texto = textoReportePrestamo(prestamoVigente, tarjeta);
                  void Linking.openURL(
                    enlaceWhatsApp(tarjeta.telefonoWhatsapp, texto),
                  );
                }}
              >
                <Text style={styles.botonTexto}>Enviar por WhatsApp</Text>
              </Pressable>
            </View>
          ) : (
            <View
              testID="estado-cuenta"
              accessibilityState={{ expanded: false }}
            />
          )}
        </View>
      ) : null}

      <View style={styles.acciones}>
        <Pressable
          testID="btn-nuevo-prestamo"
          style={[styles.botonPrimario, styles.botonPrestamo]}
          onPress={() => {
            abrirModo("prestamo");
            setMensaje(null);
            setPrestamoMensaje(null);
            // Autocompletado desde la ruta activa (defaults de la ruta).
            setPrestamoInteres(rutaActiva ? String(rutaActiva.tipoInteres) : "");
            setPrestamoCuotas(rutaActiva ? String(rutaActiva.numCuotas) : "");
            const cupo = rutaActiva?.config.cupoDefault;
            setPrestamoValor(cupo ? String(cupo) : "");
            setPrestamoDias("");
          }}
        >
          <Text style={styles.botonTexto}>Nuevo préstamo</Text>
        </Pressable>
        <Pressable
          testID="btn-editar-cliente"
          style={[styles.botonPrimario, styles.botonEditar]}
          onPress={() => {
            abrirModo("editar");
            setMensaje(null);
            const actual = edicionDesdeTarjeta(tarjeta);
            setEdicion(actual);
            setEdicionOriginal(actual);
          }}
        >
          <Text style={styles.botonTexto}>Editar datos</Text>
        </Pressable>
        <Pressable
          testID="btn-pago"
          style={[styles.botonPrimario, styles.botonPago]}
          onPress={() => {
            abrirModo("pago");
            setMensaje(null);
            if (cuotaPorPagar) {
              setValor(String(cuotaPorPagar.valorEsperado));
            }
          }}
        >
          <Text style={styles.botonTexto}>Registrar pago</Text>
        </Pressable>
        <Pressable
          testID="btn-no-pago"
          style={[styles.botonPrimario, styles.botonNoPago]}
          onPress={() => {
            abrirModo("no_pago");
            setMensaje(null);
          }}
        >
          <Text style={styles.botonTexto}>Registrar no pago</Text>
        </Pressable>
        <Pressable
          testID="btn-evidencias"
          style={[styles.botonPrimario, styles.botonEvidencias]}
          onPress={() => abrirModo("evidencias")}
        >
          <Text style={styles.botonTexto}>Foto / documento</Text>
        </Pressable>
      </View>

      {modo === "evidencias" ? (
        <View testID="evidencias-form" style={styles.form}>
          <Text style={styles.formTitulo}>Foto y documento del cliente</Text>
          <Text style={styles.detalle}>Selecciona la foto facial y el documento de identidad.</Text>
          <Pressable
            testID="evidencia-foto"
            style={[styles.botonPrimario, styles.botonPrestamo]}
            onPress={() => void evidenciasCliente.agregar("foto_facial")}
          >
            <Text style={styles.botonTexto}>
              {evidenciasCliente.evidencias.find((e) => e.campo === "foto_facial")
                ? "Foto seleccionada (cambiar)"
                : "Seleccionar foto"}
            </Text>
          </Pressable>
          <Pressable
            testID="evidencia-documento"
            style={[styles.botonPrimario, styles.botonPrestamo]}
            onPress={() => void evidenciasCliente.agregar("documento_frente")}
          >
            <Text style={styles.botonTexto}>
              {evidenciasCliente.evidencias.find((e) => e.campo === "documento_frente")
                ? "Documento seleccionado (cambiar)"
                : "Seleccionar documento"}
            </Text>
          </Pressable>
          {evidenciasCliente.error ? (
            <Text style={styles.errorTexto}>{evidenciasCliente.error}</Text>
          ) : null}
          <Pressable
            testID="guardar-evidencias"
            style={[styles.botonPrimario, styles.botonPrestamo, evidenciasCliente.evidencias.length === 0 && styles.deshabilitado]}
            disabled={evidenciasCliente.evidencias.length === 0 || evidenciasEnviando}
            onPress={guardarEvidenciasCliente}
          >
            {evidenciasEnviando ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.botonTexto}>Guardar evidencias</Text>
            )}
          </Pressable>
          {evidenciasMensaje ? <Text style={styles.errorTexto}>{evidenciasMensaje}</Text> : null}
        </View>
      ) : null}

      {modo === "pago" ? (
        <View testID="form-pago" style={styles.form}>
          <Text style={styles.formTitulo}>Registro de pago</Text>
          <Text style={styles.label}>Tipo</Text>
          <View style={styles.chips}>
            <Pressable
              testID="tipo-cuota"
              style={[styles.chip, tipoPago === "cuota" && styles.chipActivo]}
              onPress={() => setTipoPago("cuota")}
            >
              <Text
                style={
                  tipoPago === "cuota" ? styles.chipTextoActivo : styles.chipTexto
                }
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
                style={
                  tipoPago === "abono" ? styles.chipTextoActivo : styles.chipTexto
                }
              >
                Abono parcial
              </Text>
            </Pressable>
          </View>
          {tipoPago === "cuota" && cuotaPorPagar ? (
            <Text style={styles.detalle}>
              Cuota {cuotaPorPagar.numeroCuota} — {cuotaPorPagar.valorEsperado}
            </Text>
          ) : null}
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
                  style={
                    metodoPago === metodo ? styles.chipTextoActivo : styles.chipTexto
                  }
                >
                  {metodo}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {modo === "no_pago" ? (
        <View testID="form-no-pago" style={styles.form}>
          <Text style={styles.formTitulo}>Motivo de no pago</Text>
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
        </View>
      ) : null}

      {modo === "prestamo" ? (
        <View testID="prestamo-form" style={styles.form}>
          <Text style={styles.formTitulo}>Nuevo préstamo</Text>
          <TextInput
            testID="prestamo-valor"
            style={styles.input}
            placeholder="Valor"
            keyboardType="decimal-pad"
            value={prestamoValor}
            onChangeText={setPrestamoValor}
          />
          <TextInput
            testID="prestamo-cuotas"
            style={styles.input}
            placeholder="Número de cuotas"
            keyboardType="number-pad"
            value={prestamoCuotas}
            onChangeText={setPrestamoCuotas}
          />
          <TextInput
            testID="prestamo-dias"
            style={styles.input}
            placeholder="Días entre cuotas"
            keyboardType="number-pad"
            value={prestamoDias}
            onChangeText={setPrestamoDias}
          />
          <TextInput
            testID="prestamo-interes"
            style={styles.input}
            placeholder="Tipo de interés (%) — opcional"
            keyboardType="decimal-pad"
            value={prestamoInteres}
            onChangeText={setPrestamoInteres}
          />
          {prestamoMensaje ? (
            <Text style={styles.mensaje}>{prestamoMensaje}</Text>
          ) : null}
          <Pressable
            testID="guardar-prestamo"
            style={[styles.botonPrimario, prestamoEnviando && styles.deshabilitado]}
            disabled={prestamoEnviando}
            onPress={guardarPrestamo}
          >
            {prestamoEnviando ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.botonTexto}>Guardar préstamo</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {cuotaEditando || cuotaEliminando ? (
        <View testID="cuota-dialog" style={styles.form}>
          <Text style={styles.formTitulo}>
            {cuotaEditando ? "Editar cuota" : "Eliminar cuota"}
          </Text>
          {cuotaEditando ? (
            <TextInput
              testID="cuota-nuevo-valor"
              style={styles.input}
              placeholder="Nuevo valor"
              keyboardType="decimal-pad"
              value={cuotaNuevoValor}
              onChangeText={setCuotaNuevoValor}
            />
          ) : null}
          <TextInput
            testID="audit-password"
            style={styles.input}
            placeholder="Contraseña (re-autenticación)"
            secureTextEntry
            value={cuotaPassword}
            onChangeText={setCuotaPassword}
          />
          <TextInput
            testID="audit-motivo"
            style={styles.input}
            placeholder="Motivo"
            value={cuotaMotivo}
            onChangeText={setCuotaMotivo}
          />
          {cuotaMensaje ? <Text style={styles.mensaje}>{cuotaMensaje}</Text> : null}
          <Pressable
            testID="guardar-cuota"
            style={[styles.botonPrimario, cuotaEnviando && styles.deshabilitado]}
            disabled={cuotaEnviando}
            onPress={guardarCuota}
          >
            {cuotaEnviando ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.botonTexto}>
                {cuotaEditando ? "Guardar cambios" : "Confirmar eliminación"}
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {modo === "editar" ? (
        <View testID="editar-cliente-form" style={styles.form}>
          <Text style={styles.formTitulo}>Editar datos del cliente</Text>
          <TextInput
            testID="editar-nombre"
            style={styles.input}
            placeholder="Nombre"
            value={edicion.nombre ?? ""}
            onChangeText={(v) => setEdicion((e) => ({ ...e, nombre: v }))}
          />
          <TextInput
            testID="editar-negocio"
            style={styles.input}
            placeholder="Negocio"
            value={edicion.negocio ?? ""}
            onChangeText={(v) => setEdicion((e) => ({ ...e, negocio: v }))}
          />
          <TextInput
            testID="editar-telefono"
            style={styles.input}
            placeholder="WhatsApp"
            keyboardType="phone-pad"
            value={edicion.telefonoWhatsapp ?? ""}
            onChangeText={(v) =>
              setEdicion((e) => ({ ...e, telefonoWhatsapp: v }))
            }
          />
          {mensaje ? <Text style={styles.mensaje}>{mensaje}</Text> : null}
          <Pressable
            testID="guardar-cambio-cliente"
            style={[styles.botonPrimario, editando && styles.deshabilitado]}
            disabled={editando}
            onPress={guardarCambioCliente}
          >
            {editando ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.botonTexto}>Guardar cambios</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {modo === "pago" || modo === "no_pago" ? (
        <>
          {mensaje ? <Text style={styles.mensaje}>{mensaje}</Text> : null}
          <Pressable
            testID="guardar-visita"
            style={[styles.botonPrimario, enviando && styles.deshabilitado]}
            disabled={enviando}
            onPress={enviarVisita}
          >
            {enviando ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.botonTexto}>Guardar</Text>
            )}
          </Pressable>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#f8fafc" },
  scroll: { padding: 16, gap: 12 },
  tarjetaInfo: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 4,
  },
  fila: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nombre: { fontSize: 18, fontWeight: "700" },
  detalle: { color: "#475569", fontSize: 14 },
  seccion: { marginTop: 4 },
  seccionFila: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detalleBoton: { color: "#2563eb", fontSize: 13, fontWeight: "600" },
  seccionTitulo: { fontSize: 14, fontWeight: "700", color: "#334155" },
  sinCuotas: { color: "#64748b", fontSize: 13, marginTop: 4 },
  prestamoItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  prestamoInfo: { flex: 1, marginRight: 8 },
  prestamoValor: { fontSize: 14, fontWeight: "600", color: "#334155" },
  prestamoEstatus: { color: "#64748b", fontSize: 12, marginTop: 2 },
  recuadroCuota: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
  },
  recuadroCuotaMora: { borderColor: "#fca5a5", backgroundColor: "#fef2f2" },
  cuotaLinea: { fontSize: 14, fontWeight: "600" },
  cuotaFecha: { color: "#64748b", fontSize: 12, marginTop: 2 },
  cuotaAcciones: { flexDirection: "row", gap: 8, marginTop: 6 },
  botonCuota: {
    borderWidth: 1,
    borderColor: "#2563eb",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  botonCuotaPeligro: { borderColor: "#dc2626" },
  botonCuotaTexto: { color: "#2563eb", fontSize: 12, fontWeight: "600" },
  botonWhatsApp: { backgroundColor: "#16a34a", marginTop: 10, flex: 0 },
  acciones: { flexDirection: "row", gap: 10, marginTop: 8 },
  navegacion: { flexDirection: "row", gap: 10, marginTop: 10 },
  botonNavegar: { backgroundColor: "#0891b2", paddingVertical: 8 },
  botonPrimario: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    flex: 1,
  },
  botonPago: { backgroundColor: "#16a34a" },
  botonNoPago: { backgroundColor: "#d97706" },
  botonEditar: { backgroundColor: "#64748b" },
  botonEvidencias: { backgroundColor: "#0891b2" },
  botonPrestamo: { backgroundColor: "#7c3aed" },
  botonTexto: { color: "#ffffff", fontWeight: "600" },
  deshabilitado: { backgroundColor: "#93c5fd" },
  form: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 8,
    marginTop: 4,
  },
  formTitulo: { fontSize: 15, fontWeight: "700" },
  label: { fontSize: 13, color: "#475569", marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
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
  mensaje: { color: "#16a34a", fontSize: 14, marginTop: 4 },
  errorTexto: { color: "#dc2626", fontSize: 13, marginTop: 4 },
});