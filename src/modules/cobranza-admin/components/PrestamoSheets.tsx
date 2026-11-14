import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { AdminApiError } from "@core/api/admin";
import { useAdminApi } from "@core/session/use-admin-api";
import { Button, Field, Sheet, TextField, useKit } from "@shared/ui";
import { etiquetaEstadoCuota, formatearCop, formatearFecha } from "@shared/domain/formato-clientes";
import {
  actualizarCuota,
  crearPrestamo,
  eliminarCuota,
  registrarAbono,
  registrarPago,
  type CuotaOut,
  type Loan,
} from "../api";

const METODOS = ["efectivo", "transferencia", "nequi", "daviplata", "otro"];
const ESTADOS_CUOTA = ["pendiente", "pagada", "atrasada", "parcial"];

/** Alta de préstamo: valor, interés, cuotas, días entre cuotas y fecha. */
export function PrestamoSheet({
  visible,
  onClose,
  clienteId,
  onCreado,
}: {
  visible: boolean;
  onClose: () => void;
  clienteId: string;
  onCreado: () => void;
}) {
  const { c } = useKit();
  const api = useAdminApi();
  const [valor, setValor] = useState("");
  const [cuotas, setCuotas] = useState("4");
  const [interes, setInteres] = useState("0");
  const [dias, setDias] = useState("7");
  const [fecha, setFecha] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- al abrir la hoja se reinicia el formulario */
  useEffect(() => {
    if (!visible) return;
    setValor("");
    setCuotas("4");
    setInteres("0");
    setDias("7");
    setFecha(new Date().toISOString().slice(0, 10));
    setError(null);
  }, [visible]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const guardar = async () => {
    const valorNumero = Number(valor);
    const cuotasNumero = Number(cuotas);
    const interesNumero = Number(interes);
    const diasNumero = Number(dias);
    if (!Number.isFinite(valorNumero) || valorNumero <= 0) {
      setError("El valor del préstamo debe ser mayor a cero.");
      return;
    }
    if (!Number.isInteger(cuotasNumero) || cuotasNumero < 1) {
      setError("El número de cuotas debe ser al menos 1.");
      return;
    }
    if (!Number.isFinite(interesNumero) || interesNumero < 0) {
      setError("El interés no puede ser negativo.");
      return;
    }
    if (!Number.isInteger(diasNumero) || diasNumero < 1) {
      setError("Los días entre cuotas deben ser al menos 1.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await crearPrestamo(api, clienteId, {
        valor: valorNumero,
        num_cuotas: cuotasNumero,
        tipo_interes: interesNumero,
        dias_entre_cuotas: diasNumero,
        fecha_otorgado: fecha || null,
      });
      onCreado();
      onClose();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo crear el préstamo.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Nuevo préstamo"
      description="Genera el plan de cuotas y descuenta el desembolso de la caja de la cartera."
      testID="prestamo-form"
      footer={
        <View style={styles.pie}>
          <Button variant="secondary" onPress={onClose} disabled={guardando} style={styles.flex}>
            Cancelar
          </Button>
          <Button testID="prestamo-crear" loading={guardando} onPress={() => void guardar()} style={styles.flex}>
            Crear préstamo
          </Button>
        </View>
      }
    >
      <View style={styles.contenido}>
        <Field label="Valor prestado" required>
          <TextField testID="prestamo-valor" value={valor} onChangeText={setValor} keyboardType="number-pad" />
        </Field>
        <Field label="Interés (%)">
          <TextField testID="prestamo-interes" value={interes} onChangeText={setInteres} keyboardType="number-pad" />
        </Field>
        <Field label="Cuotas">
          <TextField testID="prestamo-cuotas" value={cuotas} onChangeText={setCuotas} keyboardType="number-pad" />
        </Field>
        <Field label="Días entre cuotas">
          <TextField testID="prestamo-dias" value={dias} onChangeText={setDias} keyboardType="number-pad" />
        </Field>
        <Field label="Fecha otorgado" hint="Formato AAAA-MM-DD">
          <TextField testID="prestamo-fecha" value={fecha} onChangeText={setFecha} maxLength={10} />
        </Field>
        {error ? (
          <Text testID="prestamo-error" style={[shType.dense, { color: c.statusDangerFg }]}>
            {error}
          </Text>
        ) : null}
      </View>
    </Sheet>
  );
}

/** Pago de una cuota o abono libre al préstamo. */
export function MovimientoSheet({
  visible,
  onClose,
  prestamo,
  tipo,
  onGuardado,
}: {
  visible: boolean;
  onClose: () => void;
  prestamo: Loan;
  tipo: "pago" | "abono";
  onGuardado: () => void;
}) {
  const { c, relleno } = useKit();
  const api = useAdminApi();
  const [valor, setValor] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  const [cuotaId, setCuotaId] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendientes = prestamo.cuotas.filter((cuota) => (cuota.estatus ?? cuota.estado) !== "pagada");

  /* eslint-disable react-hooks/set-state-in-effect -- al abrir la hoja se reinicia el formulario */
  useEffect(() => {
    if (!visible) return;
    setValor("");
    setMetodo("efectivo");
    setCuotaId("");
    setError(null);
  }, [visible]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const guardar = async () => {
    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero <= 0) {
      setError("Escribe un valor mayor a cero.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      if (tipo === "pago") {
        await registrarPago(api, prestamo.id, {
          valor: numero,
          metodo_pago: metodo,
          cuota_id: cuotaId || null,
        });
      } else {
        await registrarAbono(api, prestamo.id, { valor: numero, metodo_pago: metodo });
      }
      onGuardado();
      onClose();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo registrar el movimiento.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={tipo === "pago" ? "Registrar pago" : "Registrar abono"}
      description={
        tipo === "pago"
          ? "El pago puede asociarse a una cuota y suma a la caja."
          : "Abono al saldo del préstamo sin marcar cuota; suma a la caja."
      }
      testID="movimiento-form"
      footer={
        <View style={styles.pie}>
          <Button variant="secondary" onPress={onClose} disabled={guardando} style={styles.flex}>
            Cancelar
          </Button>
          <Button testID="movimiento-guardar" loading={guardando} onPress={() => void guardar()} style={styles.flex}>
            {tipo === "pago" ? "Registrar pago" : "Registrar abono"}
          </Button>
        </View>
      }
    >
      <View style={styles.contenido}>
        <Field label="Valor" required>
          <TextField testID="movimiento-valor" value={valor} onChangeText={setValor} keyboardType="number-pad" />
        </Field>
        {tipo === "pago" && pendientes.length > 0 ? (
          <View style={styles.campo}>
            <Text style={[shType.label, { color: c.text }]}>Cuota (opcional)</Text>
            <View style={styles.chips}>
              <Opcion
                testID="movimiento-cuota-sin"
                label="Sin cuota"
                selected={!cuotaId}
                onPress={() => setCuotaId("")}
              />
              {pendientes.map((cuota) => (
                <Opcion
                  key={cuota.id}
                  testID={`movimiento-cuota-${cuota.id}`}
                  label={`#${cuota.numero} · ${formatearCop(cuota.valor)}`}
                  selected={cuotaId === cuota.id}
                  onPress={() => {
                    setCuotaId(cuota.id);
                    setValor(String(cuota.valor));
                  }}
                />
              ))}
            </View>
          </View>
        ) : null}
        <View style={styles.campo}>
          <Text style={[shType.label, { color: c.text }]}>Método</Text>
          <View style={styles.chips}>
            {METODOS.map((item) => (
              <Pressable
                key={item}
                testID={`movimiento-metodo-${item}`}
                accessibilityRole="radio"
                accessibilityLabel={item}
                accessibilityState={{ selected: metodo === item }}
                onPress={() => setMetodo(item)}
                style={[
                  styles.opcion,
                  {
                    borderColor: metodo === item ? relleno.primario : c.controlBorder,
                    backgroundColor: metodo === item ? relleno.primario : c.surface,
                  },
                ]}
              >
                <Text style={[shType.label, { color: metodo === item ? relleno.sobrePrimario : c.text }]}>
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        {error ? (
          <Text testID="movimiento-error" style={[shType.dense, { color: c.statusDangerFg }]}>
            {error}
          </Text>
        ) : null}
      </View>
    </Sheet>
  );
}

/** Edición y borrado de una cuota del plan. */
export function CuotaSheet({
  visible,
  onClose,
  cuota,
  onGuardado,
}: {
  visible: boolean;
  onClose: () => void;
  cuota: CuotaOut;
  onGuardado: () => void;
}) {
  const { c, relleno } = useKit();
  const api = useAdminApi();
  const [valor, setValor] = useState("");
  const [vence, setVence] = useState("");
  const [estatus, setEstatus] = useState("pendiente");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- al abrir la hoja se reinicia el formulario */
  useEffect(() => {
    if (!visible) return;
    setValor(String(cuota.valor ?? cuota.monto ?? ""));
    setVence(cuota.vence ?? cuota.fecha_vencimiento ?? "");
    setEstatus(cuota.estatus ?? cuota.estado ?? "pendiente");
    setError(null);
  }, [visible, cuota]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const guardar = async () => {
    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero <= 0) {
      setError("El valor de la cuota debe ser mayor a cero.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await actualizarCuota(api, cuota.id, { valor: numero, vence, estatus });
      onGuardado();
      onClose();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo guardar la cuota.");
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = () => {
    Alert.alert("Eliminar cuota", `¿Eliminar la cuota #${cuota.numero} del plan?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => {
          setGuardando(true);
          void eliminarCuota(api, cuota.id)
            .then(() => {
              onGuardado();
              onClose();
            })
            .catch((err) => {
              setError(err instanceof AdminApiError ? err.message : "No se pudo eliminar la cuota.");
            })
            .finally(() => setGuardando(false));
        },
      },
    ]);
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={`Cuota #${cuota.numero}`}
      description="Ajusta el valor, el vencimiento o el estado; también puedes eliminarla del plan."
      testID="cuota-form"
      footer={
        <View style={styles.pie}>
          <Button variant="danger" onPress={eliminar} disabled={guardando} style={styles.flex}>
            Eliminar
          </Button>
          <Button testID="cuota-guardar" loading={guardando} onPress={() => void guardar()} style={styles.flex}>
            Guardar cuota
          </Button>
        </View>
      }
    >
      <View style={styles.contenido}>
        <Field label="Valor" required>
          <TextField testID="cuota-valor" value={valor} onChangeText={setValor} keyboardType="number-pad" />
        </Field>
        <Field label="Vence" hint="Formato AAAA-MM-DD">
          <TextField testID="cuota-vence" value={vence} onChangeText={setVence} maxLength={10} />
        </Field>
        <View style={styles.campo}>
          <Text style={[shType.label, { color: c.text }]}>Estado</Text>
          <View style={styles.chips}>
            {ESTADOS_CUOTA.map((item) => (
              <Pressable
                key={item}
                testID={`cuota-estado-${item}`}
                accessibilityRole="radio"
                accessibilityLabel={etiquetaEstadoCuota(item)}
                accessibilityState={{ selected: estatus === item }}
                onPress={() => setEstatus(item)}
                style={[
                  styles.opcion,
                  {
                    borderColor: estatus === item ? relleno.primario : c.controlBorder,
                    backgroundColor: estatus === item ? relleno.primario : c.surface,
                  },
                ]}
              >
                <Text style={[shType.label, { color: estatus === item ? relleno.sobrePrimario : c.text }]}>
                  {etiquetaEstadoCuota(item)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Text style={[shType.caption, { color: c.textMuted }]}>
          Creada para vencer el {formatearFecha(cuota.vence ?? cuota.fecha_vencimiento)}.
        </Text>
        {error ? (
          <Text testID="cuota-error" style={[shType.dense, { color: c.statusDangerFg }]}>
            {error}
          </Text>
        ) : null}
      </View>
    </Sheet>
  );
}

function Opcion({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
}) {
  const { c, relleno } = useKit();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.opcion,
        {
          borderColor: selected ? relleno.primario : c.controlBorder,
          backgroundColor: selected ? relleno.primario : c.surface,
        },
      ]}
    >
      <Text style={[shType.label, { color: selected ? relleno.sobrePrimario : c.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenido: { gap: shSpace[3] },
  campo: { gap: shSpace[2] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[2] },
  opcion: {
    justifyContent: "center",
    minHeight: shDensity.controlLg,
    borderWidth: 1,
    borderRadius: shRadius.pill,
    paddingHorizontal: shSpace[3],
  },
  pie: { flexDirection: "row", gap: shSpace[2], flex: 1 },
  flex: { flex: 1 },
});
