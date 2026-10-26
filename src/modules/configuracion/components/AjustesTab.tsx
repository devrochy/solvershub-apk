import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@core/theme/theme-context";
import { useAdminApi } from "@core/session/use-admin-api";
import { AvanzadoTab } from "./AvanzadoTab";
import { ChatWebTab } from "./ChatWebTab";
import { AdminApiError } from "@core/api/admin";
import { Campo, InputCampo } from "./campos";
import { IdentidadGuiada } from "./IdentidadGuiada";
import { errorDeNumero, leerNumero, type RangoNumero } from "../numeros";
import { catalogoConRespaldo } from "../catalogoCache";
import {
  deEstado,
  erroresDeRango,
  estadoInicial,
  type CatalogoConfig,
  type EstadoCampo,
  type EstadoIdentidad,
} from "../catalogo";
import { ayudaFueraDeHorario } from "../fueraDeHorario";
import {
  cargarSettings,
  guardarBrain,
  guardarIdentity,
  guardarMemory,
  type SettingsResponse,
} from "../api";

type SubPestana = "identidad" | "cerebro" | "memoria" | "chat-web" | "avanzado";

const SUB_PESTANAS: { clave: SubPestana; label: string }[] = [
  { clave: "identidad", label: "Identidad" },
  { clave: "cerebro", label: "Cerebro" },
  { clave: "memoria", label: "Memoria" },
  { clave: "chat-web", label: "Chat web" },
  { clave: "avanzado", label: "Avanzado" },
];

/** Rangos de los números de Cerebro y Memoria (los mismos que el panel y la API). */
const NUMEROS: Record<string, { etiqueta: string } & RangoNumero> = {
  model_temperature: { etiqueta: "Temperatura", min: 0, max: 2, decimal: true },
  policy_max_tool_calls: { etiqueta: "Máx. llamadas a herramientas por turno", min: 1, max: 50 },
  policy_budget: { etiqueta: "Presupuesto por conversación", min: 0, decimal: true },
  short_term_turns: { etiqueta: "Turnos de contexto", min: 1, max: 200 },
  rag_top_k: { etiqueta: "Recall RAG (top K)", min: 0, max: 20 },
  rag_min_score: { etiqueta: "Similitud mínima", min: 0, max: 1, decimal: true },
};

/** Errores por campo de los números de un bloque (`{clave: mensaje}`), vacío si todo está bien. */
const erroresDeNumeros = (campos: Record<string, string>, claves: string[]): Record<string, string> => {
  const errores: Record<string, string> = {};
  for (const clave of claves) {
    const { etiqueta, ...rango } = NUMEROS[clave];
    const error = errorDeNumero(etiqueta, campos[clave], rango);
    if (error) errores[clave] = error;
  }
  return errores;
};

const CLAVES_CEREBRO = ["model_temperature", "policy_max_tool_calls", "policy_budget"];
const CLAVES_MEMORIA = ["short_term_turns", "rag_top_k", "rag_min_score"];

interface CamposCerebro {
  model_primary: string;
  model_router: string;
  model_fallback: string;
  model_temperature: string;
  policy_max_tool_calls: string;
  policy_budget: string;
}

interface CamposMemoria {
  short_term_turns: string;
  rag_top_k: string;
  rag_min_score: string;
}


/** Cierre de réplica: Identidad / Cerebro / Memoria del agente (panel: /configuracion). */
export function AjustesTab() {
  const { colores } = useTheme();
  const api = useAdminApi();
  const [sub, setSub] = useState<SubPestana>("identidad");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [identidad, setIdentidad] = useState<EstadoIdentidad | null>(null);
  const [identidadApi, setIdentidadApi] = useState<SettingsResponse["identity"] | null>(null);
  const [catalogo, setCatalogo] = useState<CatalogoConfig | null>(null);
  const [erroresId, setErroresId] = useState<Record<string, string>>({});
  const [cerebro, setCerebro] = useState<CamposCerebro | null>(null);
  const [memoria, setMemoria] = useState<CamposMemoria | null>(null);
  const [erroresNum, setErroresNum] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([cargarSettings(api), catalogoConRespaldo(api)])
      .then(([settings, cat]) => {
        setIdentidadApi(settings.identity);
        setCatalogo(cat);
        setIdentidad(cat ? estadoInicial(cat, settings.identity as unknown as Record<string, unknown>) : {});
        setCerebro({
          model_primary: settings.brain.model_primary,
          model_router: settings.brain.model_router ?? "",
          model_fallback: settings.brain.model_fallback ?? "",
          model_temperature: String(settings.brain.model_temperature),
          policy_max_tool_calls: String(settings.brain.policy_max_tool_calls),
          policy_budget: String(settings.brain.policy_budget),
        });
        setMemoria({
          short_term_turns: String(settings.memory.short_term_turns),
          rag_top_k: String(settings.memory.rag_top_k),
          rag_min_score: String(settings.memory.rag_min_score),
        });
      })
      .catch(() => setError("No pudimos cargar la configuración."))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carga inicial de la pestaña
  }, []);

  const quitarErrorNum = (clave: string) => setErroresNum(({ [clave]: _quitado, ...resto }) => resto);

  const guardar = async () => {
    if (!identidad || !identidadApi || !cerebro || !memoria) return;
    if (sub === "identidad") {
      if (!catalogo) {
        setError("No pudimos cargar las opciones de la identidad.");
        return;
      }
      const locales = erroresDeRango(catalogo, identidad);
      setErroresId(locales);
      if (Object.keys(locales).length > 0) {
        setError("Revisa los campos marcados antes de guardar.");
        return;
      }
    }
    if (sub === "cerebro" || sub === "memoria") {
      const locales =
        sub === "cerebro"
          ? erroresDeNumeros({ ...cerebro }, CLAVES_CEREBRO)
          : erroresDeNumeros({ ...memoria }, CLAVES_MEMORIA);
      setErroresNum(locales);
      if (Object.keys(locales).length > 0) {
        setError("Revisa los campos marcados antes de guardar.");
        return;
      }
    }
    setGuardando(true);
    setError(null);
    setMensaje(null);
    try {
      if (sub === "identidad" && catalogo) {
        // Solo viaja lo que el catálogo pinta; `tono` está retirado (ADR-0166). `bot_paused` solo si
        // el usuario lo movió: así guardar no deshace una pausa hecha mientras el formulario estaba abierto.
        const cuerpo: Record<string, unknown> = {};
        for (const opcion of catalogo.opciones) {
          if (opcion.solo_lectura || !(opcion.clave in identidad)) continue;
          cuerpo[opcion.clave] = deEstado(opcion, identidad[opcion.clave]);
        }
        if (cuerpo.bot_paused === identidadApi.bot_paused) delete cuerpo.bot_paused;
        // Una sola zona en la UI: el horario de atención usa la del negocio.
        cuerpo.business_tz = cuerpo.timezone;
        await guardarIdentity(api, cuerpo);
        setIdentidadApi({ ...identidadApi, bot_paused: identidad.bot_paused === true });
        setMensaje("Identidad guardada.");
      } else if (sub === "cerebro") {
        await guardarBrain(api, {
          model_primary: cerebro.model_primary,
          model_router: cerebro.model_router || null,
          model_fallback: cerebro.model_fallback || null,
          model_temperature: leerNumero(cerebro.model_temperature) ?? 0,
          policy_max_tool_calls: leerNumero(cerebro.policy_max_tool_calls) ?? 0,
          policy_budget: leerNumero(cerebro.policy_budget) ?? 0,
        });
        setMensaje("Cerebro guardado.");
      } else if (sub === "memoria") {
        await guardarMemory(api, {
          short_term_turns: leerNumero(memoria.short_term_turns) ?? 0,
          rag_top_k: leerNumero(memoria.rag_top_k) ?? 0,
          rag_min_score: leerNumero(memoria.rag_min_score) ?? 0,
        });
        setMensaje("Memoria guardada.");
      }
    } catch (e) {
      // 422: cada campo marcado muestra su mensaje en español y lo editado se conserva.
      if (e instanceof AdminApiError && e.fields) {
        setErroresId(e.fields);
        setError("Revisa los campos marcados antes de guardar.");
      } else {
        setError("No se pudo guardar.");
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ScrollView
      testID="ajustes-tab"
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      {cargando ? (
        <ActivityIndicator testID="ajustes-cargando" style={{ marginTop: 30 }} />
      ) : !identidad || !cerebro || !memoria ? (
        <Text testID="ajustes-sin-datos" style={{ color: colores.peligro, marginTop: 12 }}>
          {error ?? "Sin datos de configuración."}
        </Text>
      ) : (
        <>
          <View style={[styles.subPestanas, { borderColor: colores.borde }]}>
            {SUB_PESTANAS.map(({ clave: p, label }) => (
              <Pressable
                key={p}
                testID={`ajustes-sub-${p}`}
                onPress={() => {
                  setSub(p);
                  setMensaje(null);
                  setError(null);
                  setErroresNum({});
                }}
                style={[
                  styles.subPestana,
                  sub === p && { borderBottomColor: colores.acento, borderBottomWidth: 2 },
                ]}
              >
                <Text
                  style={{
                    color: sub === p ? colores.texto : colores.textoSuave,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          {sub === "identidad" ? (
            <IdentidadGuiada
              catalogo={catalogo}
              estado={identidad}
              errores={erroresId}
              onCambio={(clave: string, valor: EstadoCampo) => {
                setIdentidad({ ...identidad, [clave]: valor });
                setErroresId(({ [clave]: _quitado, ...resto }) => resto);
              }}
              ayudaFueraDeHorario={(valores) =>
                ayudaFueraDeHorario(
                  String(valores.out_of_hours_message ?? ""),
                  identidadApi?.out_of_hours_default_message ?? "",
                  Array.isArray(valores.business_ranges) && valores.business_ranges.length > 0,
                )
              }
            />
          ) : sub === "cerebro" ? (
            <View testID="ajustes-cerebro">
              <Campo id="ajustes-model-primary" label="Modelo primario">
                {InputCampo({
                  id: "ajustes-model-primary",
                  valor: cerebro.model_primary,
                  onChange: (v) => setCerebro({ ...cerebro, model_primary: v }),
                })}
              </Campo>
              <Campo id="ajustes-model-router" label="Modelo de razonamiento">
                {InputCampo({
                  id: "ajustes-model-router",
                  valor: cerebro.model_router,
                  onChange: (v) => setCerebro({ ...cerebro, model_router: v }),
                })}
              </Campo>
              <Campo id="ajustes-model-fallback" label="Modelo de respaldo">
                {InputCampo({
                  id: "ajustes-model-fallback",
                  valor: cerebro.model_fallback,
                  onChange: (v) => setCerebro({ ...cerebro, model_fallback: v }),
                })}
              </Campo>
              <Campo id="ajustes-temperature" label="Temperatura (0-2)" error={erroresNum.model_temperature}>
                {InputCampo({
                  id: "ajustes-temperature",
                  valor: cerebro.model_temperature,
                  onChange: (v) => {
                    setCerebro({ ...cerebro, model_temperature: v });
                    quitarErrorNum("model_temperature");
                  },
                  numeric: true,
                  decimal: true,
                })}
              </Campo>
              <Campo id="ajustes-max-tools" label="Máx. llamadas a herramientas por turno" error={erroresNum.policy_max_tool_calls}>
                {InputCampo({
                  id: "ajustes-max-tools",
                  valor: cerebro.policy_max_tool_calls,
                  onChange: (v) => {
                    setCerebro({ ...cerebro, policy_max_tool_calls: v });
                    quitarErrorNum("policy_max_tool_calls");
                  },
                  numeric: true,
                })}
              </Campo>
              <Campo id="ajustes-budget" label="Presupuesto por conversación" error={erroresNum.policy_budget}>
                {InputCampo({
                  id: "ajustes-budget",
                  valor: cerebro.policy_budget,
                  onChange: (v) => {
                    setCerebro({ ...cerebro, policy_budget: v });
                    quitarErrorNum("policy_budget");
                  },
                  numeric: true,
                  decimal: true,
                })}
              </Campo>
            </View>
          ) : sub === "memoria" ? (
            <View testID="ajustes-memoria">
              <Campo id="ajustes-short-term" label="Turnos de contexto (memoria corta)" error={erroresNum.short_term_turns}>
                {InputCampo({
                  id: "ajustes-short-term",
                  valor: memoria.short_term_turns,
                  onChange: (v) => {
                    setMemoria({ ...memoria, short_term_turns: v });
                    quitarErrorNum("short_term_turns");
                  },
                  numeric: true,
                })}
              </Campo>
              <Campo id="ajustes-rag-topk" label="Recall RAG (top K)" ayuda="0 = desactivado (1–20)." error={erroresNum.rag_top_k}>
                {InputCampo({
                  id: "ajustes-rag-topk",
                  valor: memoria.rag_top_k,
                  onChange: (v) => {
                    setMemoria({ ...memoria, rag_top_k: v });
                    quitarErrorNum("rag_top_k");
                  },
                  numeric: true,
                })}
              </Campo>
              <Campo id="ajustes-rag-score" label="Similitud mínima (0–1)" error={erroresNum.rag_min_score}>
                {InputCampo({
                  id: "ajustes-rag-score",
                  valor: memoria.rag_min_score,
                  onChange: (v) => {
                    setMemoria({ ...memoria, rag_min_score: v });
                    quitarErrorNum("rag_min_score");
                  },
                  numeric: true,
                  decimal: true,
                })}
              </Campo>
            </View>
          ) : null}

          {/* Chat web y Avanzado cargan y guardan por su cuenta (endpoints propios). */}
          {sub === "chat-web" ? <ChatWebTab /> : null}
          {sub === "avanzado" ? <AvanzadoTab /> : null}

          {/* Resultado junto al botón: el formulario es largo y arriba quedaría fuera de pantalla. */}
          {sub === "chat-web" || sub === "avanzado" ? null : (
            <View testID="ajustes-pie">
              {error ? (
                <Text testID="ajustes-error" style={[styles.resultado, { color: colores.peligro }]}>
                  {error}
                </Text>
              ) : null}
              {mensaje ? (
                <Text testID="ajustes-mensaje" style={[styles.resultado, { color: colores.acento }]}>
                  {mensaje}
                </Text>
              ) : null}
              <Pressable
                testID="ajustes-guardar"
                disabled={guardando}
                onPress={() => void guardar()}
                style={[styles.guardar, { backgroundColor: colores.primario }]}
              >
                <Text style={{ color: colores.sobrePrimario, fontWeight: "700" }}>
                  {guardando ? "Guardando…" : "Guardar"}
                </Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  subPestanas: { flexDirection: "row", borderBottomWidth: 1, marginBottom: 12 },
  subPestana: { flex: 1, paddingVertical: 10, alignItems: "center" },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 13,
  },
  resultado: { textAlign: "center", marginTop: 8 },
  guardar: {
    alignSelf: "center",
    paddingHorizontal: 28,
    paddingVertical: 11,
    borderRadius: 8,
    marginTop: 8,
  },
});
