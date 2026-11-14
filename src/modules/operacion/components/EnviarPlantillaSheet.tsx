import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Crypto from "expo-crypto";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { Button, Sheet, TextField, useKit } from "@shared/ui";
import { useAdminApi } from "@core/session/use-admin-api";
import {
  confirmarEnvio,
  conexionesParaEnvio,
  estadoDeEnvio,
  vistaPreviaDeEnvio,
  type ConexionDeEnvio,
  type EnvioSegmento,
  type PlantillaDeEnvio,
  type VariableDeEnvio,
  type VistaPreviaEnvio,
} from "../api";

type Paso = "armar" | "vista" | "enviado";

const COMO_SE_OBTIENE: Record<string, string> = {
  en_el_local: "en el local",
  por_telefono: "por teléfono",
  por_escrito: "por escrito",
  otro: "de otra forma",
};

/**
 * Envío de una plantilla de marketing a un cliente (HU-CRM-06, ADR-0150).
 * Primero se arma, luego se ve a quién le llega y, solo al confirmar, sale.
 * La clave de idempotencia se genera una vez por vista previa.
 */
export function EnviarPlantillaSheet({
  visible,
  onClose,
  leadId,
  nombre,
}: {
  visible: boolean;
  onClose: () => void;
  leadId: string;
  nombre: string;
}) {
  const { c } = useKit();
  const api = useAdminApi();
  const [paso, setPaso] = useState<Paso>("armar");
  const [conexiones, setConexiones] = useState<ConexionDeEnvio[] | null>(null);
  const [conexionId, setConexionId] = useState("");
  const [plantillaId, setPlantillaId] = useState("");
  const [variables, setVariables] = useState<Record<string, VariableDeEnvio>>({});
  const [vista, setVista] = useState<VistaPreviaEnvio | null>(null);
  const [clave, setClave] = useState("");
  const [envio, setEnvio] = useState<EnvioSegmento | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conexion = conexiones?.find((x) => x.id === conexionId) ?? null;
  const plantilla = conexion?.plantillas.find((x) => x.id === plantillaId) ?? null;

  function elegirConexion(nueva: ConexionDeEnvio, lista = conexiones) {
    setConexionId(nueva.id);
    const primeraPlantilla = nueva.plantillas[0];
    if (primeraPlantilla) elegirPlantilla(primeraPlantilla, lista, nueva.id);
    else {
      setPlantillaId("");
      setVariables({});
    }
  }

  function elegirPlantilla(
    nueva: PlantillaDeEnvio,
    lista = conexiones,
    cid = conexionId,
  ) {
    setPlantillaId(nueva.id);
    setVariables(
      Object.fromEntries(
        nueva.variables.map((variable, indice) => [
          variable,
          { fuente: indice === 0 ? "cliente.nombre" : "fijo", valor: "" } satisfies VariableDeEnvio,
        ]),
      ),
    );
    void lista;
    void cid;
  }

  const cargar = useCallback(async () => {
    setCargando(true);
    setPaso("armar");
    setVista(null);
    setEnvio(null);
    setError(null);
    try {
      const lista = await conexionesParaEnvio(api);
      setConexiones(lista);
      const primera = lista[0];
      if (primera) {
        elegirConexion(primera, lista);
      }
    } catch {
      setError("No se pudieron cargar las conexiones de WhatsApp.");
    } finally {
      setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- elegirConexion solo usa el estado de variables
  }, [api]);

  useEffect(() => {
    if (!visible) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de conexiones al abrir la hoja
    void cargar();
  }, [visible, cargar]);

  async function verVistaPrevia() {
    if (!conexion || !plantilla) {
      setError("Elige la conexión y la plantilla.");
      return;
    }
    const falta = Object.entries(variables).find(([, v]) => v.fuente === "fijo" && !v.valor.trim());
    if (falta) {
      setError(`Completa la variable {{${falta[0]}}}.`);
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const resultado = await vistaPreviaDeEnvio(
        api,
        { connection_id: conexion.id, template_id: plantilla.id, variables },
        leadId,
      );
      setVista(resultado);
      setClave(Crypto.randomUUID());
      setPaso("vista");
    } catch {
      setError("No se pudo armar la vista previa. Revisa el consentimiento del cliente.");
    } finally {
      setCargando(false);
    }
  }

  async function confirmar() {
    if (!vista?.envio_id) return;
    setCargando(true);
    setError(null);
    try {
      setEnvio(await confirmarEnvio(api, vista.envio_id, clave));
      setPaso("enviado");
    } catch {
      setError("No se pudo confirmar el envío.");
    } finally {
      setCargando(false);
    }
  }

  async function actualizar() {
    if (!envio) return;
    setCargando(true);
    try {
      setEnvio(await estadoDeEnvio(api, envio.id));
    } catch {
      setError("No se pudo actualizar el estado del envío.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={`Enviar una plantilla a ${nombre}`}
      description="Solo le llega si es cliente de WhatsApp y aceptó recibir promociones. Primero ves el resumen; después confirmas."
      testID="enviar-plantilla"
      footer={
        paso === "armar" ? (
          <Button
            testID="plantilla-ver-vista"
            fullWidth
            loading={cargando}
            disabled={!plantilla}
            onPress={() => void verVistaPrevia()}
          >
            Ver a quién le llega
          </Button>
        ) : paso === "vista" ? (
          <View style={styles.pieFila}>
            <Button
              testID="plantilla-volver"
              variant="secondary"
              onPress={() => setPaso("armar")}
              disabled={cargando}
              style={styles.flex}
            >
              Volver
            </Button>
            <Button
              testID="plantilla-confirmar"
              loading={cargando}
              disabled={Boolean(vista?.bloqueo) || !vista?.envio_id}
              onPress={() => void confirmar()}
              style={styles.flex}
            >
              Enviar
            </Button>
          </View>
        ) : (
          <Button testID="plantilla-cerrar" fullWidth onPress={onClose}>
            Cerrar
          </Button>
        )
      }
    >
      {paso === "armar" ? (
        <View style={styles.contenido}>
          {conexiones && conexiones.length === 0 ? (
            <Text style={[shType.dense, { color: c.textMuted }]}>
              No hay conexiones de WhatsApp con plantillas de marketing aprobadas. Créalas en Conexiones.
            </Text>
          ) : null}

          {conexiones && conexiones.length > 0 ? (
            <>
              <Campo titulo="Conexión">
                <View style={styles.chipsWrap}>
                  {conexiones.map((item) => (
                    <Opcion
                      key={item.id}
                      testID={`plantilla-conexion-${item.id}`}
                      label={item.label}
                      selected={conexionId === item.id}
                      onPress={() => elegirConexion(item)}
                    />
                  ))}
                </View>
              </Campo>

              <Campo titulo="Plantilla de marketing">
                <View style={styles.chipsWrap}>
                  {(conexion?.plantillas ?? []).map((item) => (
                    <Opcion
                      key={item.id}
                      testID={`plantilla-opcion-${item.id}`}
                      label={`${item.name} (${item.language})`}
                      selected={plantillaId === item.id}
                      onPress={() => elegirPlantilla(item)}
                    />
                  ))}
                </View>
              </Campo>
            </>
          ) : null}

          {plantilla ? (
            <>
              {plantilla.variables.map((variable) => {
                const valor = variables[variable] ?? { fuente: "fijo" as const, valor: "" };
                return (
                  <Campo key={variable} titulo={`Variable {{${variable}}}`}>
                    <View style={styles.chipsWrap}>
                      <Opcion
                        testID={`plantilla-variable-${variable}-nombre`}
                        label="Nombre del cliente"
                        selected={valor.fuente === "cliente.nombre"}
                        onPress={() =>
                          setVariables((previas) => ({
                            ...previas,
                            [variable]: { fuente: "cliente.nombre", valor: "" },
                          }))
                        }
                      />
                      <Opcion
                        testID={`plantilla-variable-${variable}-fijo`}
                        label="Texto fijo"
                        selected={valor.fuente === "fijo"}
                        onPress={() =>
                          setVariables((previas) => ({
                            ...previas,
                            [variable]: { fuente: "fijo", valor: valor.valor },
                          }))
                        }
                      />
                    </View>
                    {valor.fuente === "fijo" ? (
                      <TextField
                        testID={`plantilla-variable-${variable}-valor`}
                        accessibilityLabel={`Texto de la variable ${variable}`}
                        value={valor.valor}
                        onChangeText={(texto) =>
                          setVariables((previas) => ({
                            ...previas,
                            [variable]: { fuente: "fijo", valor: texto },
                          }))
                        }
                        maxLength={1000}
                        placeholder="Texto que reemplaza la variable"
                      />
                    ) : null}
                  </Campo>
                );
              })}
              <Text style={[shType.caption, { color: c.textMuted }]}>
                Se envía solo a {nombre} y queda en su historia.
              </Text>
            </>
          ) : null}
        </View>
      ) : null}

      {paso === "vista" && vista ? (
        <View style={styles.contenido}>
          <Text style={[shType.body, { color: c.text }]}>
            {vista.elegibles > 0
              ? `${nombre} recibiría la plantilla. Todavía no se envió nada.`
              : `${nombre} no puede recibirla todavía.`}
          </Text>
          {vista.excluidos.length > 0 ? (
            <View style={styles.lista}>
              {vista.excluidos.map((excluido) => (
                <View key={excluido.motivo} style={styles.fila}>
                  <Text style={[shType.dense, { color: c.textMuted }]}>{excluido.label}</Text>
                  <Text style={[shType.dense, { color: c.text }]}>{excluido.total}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {vista.texto ? (
            <Text style={[shType.dense, styles.texto, { color: c.text, backgroundColor: c.surface2 }]}>
              {vista.texto}
            </Text>
          ) : null}
          {vista.bloqueo ? (
            <Text style={[shType.dense, { color: c.statusWarningFg }]}>
              {vista.bloqueo === "sin_destinatarios"
                ? "Nadie puede recibirla: revisa el consentimiento y el canal."
                : vista.bloqueo === "tope"
                  ? "Se superó el tope del envío."
                  : "Ya hay un envío en curso por esta conexión."}
            </Text>
          ) : null}
        </View>
      ) : null}

      {paso === "enviado" && envio ? (
        <View style={styles.contenido}>
          <Text style={[shType.body, { color: c.text }]}>
            {envio.plantilla} · {envio.total} {envio.total === 1 ? "cliente" : "clientes"}
          </Text>
          <Text style={[shType.dense, { color: c.textMuted }]}>
            Sale por tandas de 25, una cada 30 segundos. El cliente lo verá en su historia.
          </Text>
          {Object.entries(envio.conteo).length > 0 ? (
            <View style={styles.lista}>
              {Object.entries(envio.conteo).map(([estado, total]) => (
                <View key={estado} style={styles.fila}>
                  <Text style={[shType.dense, { color: c.textMuted }]}>{estado}</Text>
                  <Text style={[shType.dense, { color: c.text }]}>{total}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {envio.fallas.length > 0 ? (
            <Text style={[shType.dense, { color: c.statusDangerFg }]}>
              {envio.fallas.length} no les llegó.
            </Text>
          ) : null}
          <Button variant="secondary" size="sm" loading={cargando} onPress={() => void actualizar()}>
            Actualizar estado
          </Button>
        </View>
      ) : null}

      {error ? (
        <Text testID="plantilla-error" style={[shType.dense, { color: c.statusDangerFg }]}>
          {error}
        </Text>
      ) : null}
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

/** Texto de una variable ya resuelta para la vista previa; el backend manda el texto final. */
export function comoSeObtiene(origen: string): string {
  return COMO_SE_OBTIENE[origen] ?? origen;
}

const styles = StyleSheet.create({
  contenido: { gap: shSpace[3] },
  campo: { gap: shSpace[2] },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[2] },
  opcion: {
    justifyContent: "center",
    minHeight: shDensity.controlLg,
    borderWidth: 1,
    borderRadius: shRadius.pill,
    paddingHorizontal: shSpace[3],
  },
  lista: { gap: shSpace[1] },
  fila: { flexDirection: "row", justifyContent: "space-between", gap: shSpace[3] },
  texto: { borderRadius: shRadius.sm, padding: shSpace[3] },
  pieFila: { flexDirection: "row", gap: shSpace[2], flex: 1 },
  flex: { flex: 1 },
});
