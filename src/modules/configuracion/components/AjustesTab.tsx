import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "@core/theme/theme-context";
import { useAdminApi } from "@core/session/use-admin-api";
import { AvanzadoTab } from "./AvanzadoTab";
import { ChatWebTab } from "./ChatWebTab";
import { aRangosTexto, leyendaDias, textoARangos } from "../horarioAtencion";
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

const TONOS = ["calido", "formal", "divertido"];
const PERSONA_TONES = ["formal", "neutral", "cercano", "informal"];
const EMOJIS = ["none", "sparse", "free"];
const DEBOUNCE = ["inmediato", "rapido", "natural", "pausado"];
const SPLIT_STYLES: { value: string; label: string }[] = [
  { value: "un_mensaje", label: "1 mensaje" },
  { value: "pocos_cortos", label: "hasta 3" },
  { value: "varios_cortos", label: "hasta 6" },
];
const CURRENCIES = ["COP", "USD", "MXN", "PEN"];
const TIMEZONES = [
  "America/Bogota",
  "America/Lima",
  "America/Guayaquil",
  "America/Panama",
  "America/Mexico_City",
  "America/Guatemala",
  "America/Costa_Rica",
  "America/Caracas",
  "America/Santo_Domingo",
  "America/Santiago",
  "America/Argentina/Buenos_Aires",
  "America/Sao_Paulo",
  "America/New_York",
  "Europe/Madrid",
  "UTC",
];
const GUARDRAIL_FAIL: { value: "escalate" | "neutral"; label: string }[] = [
  { value: "escalate", label: "Escalar" },
  { value: "neutral", label: "Verificar" },
];

const aTexto = (v: string[] | null | undefined): string => (v ?? []).join(", ");
const aLista = (s: string): string[] =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
const aNumero = (s: string, respaldo: number): number => {
  const n = Number(s);
  return Number.isFinite(n) ? n : respaldo;
};
interface CamposIdentidad {
  assistant_name: string;
  tono: string;
  business_description: string;
  brand_voice: string;
  persona_tone: string;
  persona_warmth: string;
  persona_emojis: string;
  persona_max_length: string;
  persona_forbidden: string;
  debounce_mode: string;
  split_style: string;
  guardrail_max_retries: string;
  guardrail_fail_action: "escalate" | "neutral";
  currency: string;
  timezone: string;
  escalation_keywords: string;
  out_of_hours_message: string;
  difficulty_long_message_threshold: string;
  difficulty_turnos_sin_resolver_threshold: string;
  difficulty_score_threshold: string;
  business_ranges: string;
  bot_paused: boolean;
}

function identidadACampos(id: SettingsResponse["identity"]): CamposIdentidad {
  return {
    assistant_name: id.assistant_name,
    tono: id.tono,
    business_description: id.business_description,
    brand_voice: id.brand_voice,
    persona_tone: id.persona_tone,
    persona_warmth: String(id.persona_warmth),
    persona_emojis: id.persona_emojis,
    persona_max_length: String(id.persona_max_length),
    persona_forbidden: aTexto(id.persona_forbidden),
    debounce_mode: id.debounce_mode,
    split_style: id.split_style,
    guardrail_max_retries: String(id.guardrail_max_retries),
    guardrail_fail_action: id.guardrail_fail_action,
    currency: id.currency,
    timezone: id.timezone,
    escalation_keywords: aTexto(id.escalation_keywords),
    out_of_hours_message: id.out_of_hours_message,
    difficulty_long_message_threshold: String(id.difficulty_long_message_threshold),
    difficulty_turnos_sin_resolver_threshold: String(id.difficulty_turnos_sin_resolver_threshold),
    difficulty_score_threshold: String(id.difficulty_score_threshold),
    business_ranges: aRangosTexto(id.business_ranges),
    bot_paused: id.bot_paused,
  };
}

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


function Campo({
  label,
  children,
  ayuda,
}: {
  id?: string;
  label: string;
  children: React.ReactNode;
  ayuda?: string;
}) {
  const { colores } = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: colores.texto, fontSize: 13, fontWeight: "600", marginBottom: 4 }}>
        {label}
      </Text>
      {children}
      {ayuda ? (
        <Text style={{ color: colores.textoSuave, fontSize: 11, marginTop: 2 }}>{ayuda}</Text>
      ) : null}
    </View>
  );
}

function Chips({
  id,
  opciones,
  valor,
  onChange,
}: {
  id: string;
  opciones: { value: string; label: string }[];
  valor: string;
  onChange: (v: string) => void;
}) {
  const { colores } = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {opciones.map((o) => (
        <Pressable
          key={o.value}
          testID={`${id}-${o.value}`}
          onPress={() => onChange(o.value)}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: valor === o.value ? colores.acento : colores.borde,
            backgroundColor: valor === o.value ? colores.acento : colores.tarjeta,
          }}
        >
          <Text
            style={{
              color: valor === o.value ? "#ffffff" : colores.texto,
              fontSize: 12,
              fontWeight: "600",
            }}
          >
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function InputCampo(props: {
  id: string;
  valor: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  numeric?: boolean;
  placeholder?: string;
}) {
  const { colores } = useTheme();
  return (
    <TextInput
      testID={props.id}
      value={props.valor}
      onChangeText={props.onChange}
      multiline={props.multiline}
      keyboardType={props.numeric ? "numeric" : undefined}
      placeholder={props.placeholder}
      placeholderTextColor={colores.textoSuave}
      style={[
        styles.input,
        {
          borderColor: colores.borde,
          backgroundColor: colores.tarjeta,
          color: colores.texto,
        },
        props.multiline && { minHeight: 64, textAlignVertical: "top" },
      ]}
    />
  );
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
  const [identidad, setIdentidad] = useState<CamposIdentidad | null>(null);
  const [cerebro, setCerebro] = useState<CamposCerebro | null>(null);
  const [memoria, setMemoria] = useState<CamposMemoria | null>(null);

  useEffect(() => {
    cargarSettings(api)
      .then((settings) => {
        setIdentidad(identidadACampos(settings.identity));
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

  const guardar = async () => {
    if (!identidad || !cerebro || !memoria) return;
    if (!identidad.assistant_name.trim()) {
      setError("El nombre del asistente es obligatorio.");
      return;
    }
    setGuardando(true);
    setError(null);
    setMensaje(null);
    try {
      if (sub === "identidad") {
        await guardarIdentity(api, {
          assistant_name: identidad.assistant_name,
          tono: identidad.tono,
          business_description: identidad.business_description,
          brand_voice: identidad.brand_voice,
          persona_tone: identidad.persona_tone,
          persona_warmth: aNumero(identidad.persona_warmth, 0),
          persona_emojis: identidad.persona_emojis,
          persona_max_length: aNumero(identidad.persona_max_length, 0),
          persona_forbidden: aLista(identidad.persona_forbidden),
          debounce_mode: identidad.debounce_mode,
          split_style: identidad.split_style,
          guardrail_max_retries: aNumero(identidad.guardrail_max_retries, 0),
          guardrail_fail_action: identidad.guardrail_fail_action,
          currency: identidad.currency,
          timezone: identidad.timezone,
          business_tz: identidad.timezone,
          escalation_keywords: aLista(identidad.escalation_keywords),
          out_of_hours_message: identidad.out_of_hours_message,
          difficulty_long_message_threshold: aNumero(identidad.difficulty_long_message_threshold, 400),
          difficulty_turnos_sin_resolver_threshold: aNumero(
            identidad.difficulty_turnos_sin_resolver_threshold,
            3,
          ),
          difficulty_score_threshold: aNumero(identidad.difficulty_score_threshold, 0.6),
          business_ranges: textoARangos(identidad.business_ranges),
          bot_paused: identidad.bot_paused,
        });
        setMensaje("Identidad guardada.");
      } else if (sub === "cerebro") {
        await guardarBrain(api, {
          model_primary: cerebro.model_primary,
          model_router: cerebro.model_router || null,
          model_fallback: cerebro.model_fallback || null,
          model_temperature: aNumero(cerebro.model_temperature, 0.3),
          policy_max_tool_calls: aNumero(cerebro.policy_max_tool_calls, 8),
          policy_budget: aNumero(cerebro.policy_budget, 0),
        });
        setMensaje("Cerebro guardado.");
      } else if (sub === "memoria") {
        await guardarMemory(api, {
          short_term_turns: aNumero(memoria.short_term_turns, 12),
          rag_top_k: aNumero(memoria.rag_top_k, 5),
          rag_min_score: aNumero(memoria.rag_min_score, 0.6),
        });
        setMensaje("Memoria guardada.");
      }
    } catch {
      setError("No se pudo guardar.");
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
            <View testID="ajustes-identidad">
              <Campo id="ajustes-nombre" label="Nombre del asistente">
                {InputCampo({
                  id: "ajustes-nombre",
                  valor: identidad.assistant_name,
                  onChange: (v) => setIdentidad({ ...identidad, assistant_name: v }),
                })}
              </Campo>
              <Campo id="ajustes-tono" label="Tono del asistente">
                <Chips
                  id="ajustes-tono"
                  opciones={TONOS.map((t) => ({ value: t, label: t }))}
                  valor={identidad.tono}
                  onChange={(v) => setIdentidad({ ...identidad, tono: v })}
                />
              </Campo>
              <Campo id="ajustes-descripcion" label="Descripción del negocio">
                {InputCampo({
                  id: "ajustes-descripcion",
                  valor: identidad.business_description,
                  onChange: (v) => setIdentidad({ ...identidad, business_description: v }),
                  multiline: true,
                })}
              </Campo>
              <Campo
                id="ajustes-voz"
                label="Voz de marca"
                ayuda="Opcional. Guía el estilo de las respuestas."
              >
                {InputCampo({
                  id: "ajustes-voz",
                  valor: identidad.brand_voice,
                  onChange: (v) => setIdentidad({ ...identidad, brand_voice: v }),
                  multiline: true,
                })}
              </Campo>
              <Campo id="ajustes-persona-tone" label="Tono de personalidad">
                <Chips
                  id="ajustes-persona-tone"
                  opciones={PERSONA_TONES.map((t) => ({ value: t, label: t }))}
                  valor={identidad.persona_tone}
                  onChange={(v) => setIdentidad({ ...identidad, persona_tone: v })}
                />
              </Campo>
              <Campo id="ajustes-warmth" label="Calidez (0-5)">
                {InputCampo({
                  id: "ajustes-warmth",
                  valor: identidad.persona_warmth,
                  onChange: (v) => setIdentidad({ ...identidad, persona_warmth: v }),
                  numeric: true,
                })}
              </Campo>
              <Campo id="ajustes-emojis" label="Emojis">
                <Chips
                  id="ajustes-emojis"
                  opciones={EMOJIS.map((t) => ({ value: t, label: t }))}
                  valor={identidad.persona_emojis}
                  onChange={(v) => setIdentidad({ ...identidad, persona_emojis: v })}
                />
              </Campo>
              <Campo
                id="ajustes-max-length"
                label="Longitud máx. de respuesta"
                ayuda="0 = sin límite."
              >
                {InputCampo({
                  id: "ajustes-max-length",
                  valor: identidad.persona_max_length,
                  onChange: (v) => setIdentidad({ ...identidad, persona_max_length: v }),
                  numeric: true,
                })}
              </Campo>
              <Campo
                id="ajustes-forbidden"
                label="Frases prohibidas"
                ayuda="Separadas por coma."
              >
                {InputCampo({
                  id: "ajustes-forbidden",
                  valor: identidad.persona_forbidden,
                  onChange: (v) => setIdentidad({ ...identidad, persona_forbidden: v }),
                })}
              </Campo>
              <Campo
                id="ajustes-debounce"
                label="Velocidad de respuesta"
                ayuda="Cuánto espera a que el cliente termine de escribir."
              >
                <Chips
                  id="ajustes-debounce"
                  opciones={DEBOUNCE.map((t) => ({ value: t, label: t }))}
                  valor={identidad.debounce_mode}
                  onChange={(v) => setIdentidad({ ...identidad, debounce_mode: v })}
                />
              </Campo>
              <Campo
                id="ajustes-split"
                label="Estilo de envío"
                ayuda="Meta cobra cada mensaje de servicio."
              >
                <Chips
                  id="ajustes-split"
                  opciones={SPLIT_STYLES}
                  valor={identidad.split_style}
                  onChange={(v) => setIdentidad({ ...identidad, split_style: v })}
                />
              </Campo>
              <Campo id="ajustes-retries" label="Reintentos de guardrail">
                {InputCampo({
                  id: "ajustes-retries",
                  valor: identidad.guardrail_max_retries,
                  onChange: (v) => setIdentidad({ ...identidad, guardrail_max_retries: v }),
                  numeric: true,
                })}
              </Campo>
              <Campo
                id="ajustes-fail-action"
                label="Si el guardrail no logra corregir su respuesta"
              >
                <Chips
                  id="ajustes-fail-action"
                  opciones={GUARDRAIL_FAIL.map((g) => ({ value: g.value, label: g.label }))}
                  valor={identidad.guardrail_fail_action}
                  onChange={(v) =>
                    setIdentidad({ ...identidad, guardrail_fail_action: v as "escalate" | "neutral" })
                  }
                />
              </Campo>
              <Campo id="ajustes-moneda" label="Moneda del negocio">
                <Chips
                  id="ajustes-moneda"
                  opciones={CURRENCIES.map((c) => ({ value: c, label: c }))}
                  valor={identidad.currency}
                  onChange={(v) => setIdentidad({ ...identidad, currency: v })}
                />
              </Campo>
              <Campo
                id="ajustes-timezone"
                label="Zona horaria del negocio"
                ayuda="De ella salen la fecha y hora que usa el asistente."
              >
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {TIMEZONES.map((tz) => (
                      <Pressable
                        key={tz}
                        testID={`ajustes-timezone-${tz}`}
                        onPress={() => setIdentidad({ ...identidad, timezone: tz })}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: identidad.timezone === tz ? colores.acento : colores.borde,
                          backgroundColor:
                            identidad.timezone === tz ? colores.acento : colores.tarjeta,
                        }}
                      >
                        <Text
                          style={{
                            color: identidad.timezone === tz ? "#ffffff" : colores.texto,
                            fontSize: 11,
                          }}
                        >
                          {tz}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </Campo>
              <Campo
                id="ajustes-escalamiento"
                label="Palabras que disparan escalamiento"
                ayuda="Separadas por coma. Vacío = usa las por defecto."
              >
                {InputCampo({
                  id: "ajustes-escalamiento",
                  valor: identidad.escalation_keywords,
                  onChange: (v) => setIdentidad({ ...identidad, escalation_keywords: v }),
                })}
              </Campo>
              <Campo
                id="ajustes-fuera-horario"
                label="Mensaje fuera de horario"
              >
                {InputCampo({
                  id: "ajustes-fuera-horario",
                  valor: identidad.out_of_hours_message,
                  onChange: (v) => setIdentidad({ ...identidad, out_of_hours_message: v }),
                  multiline: true,
                })}
              </Campo>
              <Campo id="ajustes-umbral-msg" label="Umbrales · Mensaje largo (caracteres)">
                {InputCampo({
                  id: "ajustes-umbral-msg",
                  valor: identidad.difficulty_long_message_threshold,
                  onChange: (v) =>
                    setIdentidad({ ...identidad, difficulty_long_message_threshold: v }),
                  numeric: true,
                })}
              </Campo>
              <Campo id="ajustes-umbral-turnos" label="Umbrales · Turnos sin resolver">
                {InputCampo({
                  id: "ajustes-umbral-turnos",
                  valor: identidad.difficulty_turnos_sin_resolver_threshold,
                  onChange: (v) =>
                    setIdentidad({ ...identidad, difficulty_turnos_sin_resolver_threshold: v }),
                  numeric: true,
                })}
              </Campo>
              <Campo id="ajustes-umbral-score" label="Umbrales · Puntaje para razonamiento">
                {InputCampo({
                  id: "ajustes-umbral-score",
                  valor: identidad.difficulty_score_threshold,
                  onChange: (v) => setIdentidad({ ...identidad, difficulty_score_threshold: v }),
                  numeric: true,
                })}
              </Campo>
              <Campo
                id="ajustes-ranges"
                label="Horario de atención"
                ayuda={`Una franja por línea: día HH:MM-HH:MM. Ej.: 0 08:00-18:00 es el lunes. Días: ${leyendaDias()}`}
              >
                {InputCampo({
                  id: "ajustes-ranges",
                  valor: identidad.business_ranges,
                  onChange: (v) => setIdentidad({ ...identidad, business_ranges: v }),
                  multiline: true,
                })}
              </Campo>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 8,
                }}
              >
                <Text style={{ color: colores.texto, fontSize: 13, fontWeight: "600" }}>
                  Pausar asistente
                </Text>
                <Switch
                  testID="ajustes-bot-paused"
                  value={identidad.bot_paused}
                  onValueChange={(v) => setIdentidad({ ...identidad, bot_paused: v })}
                />
              </View>
            </View>
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
              <Campo id="ajustes-temperature" label="Temperatura (0-2)">
                {InputCampo({
                  id: "ajustes-temperature",
                  valor: cerebro.model_temperature,
                  onChange: (v) => setCerebro({ ...cerebro, model_temperature: v }),
                  numeric: true,
                })}
              </Campo>
              <Campo id="ajustes-max-tools" label="Máx. llamadas a herramientas por turno">
                {InputCampo({
                  id: "ajustes-max-tools",
                  valor: cerebro.policy_max_tool_calls,
                  onChange: (v) => setCerebro({ ...cerebro, policy_max_tool_calls: v }),
                  numeric: true,
                })}
              </Campo>
              <Campo id="ajustes-budget" label="Presupuesto por conversación">
                {InputCampo({
                  id: "ajustes-budget",
                  valor: cerebro.policy_budget,
                  onChange: (v) => setCerebro({ ...cerebro, policy_budget: v }),
                  numeric: true,
                })}
              </Campo>
            </View>
          ) : sub === "memoria" ? (
            <View testID="ajustes-memoria">
              <Campo id="ajustes-short-term" label="Turnos de contexto (memoria corta)">
                {InputCampo({
                  id: "ajustes-short-term",
                  valor: memoria.short_term_turns,
                  onChange: (v) => setMemoria({ ...memoria, short_term_turns: v }),
                  numeric: true,
                })}
              </Campo>
              <Campo id="ajustes-rag-topk" label="Recall RAG (top K)" ayuda="0 = desactivado (1–20).">
                {InputCampo({
                  id: "ajustes-rag-topk",
                  valor: memoria.rag_top_k,
                  onChange: (v) => setMemoria({ ...memoria, rag_top_k: v }),
                  numeric: true,
                })}
              </Campo>
              <Campo id="ajustes-rag-score" label="Similitud mínima (0–1)">
                {InputCampo({
                  id: "ajustes-rag-score",
                  valor: memoria.rag_min_score,
                  onChange: (v) => setMemoria({ ...memoria, rag_min_score: v }),
                  numeric: true,
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
                <Text style={{ color: "#ffffff", fontWeight: "700" }}>
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
