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
import { CargaError } from "../components/CargaError";
import { ColorBadge } from "../components/ColorBadge";
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
import { validarFechaPrometida, validarMonto } from "../features/visita/validaciones";
import type { RootStackParamList } from "../navigation/types";
import { useOffline } from "../offline/offline-context";
import { guardarCliente, leerCliente } from "../offline/cache";
import { useSession } from "../session/session-context";
import type {
  ClienteTarjetaPublic,
  CuotaPublic,
  PrestamoPublic,
} from "../types/cobrador";

type Props = NativeStackScreenProps<RootStackParamList, "Cliente">;

function esPendienteOArrasada(cuota: CuotaPublic): boolean {
  return cuota.estatus === "pendiente" || cuota.estatus === "atrasada";
}

export function ClienteScreen({ route }: Props) {
  const { rutaId, clienteId, latitud, longitud } = route.params;
  const { api, logout } = useSession();
  const offline = useOffline();

  const [tarjeta, setTarjeta] = useState<ClienteTarjetaPublic | null>(null);
  const [prestamos, setPrestamos] = useState<PrestamoPublic[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [modo, setModo] = useState<"pago" | "no_pago" | "editar" | null>(null);
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
  const [modoPrestamo, setModoPrestamo] = useState(false);
  const [prestamoValor, setPrestamoValor] = useState("");
  const [prestamoCuotas, setPrestamoCuotas] = useState("");
  const [prestamoDias, setPrestamoDias] = useState("");
  const [prestamoInteres, setPrestamoInteres] = useState("");
  const [prestamoEnviando, setPrestamoEnviando] = useState(false);
  const [prestamoMensaje, setPrestamoMensaje] = useState<string | null>(null);

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
      setModoPrestamo(false);
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

  if (!tarjeta) {
    return <CargaError cargando={!error} error={error} onReintentar={cargar} />;
  }

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={styles.scroll}>
      <View style={styles.tarjetaInfo}>
        {tarjeta.fotoUrl ? (
          <Image
            testID="foto-cliente"
            source={{ uri: tarjeta.fotoUrl }}
            style={styles.foto}
          />
        ) : null}
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
        ) : null}
      </View>

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
            setModoPrestamo(true);
            setMensaje(null);
            setPrestamoMensaje(null);
          }}
        >
          <Text style={styles.botonTexto}>Nuevo préstamo</Text>
        </Pressable>
        <Pressable
          testID="btn-editar-cliente"
          style={[styles.botonPrimario, styles.botonEditar]}
          onPress={() => {
            setModo("editar");
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
            setModo("pago");
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
            setModo("no_pago");
            setMensaje(null);
          }}
        >
          <Text style={styles.botonTexto}>Registrar no pago</Text>
        </Pressable>
      </View>

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

      {modoPrestamo ? (
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
  foto: {
    width: 72,
    height: 72,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#e2e8f0",
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
});