import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "@core/theme/theme-context";
import { useAdminApi } from "@core/session/use-admin-api";
import {
  activarVersionSpec,
  cargarAvanzado,
  guardarGuardrails,
  guardarLlm,
  guardarSpec,
  type AdvancedResponse,
} from "../api";

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const { colores } = useTheme();
  return (
    <View style={[styles.seccion, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
      <Text style={[styles.titulo, { color: colores.texto }]}>{titulo}</Text>
      {children}
    </View>
  );
}

function Boton({
  testID,
  texto,
  onPress,
  deshabilitado,
}: {
  testID: string;
  texto: string;
  onPress: () => void;
  deshabilitado?: boolean;
}) {
  const { colores } = useTheme();
  return (
    <Pressable
      testID={testID}
      disabled={deshabilitado}
      onPress={onPress}
      style={[styles.boton, { backgroundColor: colores.primario }]}
    >
      <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 13 }}>{texto}</Text>
    </Pressable>
  );
}

/**
 * Configuración avanzada del agente (panel: /configuracion?tab=avanzado): versiones,
 * proveedor LLM (BYOK), guardrails, flow y evals, y el editor crudo del AgentSpec.
 */
export function AvanzadoTab() {
  const { colores } = useTheme();
  const api = useAdminApi();
  const [datos, setDatos] = useState<AdvancedResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [ignoradas, setIgnoradas] = useState<string[]>([]);
  const [proveedor, setProveedor] = useState("");
  const [modelo, setModelo] = useState("");
  const [llave, setLlave] = useState("");
  const [guardrails, setGuardrails] = useState("");
  const [spec, setSpec] = useState("");

  const cargar = useCallback(async () => {
    try {
      const d = await cargarAvanzado(api);
      setDatos(d);
      setProveedor(d.llm.llm_provider);
      setModelo(d.llm.llm_model);
      setGuardrails(d.guardrails_text);
      setSpec(JSON.stringify(d.spec ?? {}, null, 2));
    } catch {
      setError("No pudimos cargar la configuración avanzada.");
    } finally {
      setCargando(false);
    }
  }, [api]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- los setState de `cargar` ocurren tras el await de la API
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carga inicial de la pestaña
  }, []);

  /**
   * Ejecuta una acción con su mensaje y recarga (versiones nuevas). La acción puede
   * devolver líneas de guardrails que el backend ignoró.
   */
  const ejecutar = async (
    clave: string,
    accion: () => Promise<string[] | void>,
    ok: string,
  ) => {
    setOcupado(clave);
    setError(null);
    setMensaje(null);
    setIgnoradas([]);
    try {
      const ignoradasNuevas = await accion();
      setMensaje(ok);
      setIgnoradas(ignoradasNuevas ?? []);
      await cargar();
    } catch {
      setError("No se pudo guardar.");
    } finally {
      setOcupado(null);
    }
  };

  const guardarLlmActual = () =>
    void ejecutar(
      "llm",
      async () => {
        await guardarLlm(api, { llm_provider: proveedor, llm_model: modelo, llm_api_key: llave });
        setLlave("");
      },
      "LLM actualizado.",
    );

  const guardarGuardrailsActual = () =>
    void ejecutar(
      "guardrails",
      async () => (await guardarGuardrails(api, guardrails))?.ignored ?? [],
      "Guardrails guardados.",
    );

  const confirmarSpec = () => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(spec) as Record<string, unknown>;
    } catch {
      setMensaje(null);
      setError("El AgentSpec no es JSON válido.");
      return;
    }
    Alert.alert(
      "Reemplazar AgentSpec",
      "Reemplaza toda la configuración del agente y crea una versión nueva si cambió. Las anteriores quedan como históricas.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Guardar",
          style: "destructive",
          onPress: () =>
            void ejecutar("spec", () => guardarSpec(api, parsed), "AgentSpec guardado."),
        },
      ],
    );
  };

  const confirmarVersion = (id: string, version: string) => {
    Alert.alert("Activar versión", `Se activará la versión ${version} y reemplaza a la activa.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Activar",
        style: "destructive",
        onPress: () =>
          void ejecutar(`version-${id}`, () => activarVersionSpec(api, id), `Versión ${version} activada.`),
      },
    ]);
  };

  if (cargando) {
    return <ActivityIndicator testID="avanzado-cargando" style={{ marginTop: 30 }} />;
  }
  if (!datos) {
    return (
      <Text testID="avanzado-error" style={{ color: colores.peligro, marginTop: 12 }}>
        {error ?? "Sin datos de configuración avanzada."}
      </Text>
    );
  }

  const estiloInput = [styles.input, { borderColor: colores.borde, color: colores.texto }];

  return (
    <View testID="avanzado-tab">
      {error ? (
        <Text testID="avanzado-error" style={[styles.resultado, { color: colores.peligro }]}>
          {error}
        </Text>
      ) : null}
      {mensaje ? (
        <Text testID="avanzado-mensaje" style={[styles.resultado, { color: colores.acento }]}>
          {mensaje}
        </Text>
      ) : null}
      {ignoradas.length > 0 ? (
        <View testID="avanzado-ignoradas" style={[styles.aviso, { borderColor: colores.peligro }]}>
          <Text style={{ color: colores.texto, fontWeight: "600", fontSize: 12 }}>
            {`Se ignoraron ${ignoradas.length} línea(s) de guardrails (el resto sí se guardó):`}
          </Text>
          {ignoradas.map((l) => (
            <Text key={l} style={{ color: colores.texto, fontSize: 12 }}>{`• ${l}`}</Text>
          ))}
        </View>
      ) : null}

      <Seccion titulo="Versiones del agente">
        {datos.versions.length === 0 ? (
          <Text style={{ color: colores.textoSuave, fontSize: 12 }}>Sin versiones registradas.</Text>
        ) : (
          datos.versions.slice(0, 10).map((v) => (
            <View key={v.id} testID={`avanzado-version-${v.id}`} style={styles.filaVersion}>
              <Text style={{ flex: 1, color: colores.texto, fontFamily: "monospace", fontSize: 12 }}>
                {v.version}
              </Text>
              {v.is_active ? (
                <Text style={{ color: colores.acento, fontSize: 12, fontWeight: "700" }}>activa</Text>
              ) : (
                <Pressable
                  testID={`avanzado-activar-${v.id}`}
                  disabled={ocupado !== null}
                  onPress={() => confirmarVersion(v.id, v.version)}
                >
                  <Text style={{ color: colores.acento, fontSize: 12, fontWeight: "600" }}>Activar</Text>
                </Pressable>
              )}
            </View>
          ))
        )}
      </Seccion>

      <Seccion titulo="Proveedor LLM">
        <Text style={[styles.label, { color: colores.texto }]}>Proveedor</Text>
        <TextInput
          testID="avanzado-llm-proveedor"
          value={proveedor}
          onChangeText={setProveedor}
          autoCapitalize="none"
          style={estiloInput}
        />
        <Text style={[styles.label, { color: colores.texto }]}>Modelo</Text>
        <TextInput
          testID="avanzado-llm-modelo"
          value={modelo}
          onChangeText={setModelo}
          autoCapitalize="none"
          style={estiloInput}
        />
        <Text style={[styles.label, { color: colores.texto }]}>Llave de API (BYOK)</Text>
        <TextInput
          testID="avanzado-llm-llave"
          value={llave}
          onChangeText={setLlave}
          secureTextEntry
          autoCapitalize="none"
          style={estiloInput}
        />
        <Text style={[styles.ayuda, { color: colores.textoSuave }]}>
          {datos.llm.has_api_key
            ? "Ya hay una llave guardada; déjala vacía para conservarla."
            : "Sin llave, el negocio usa la del servidor."}
        </Text>
        <Boton
          testID="avanzado-llm-guardar"
          texto={ocupado === "llm" ? "Guardando…" : "Guardar LLM"}
          deshabilitado={ocupado !== null}
          onPress={guardarLlmActual}
        />
      </Seccion>

      <Seccion titulo="Guardrails personalizados">
        <TextInput
          testID="avanzado-guardrails"
          value={guardrails}
          onChangeText={setGuardrails}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          style={[estiloInput, { minHeight: 90, textAlignVertical: "top" }]}
        />
        <Text style={[styles.ayuda, { color: colores.textoSuave }]}>
          Una regla por línea: forbidden_phrase | frases | retry · required_tool | frases | tool |
          escalate · max_length | 500 | retry
        </Text>
        <Boton
          testID="avanzado-guardrails-guardar"
          texto={ocupado === "guardrails" ? "Guardando…" : "Guardar guardrails"}
          deshabilitado={ocupado !== null}
          onPress={guardarGuardrailsActual}
        />
      </Seccion>

      <Seccion titulo="Flow de atención">
        <Text style={{ color: colores.textoSuave, fontSize: 12, marginBottom: 6 }}>
          {`Origen: ${datos.flow.source || "—"}`}
        </Text>
        {datos.flow.sections.length === 0 ? (
          <Text style={{ color: colores.textoSuave, fontSize: 12 }}>Sin secciones definidas.</Text>
        ) : (
          datos.flow.sections.map((s) => (
            <View key={s.label} style={{ marginBottom: 8 }}>
              <Text style={{ color: colores.texto, fontSize: 13 }}>{s.label}</Text>
              {s.purpose ? (
                <Text style={{ color: colores.textoSuave, fontSize: 12 }}>{s.purpose}</Text>
              ) : null}
              <Text style={{ color: colores.texto, fontSize: 11, fontFamily: "monospace" }}>
                {s.tools.join(", ") || "—"}
              </Text>
            </View>
          ))
        )}
        {datos.flow.unknown_tools.length > 0 ? (
          <Text style={{ color: colores.peligro, fontSize: 12 }}>
            {`Herramientas desconocidas: ${datos.flow.unknown_tools.join(", ")}`}
          </Text>
        ) : null}
      </Seccion>

      <Seccion titulo="Últimas corridas de evals">
        {datos.eval_runs.length === 0 ? (
          <Text style={{ color: colores.textoSuave, fontSize: 12 }}>Sin corridas registradas.</Text>
        ) : (
          datos.eval_runs.map((r) => (
            <View key={r.id} testID={`avanzado-eval-${r.id}`} style={styles.filaVersion}>
              <Text style={{ flex: 1, color: colores.textoSuave, fontFamily: "monospace", fontSize: 11 }}>
                {r.id.slice(0, 8)}
              </Text>
              {r.score !== null && r.score !== undefined ? (
                <Text style={{ color: colores.texto, fontSize: 12, marginRight: 8 }}>{String(r.score)}</Text>
              ) : null}
              <Text
                style={{
                  color: r.status === "passed" ? colores.acento : colores.textoSuave,
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                {r.status || "—"}
              </Text>
            </View>
          ))
        )}
      </Seccion>

      <Seccion titulo="Editor crudo del AgentSpec">
        <Text style={[styles.ayuda, { color: colores.textoSuave, marginTop: 0 }]}>
          Guardar este JSON reemplaza toda la configuración del agente y crea una versión nueva.
        </Text>
        <TextInput
          testID="avanzado-spec"
          value={spec}
          onChangeText={setSpec}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          style={[estiloInput, styles.spec]}
        />
        <Boton
          testID="avanzado-spec-guardar"
          texto={ocupado === "spec" ? "Guardando…" : "Guardar AgentSpec"}
          deshabilitado={ocupado !== null}
          onPress={confirmarSpec}
        />
      </Seccion>
    </View>
  );
}

const styles = StyleSheet.create({
  seccion: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12 },
  titulo: { fontSize: 14, fontWeight: "700", marginBottom: 8 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 4, marginTop: 6 },
  ayuda: { fontSize: 12, marginTop: 4, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 13,
  },
  spec: { minHeight: 220, fontFamily: "monospace", fontSize: 11, textAlignVertical: "top" },
  filaVersion: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  aviso: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12 },
  resultado: { textAlign: "center", marginBottom: 10 },
  boton: { alignSelf: "flex-start", paddingHorizontal: 18, paddingVertical: 9, borderRadius: 8 },
});
