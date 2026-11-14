import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { shSpace, shType } from "@core/theme/tokens";
import { useAdminApi } from "@core/session/use-admin-api";
import { AdminApiError } from "@core/api/admin";
import { Button, Card, Field, SelectorFechaHora, TextField, useKit } from "@shared/ui";
import {
  editarCamposDelPack,
  marcarSeguimientoHecho,
  type CampoEditable,
  type FichaDelCliente,
} from "../api";
import { PACK_DE_ETAPA } from "../etapas";
import { BadgeDeClasificacion } from "./ClienteCard";
import {
  cuerpoDeSeguimiento,
  ESTADO_DE_SEGUIMIENTO,
  fechaDePared,
  NOTA_MAX,
  paredDeFecha,
  seguimientoDeFila,
  sugerenciaDeSeguimiento,
  textoDeHoraDelNegocio,
} from "../seguimiento";

type Modo = "ver" | "editar" | "hecho";

/** Mensaje de una falla: el motivo del servidor si lo rechazó; si no, que no hay conexión (los datos siguen aquí). */
function mensajeDeFalla(err: unknown): string {
  if (err instanceof AdminApiError && err.status >= 400 && err.status < 500) return err.message;
  return "No se pudo guardar. Revisa tu conexión: lo que escribiste sigue aquí.";
}

/**
 * Próxima acción del lead y cuándo (HU-CRM-21): se programa, se mueve, se quita o se marca como hecho
 * (y se programa el siguiente en el mismo gesto). La hora es la del negocio, no la del teléfono. Sin
 * permiso de escritura solo se ve. Si falla el guardado (sin conexión) el formulario conserva lo escrito.
 */
export function SeguimientoDelLead({
  clienteId,
  editables,
  extras,
  tieneLead,
  puedeEditar,
  onGuardado,
  onRecargar,
}: {
  clienteId: string;
  editables: CampoEditable[];
  extras?: Record<string, unknown> | null;
  /** El cliente ya tiene lead de venta; si no, programar el seguimiento le crea uno. */
  tieneLead: boolean;
  puedeEditar: boolean;
  onGuardado: (ficha: FichaDelCliente) => void;
  /** Vuelve a pedir la ficha (tras «hecho», que no devuelve la ficha). */
  onRecargar: () => Promise<void> | void;
}) {
  const { c } = useKit();
  const api = useAdminApi();
  const nota = editables.find((e) => e.key === "seguimiento_nota");
  const fecha = editables.find((e) => e.key === "seguimiento_en");
  const [modo, setModo] = useState<Modo>("ver");
  const [textoNota, setTextoNota] = useState("");
  const [valorFecha, setValorFecha] = useState<Date>(() => sugerenciaDeSeguimiento());
  const [siguienteNota, setSiguienteNota] = useState("");
  const [siguienteFecha, setSiguienteFecha] = useState<Date | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!nota || !fecha) return null;

  const programada = fecha.value ? fechaDePared(fecha.value) : null;
  const estadoCrudo = seguimientoDeFila({ extras })?.estado ?? null;
  const estado = estadoCrudo ? ESTADO_DE_SEGUIMIENTO[estadoCrudo] : null;
  const notaActual = nota.value ?? "";

  const abrirEdicion = () => {
    setTextoNota(notaActual);
    setValorFecha(programada ?? sugerenciaDeSeguimiento());
    setError(null);
    setModo("editar");
  };
  const abrirHecho = () => {
    setSiguienteNota("");
    setSiguienteFecha(null);
    setError(null);
    setModo("hecho");
  };
  const cancelar = () => {
    setError(null);
    setModo("ver");
  };

  const guardar = async (cuerpo: Record<string, string>) => {
    setOcupado(true);
    try {
      onGuardado(await editarCamposDelPack(api, clienteId, PACK_DE_ETAPA, cuerpo));
      setError(null);
      setModo("ver");
    } catch (err) {
      setError(mensajeDeFalla(err));
    } finally {
      setOcupado(false);
    }
  };

  const terminar = async () => {
    setOcupado(true);
    try {
      await marcarSeguimientoHecho(
        api,
        clienteId,
        siguienteFecha ? { en: paredDeFecha(siguienteFecha), nota: siguienteNota.trim().slice(0, NOTA_MAX) } : undefined,
      );
      await onRecargar();
      setError(null);
      setModo("ver");
    } catch (err) {
      setError(mensajeDeFalla(err));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Card testID="seguimiento-lead">
      <View style={styles.titulo}>
        <Text style={[shType.block, { color: c.text }]} accessibilityRole="header">
          Próxima acción
        </Text>
        {estado ? (
          <BadgeDeClasificacion tone={estado.tono} icon={estado.icono} label={estado.texto} testID="seguimiento-estado" />
        ) : null}
      </View>

      {modo === "ver" ? (
        <>
          {programada ? (
            <View style={styles.bloque}>
              <Text testID="seguimiento-nota" style={[shType.body, { color: c.text }]}>
                {notaActual || "Sin nota"}
              </Text>
              <Text testID="seguimiento-fecha" style={[shType.dense, { color: c.textMuted }]}>
                {textoDeHoraDelNegocio(fecha.value ?? "")} · hora del negocio
              </Text>
            </View>
          ) : (
            <Text testID="seguimiento-vacio" style={[shType.dense, { color: c.textMuted }]}>
              Sin seguimiento programado.
            </Text>
          )}
          {puedeEditar ? (
            <View style={styles.acciones}>
              {programada ? (
                <Button testID="seguimiento-hecho" variant="primary" size="sm" iconLeft="check-circle" onPress={abrirHecho}>
                  Marcar como hecho
                </Button>
              ) : null}
              <Button testID="seguimiento-editar" variant="secondary" size="sm" iconLeft="event" onPress={abrirEdicion}>
                {programada ? "Cambiar" : "Programar"}
              </Button>
              {programada ? (
                <Button
                  testID="seguimiento-quitar"
                  variant="link"
                  size="sm"
                  loading={ocupado}
                  onPress={() => void guardar(cuerpoDeSeguimiento("", null))}
                >
                  Quitar
                </Button>
              ) : null}
            </View>
          ) : null}
          {!tieneLead && puedeEditar && !programada ? (
            <Text style={[shType.caption, { color: c.textMuted }]}>
              Al programarlo se crea el lead de venta de este cliente.
            </Text>
          ) : null}
        </>
      ) : null}

      {modo === "editar" ? (
        <View style={styles.bloque}>
          <Field label="¿Qué hay que hacer?" hint={`Hasta ${NOTA_MAX} caracteres`}>
            <TextField
              testID="seguimiento-input-nota"
              value={textoNota}
              onChangeText={setTextoNota}
              maxLength={nota.max_length || NOTA_MAX}
              placeholder="Ej.: llamar para confirmar la cotización"
            />
          </Field>
          <SelectorFechaHora label="Cuándo (hora del negocio)" valor={valorFecha} onChange={setValorFecha} required testID="seguimiento-input-fecha" />
          <View style={styles.acciones}>
            <Button
              testID="seguimiento-guardar"
              size="sm"
              loading={ocupado}
              onPress={() => void guardar(cuerpoDeSeguimiento(textoNota, valorFecha))}
            >
              Guardar
            </Button>
            <Button testID="seguimiento-cancelar" variant="secondary" size="sm" onPress={cancelar}>
              Cancelar
            </Button>
          </View>
        </View>
      ) : null}

      {modo === "hecho" ? (
        <View style={styles.bloque}>
          <Text style={[shType.dense, { color: c.textMuted }]}>
            Queda en la historia del cliente. ¿Quieres programar el siguiente seguimiento?
          </Text>
          {siguienteFecha ? (
            <>
              <Field label="¿Qué sigue?">
                <TextField
                  testID="seguimiento-siguiente-nota"
                  value={siguienteNota}
                  onChangeText={setSiguienteNota}
                  maxLength={nota.max_length || NOTA_MAX}
                />
              </Field>
              <SelectorFechaHora label="Cuándo (hora del negocio)" valor={siguienteFecha} onChange={setSiguienteFecha} testID="seguimiento-siguiente-fecha" />
              <Button testID="seguimiento-sin-siguiente" variant="link" size="sm" onPress={() => setSiguienteFecha(null)}>
                Sin siguiente
              </Button>
            </>
          ) : (
            <Button testID="seguimiento-con-siguiente" variant="secondary" size="sm" iconLeft="event" onPress={() => setSiguienteFecha(sugerenciaDeSeguimiento())}>
              Programar el siguiente
            </Button>
          )}
          <View style={styles.acciones}>
            <Button testID="seguimiento-confirmar-hecho" size="sm" loading={ocupado} onPress={() => void terminar()}>
              {siguienteFecha ? "Hecho y programar" : "Hecho"}
            </Button>
            <Button testID="seguimiento-cancelar" variant="secondary" size="sm" onPress={cancelar}>
              Cancelar
            </Button>
          </View>
        </View>
      ) : null}

      {error ? (
        <Text testID="seguimiento-error" accessibilityRole="alert" style={[shType.dense, { color: c.statusDangerFg }]}>
          {error}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  titulo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: shSpace[2] },
  bloque: { gap: shSpace[2] },
  acciones: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: shSpace[2] },
});
