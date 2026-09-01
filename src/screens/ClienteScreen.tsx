import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
  const { rutaId, clienteId } = route.params;
  const { api, logout } = useSession();
  const offline = useOffline();

  const [tarjeta, setTarjeta] = useState<ClienteTarjetaPublic | null>(null);
  const [prestamos, setPrestamos] = useState<PrestamoPublic[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [modo, setModo] = useState<"pago" | "no_pago" | null>(null);
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
    () =>
      prestamoVigente?.cuotas.find(esPendienteOArrasada) ??
      prestamoVigente?.cuotas[0],
    [prestamoVigente],
  );

  async function enviarVisita() {
    if (!prestamoVigente) {
      setMensaje("El cliente no tiene préstamos vigentes.");
      return;
    }
    if (modo === "pago") {
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
          await offline.encolar("visita", input);
          setModo(null);
          setValor("");
          setMensaje("Guardado sin conexión (se sincronizará).");
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
          await offline.encolar("visita", input);
          setModo(null);
          setFechaPrometida("");
          setValorPrometido("");
          setMensaje("Guardado sin conexión (se sincronizará).");
        } else {
          setMensaje("No se pudo registrar la visita.");
        }
      } finally {
        setEnviando(false);
      }
    }
  }

  if (!tarjeta) {
    return <CargaError cargando={!error} error={error} onReintentar={cargar} />;
  }

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={styles.scroll}>
      <View style={styles.tarjetaInfo}>
        <View style={styles.fila}>
          <Text style={styles.nombre}>{tarjeta.nombre}</Text>
          <ColorBadge color={tarjeta.color} />
        </View>
        {tarjeta.negocio ? (
          <Text style={styles.detalle}>Negocio: {tarjeta.negocio}</Text>
        ) : null}
        <Text style={styles.detalle}>WhatsApp: {tarjeta.telefonoWhatsapp}</Text>
        <Text style={styles.detalle}>
          Saldo pendiente: {tarjeta.saldoPendiente} | Mora: {tarjeta.diasMora} días
        </Text>
      </View>

      {prestamoVigente && cuotaPorPagar ? (
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Próxima cuota</Text>
          <Text style={styles.detalle}>
            Cuota {cuotaPorPagar.numeroCuota} — {cuotaPorPagar.valorEsperado}{" "}
            ({cuotaPorPagar.estatus})
          </Text>
        </View>
      ) : null}

      <View style={styles.acciones}>
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

      {modo ? (
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
  seccionTitulo: { fontSize: 14, fontWeight: "700", color: "#334155" },
  acciones: { flexDirection: "row", gap: 10, marginTop: 8 },
  botonPrimario: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    flex: 1,
  },
  botonPago: { backgroundColor: "#16a34a" },
  botonNoPago: { backgroundColor: "#d97706" },
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