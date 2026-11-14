import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { AdminApiError } from "@core/api/admin";
import { useAdminApi } from "@core/session/use-admin-api";
import { Button, Field, Sheet, TextField, useKit } from "@shared/ui";
import { RIESGO_LABEL, TIPO_DOCUMENTO_LABEL } from "@shared/domain/formato-clientes";
import {
  actualizarCliente,
  crearCliente,
  type ClientIn,
  type ClientRow,
  type PortfolioRow,
} from "../api";

const TIPOS = Object.entries(TIPO_DOCUMENTO_LABEL);
const RIESGOS = Object.entries(RIESGO_LABEL);

/** Alta y edición de un cliente de cartera (mismos campos que el panel). */
export function ClienteFormSheet({
  visible,
  onClose,
  carteras,
  cliente,
  carteraInicial,
  onGuardado,
}: {
  visible: boolean;
  onClose: () => void;
  carteras: PortfolioRow[];
  cliente?: ClientRow | null;
  carteraInicial?: string;
  onGuardado: (cliente: ClientRow) => void;
}) {
  const { c } = useKit();
  const api = useAdminApi();
  const editando = Boolean(cliente);
  const listaCarteras = Array.isArray(carteras) ? carteras : [];
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [negocio, setNegocio] = useState("");
  const [carteraId, setCarteraId] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("cc");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [tope, setTope] = useState("0");
  const [riesgo, setRiesgo] = useState("blanco");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- al abrir la hoja se reinicia el formulario */
  useEffect(() => {
    if (!visible) return;
    setNombre(cliente?.nombre ?? "");
    setApellido(cliente?.apellido ?? "");
    setTelefono(cliente?.telefono ?? "");
    setNegocio(cliente?.negocio ?? "");
    setCarteraId(cliente?.cartera_id ?? carteraInicial ?? (Array.isArray(carteras) ? carteras[0]?.id : undefined) ?? "");
    setTipoDocumento(cliente?.tipo_documento ?? "cc");
    setNumeroDocumento(cliente?.numero_documento ?? "");
    setTope(String(cliente?.tope_maximo_deuda ?? 0));
    setRiesgo(cliente?.color_riesgo ?? "blanco");
    setError(null);
  }, [visible, cliente, carteraInicial, carteras]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const guardar = async () => {
    if (!nombre.trim()) {
      setError("Escribe el nombre del cliente.");
      return;
    }
    if (!carteraId) {
      setError("Elige la cartera del cliente.");
      return;
    }
    const topeNumero = Number(tope);
    if (!Number.isFinite(topeNumero) || topeNumero < 0) {
      setError("El tope de deuda debe ser un número mayor o igual a cero.");
      return;
    }
    const datos: ClientIn = {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      telefono: telefono.trim(),
      negocio: negocio.trim(),
      cartera_id: carteraId,
      tipo_documento: tipoDocumento,
      numero_documento: numeroDocumento.trim(),
      tope_maximo_deuda: topeNumero,
      color_riesgo: riesgo,
    };
    setGuardando(true);
    setError(null);
    try {
      const resultado = cliente
        ? await actualizarCliente(api, cliente.id, datos)
        : await crearCliente(api, datos);
      onGuardado(resultado);
      onClose();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo guardar el cliente.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editando ? "Editar cliente" : "Nuevo cliente"}
      description="El cliente pertenece a una cartera; los préstamos se registran desde su ficha."
      testID="cliente-form"
      footer={
        <View style={styles.pie}>
          <Button variant="secondary" onPress={onClose} disabled={guardando} style={styles.flex}>
            Cancelar
          </Button>
          <Button testID="cliente-form-guardar" loading={guardando} onPress={() => void guardar()} style={styles.flex}>
            {editando ? "Guardar cambios" : "Crear cliente"}
          </Button>
        </View>
      }
    >
      <View style={styles.contenido}>
        <Field label="Nombre" required>
          <TextField testID="cliente-form-nombre" value={nombre} onChangeText={setNombre} maxLength={120} />
        </Field>
        <Field label="Apellido">
          <TextField testID="cliente-form-apellido" value={apellido} onChangeText={setApellido} maxLength={120} />
        </Field>
        <Field label="Teléfono (WhatsApp)">
          <TextField
            testID="cliente-form-telefono"
            value={telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
            maxLength={30}
          />
        </Field>
        <Field label="Negocio">
          <TextField testID="cliente-form-negocio" value={negocio} onChangeText={setNegocio} maxLength={120} />
        </Field>

        <Campo titulo="Cartera">
          <View style={styles.chips}>
            {listaCarteras.map((cartera) => (
              <Opcion
                key={cartera.id}
                testID={`cliente-form-cartera-${cartera.id}`}
                label={cartera.nombre}
                selected={carteraId === cartera.id}
                onPress={() => setCarteraId(cartera.id)}
              />
            ))}
          </View>
        </Campo>

        <Campo titulo="Tipo de documento">
          <View style={styles.chips}>
            {TIPOS.map(([valor, label]) => (
              <Opcion
                key={valor}
                testID={`cliente-form-tipo-${valor}`}
                label={label}
                selected={tipoDocumento === valor}
                onPress={() => setTipoDocumento(valor)}
              />
            ))}
          </View>
        </Campo>
        <Field label="Número de documento">
          <TextField
            testID="cliente-form-documento"
            value={numeroDocumento}
            onChangeText={setNumeroDocumento}
            maxLength={40}
          />
        </Field>

        <Field label="Tope de deuda">
          <TextField
            testID="cliente-form-tope"
            value={tope}
            onChangeText={setTope}
            keyboardType="number-pad"
          />
        </Field>

        <Campo titulo="Color de riesgo">
          <View style={styles.chips}>
            {RIESGOS.map(([valor, label]) => (
              <Opcion
                key={valor}
                testID={`cliente-form-riesgo-${valor}`}
                label={label}
                selected={riesgo === valor}
                onPress={() => setRiesgo(valor)}
              />
            ))}
          </View>
        </Campo>

        {error ? (
          <Text testID="cliente-form-error" style={[shType.dense, { color: c.statusDangerFg }]}>
            {error}
          </Text>
        ) : null}
      </View>
    </Sheet>
  );
}

function Campo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const { c } = useKit();
  return (
    <View style={styles.campo}>
      <Text style={[shType.label, { color: c.text }]}>{titulo}</Text>
      {children}
    </View>
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
