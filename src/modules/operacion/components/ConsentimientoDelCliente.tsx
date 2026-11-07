import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { Badge, Button, TextField, useKit } from "@shared/ui";
import { useAdminApi } from "@core/session/use-admin-api";
import {
  consentimientoDelCliente,
  registrarConsentimiento,
  type Consentimiento,
  type ConsentimientoIn,
} from "../api";
import {
  AVISO_BAJA_DEL_CLIENTE,
  AVISO_SOLO_PROPIETARIO,
  esBajaDelCliente,
  mensajeDeErrorAlGuardarConsentimiento,
} from "../consentimiento-promos";

const ESTADOS: Record<
  Consentimiento["estado"],
  { label: string; tone: "success" | "danger" | "neutral"; icon: "check-circle" | "block" | "help-outline" }
> = {
  otorgado: { label: "Acepta promociones", tone: "success", icon: "check-circle" },
  revocado: { label: "Se dio de baja", tone: "danger", icon: "block" },
  sin_registro: { label: "Sin consentimiento", tone: "neutral", icon: "help-outline" },
};

const COMO: { value: ConsentimientoIn["como"]; label: string }[] = [
  { value: "en_el_local", label: "En el local" },
  { value: "por_telefono", label: "Por teléfono" },
  { value: "por_escrito", label: "Por escrito" },
  { value: "otro", label: "Otro" },
];

/**
 * Consentimiento para promociones (HU-CRM-06): solo quien aceptó recibe un
 * envío. Se marca con cómo se obtuvo y queda quién lo marcó; nunca se edita lo
 * anterior, se agrega.
 *
 * D-SPEC-33-9: registrar que aceptó es solo del propietario (o la plataforma) y nunca sobre una baja que
 * pidió el cliente o impuso Meta; registrar que ya no acepta sigue abierto a quien tiene Clientes en
 * escritura. El servidor lo exige igual (403 / 409 `baja_del_cliente`); aquí no se ofrece lo que no se puede.
 */
export function ConsentimientoDelCliente({
  leadId,
  esPropietario = false,
}: {
  leadId: string;
  /** Propietario o admin de plataforma. Sin esto no se ofrece «Aceptó recibir promociones». */
  esPropietario?: boolean;
}) {
  const { c, relleno } = useKit();
  const api = useAdminApi();
  const [datos, setDatos] = useState<Consentimiento | null>(null);
  const [marcando, setMarcando] = useState(false);
  const [como, setComo] = useState<ConsentimientoIn["como"]>("en_el_local");
  const [evidencia, setEvidencia] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setDatos(await consentimientoDelCliente(api, leadId));
      setError(null);
    } catch {
      setError("No pudimos cargar el consentimiento.");
    }
  }, [api, leadId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial tras el await
    void cargar();
  }, [cargar]);

  async function guardar(estado: ConsentimientoIn["estado"]) {
    setCargando(true);
    try {
      const siguiente = await registrarConsentimiento(api, leadId, {
        estado,
        como: estado === "revocado" ? "otro" : como,
        evidencia,
      });
      setDatos(siguiente);
      setMarcando(false);
      setEvidencia("");
      setError(null);
    } catch (e) {
      // Pudo llegar una baja del cliente mientras estaba el formulario abierto: se vuelve a leer el estado
      // (que limpia el error) y después se muestra el motivo.
      if (estado === "otorgado") await cargar();
      setError(mensajeDeErrorAlGuardarConsentimiento(e));
    } finally {
      setCargando(false);
    }
  }

  const estado = ESTADOS[datos?.estado ?? "sin_registro"];
  const ultimo = datos?.historial[0];
  const bajaDelCliente = esBajaDelCliente(datos);
  const puedeMarcarQueAcepto = esPropietario && !bajaDelCliente;

  return (
    <View style={styles.contenedor}>
      <View style={styles.cabecera}>
        <Text style={[shType.label, { color: c.text }]}>Promociones</Text>
        <Badge size="sm" tone={estado.tone} icon={estado.icon} label={estado.label} testID="consentimiento-estado" />
      </View>
      {ultimo ? (
        <Text style={[shType.caption, { color: c.textMuted }]}>
          {ultimo.origen.replace(/_/g, " ")} por {ultimo.quien}
          {ultimo.evidencia ? ` · ${ultimo.evidencia}` : ""}
        </Text>
      ) : null}

      {bajaDelCliente ? (
        <Text testID="consentimiento-baja-del-cliente" style={[shType.caption, { color: c.textMuted }]}>
          {AVISO_BAJA_DEL_CLIENTE}
        </Text>
      ) : null}
      {!bajaDelCliente && !esPropietario && datos && datos.estado !== "otorgado" ? (
        <Text testID="consentimiento-solo-propietario" style={[shType.caption, { color: c.textMuted }]}>
          {AVISO_SOLO_PROPIETARIO}
        </Text>
      ) : null}

      {!marcando || !puedeMarcarQueAcepto ? (
        <View style={styles.acciones}>
          {datos && datos.estado !== "otorgado" && puedeMarcarQueAcepto ? (
            <Button
              testID="consentimiento-marcar"
              variant="secondary"
              size="sm"
              disabled={cargando}
              onPress={() => setMarcando(true)}
            >
              Aceptó recibir promociones
            </Button>
          ) : null}
          {datos?.estado === "otorgado" ? (
            <Button
              testID="consentimiento-revocar"
              variant="secondary"
              size="sm"
              loading={cargando}
              onPress={() => void guardar("revocado")}
            >
              Ya no quiere promociones
            </Button>
          ) : null}
        </View>
      ) : (
        <View style={[styles.formulario, { borderColor: c.borderSoft }]}>
          <Text style={[shType.caption, { color: c.textMuted }]}>
            Márcalo solo si el cliente aceptó. Queda registrado con tu nombre, cómo lo obtuviste y el detalle, que es
            obligatorio: es la prueba de que aceptó.
          </Text>
          <View style={styles.chips}>
            {COMO.map((opcion) => (
              <Pressable
                key={opcion.value}
                testID={`consentimiento-como-${opcion.value}`}
                accessibilityRole="radio"
                accessibilityLabel={opcion.label}
                accessibilityState={{ selected: como === opcion.value }}
                onPress={() => setComo(opcion.value)}
                style={[
                  styles.chip,
                  {
                    borderColor: como === opcion.value ? relleno.primario : c.controlBorder,
                    backgroundColor: como === opcion.value ? relleno.primario : c.surface,
                  },
                ]}
              >
                <Text style={[shType.label, { color: como === opcion.value ? relleno.sobrePrimario : c.text }]}>
                  {opcion.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextField
            testID="consentimiento-evidencia"
            accessibilityLabel={como === "otro" ? "Cuéntalo (obligatorio)" : "Detalle (obligatorio)"}
            value={evidencia}
            onChangeText={setEvidencia}
            maxLength={400}
            placeholder={como === "otro" ? "Cuéntalo (obligatorio)" : "Detalle obligatorio. Ej.: firmó la planilla del local"}
          />
          <View style={styles.acciones}>
            <Button
              variant="secondary"
              size="sm"
              disabled={cargando}
              onPress={() => setMarcando(false)}
            >
              Cancelar
            </Button>
            <Button
              testID="consentimiento-guardar"
              size="sm"
              loading={cargando}
              disabled={!evidencia.trim()}
              onPress={() => void guardar("otorgado")}
            >
              Guardar
            </Button>
          </View>
        </View>
      )}

      {error ? (
        <Text testID="consentimiento-error" style={[shType.dense, { color: c.statusDangerFg }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: shSpace[2] },
  cabecera: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: shSpace[2] },
  acciones: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[2] },
  formulario: { gap: shSpace[2], borderWidth: 1, borderRadius: shRadius.sm, padding: shSpace[3] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[2] },
  chip: {
    justifyContent: "center",
    minHeight: shDensity.controlMd,
    borderWidth: 1,
    borderRadius: shRadius.pill,
    paddingHorizontal: shSpace[3],
  },
});
