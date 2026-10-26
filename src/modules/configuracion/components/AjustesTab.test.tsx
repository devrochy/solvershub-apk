jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));
jest.mock("@data/ajustes", () => ({
  leerAjuste: jest.fn(),
  guardarAjuste: jest.fn(() => Promise.resolve()),
}));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { AdminApiError } from "@core/api/admin";
import { useAdminApi } from "@core/session/use-admin-api";
import { leerAjuste } from "@data/ajustes";
import catalogo from "../testing/catalogo.json";
import { AjustesTab } from "./AjustesTab";

const mockGet = jest.fn();
const mockPut = jest.fn();
const cliente = { get: mockGet, post: jest.fn(), put: mockPut, patch: jest.fn(), del: jest.fn() };

const identidad = {
  assistant_name: "Ana",
  auto_escalate_after_turns: 0,
  available_guardrails: [],
  bot_paused: false,
  brand_voice: "",
  brand_voice_warning: false,
  business_description: "Tienda",
  business_ranges: [],
  business_tz: "America/Bogota",
  currency: "COP",
  debounce_mode: "natural",
  difficulty_long_message_threshold: 400,
  difficulty_score_threshold: 3,
  difficulty_turnos_sin_resolver_threshold: 3,
  disabled_guardrails: [],
  escalation_keywords: [],
  guardrail_fail_action: "escalate",
  guardrail_max_retries: 2,
  out_of_hours_message: "",
  out_of_hours_default_message: "Estamos fuera de horario.",
  persona_emojis: "none",
  persona_forbidden: [],
  persona_max_length: 0,
  persona_tone: "neutral",
  persona_warmth: 3,
  split_style: "un_mensaje",
  timezone: "America/Bogota",
  tono: "formal",
};

function configurarApi(opts: { catalogo?: unknown | "falla"; bajas?: string[] } = {}) {
  mockGet.mockImplementation((path: string) => {
    if (path === "/admin/settings/catalog") {
      return opts.catalogo === "falla" ? Promise.reject(new Error("sin red")) : Promise.resolve(opts.catalogo ?? catalogo);
    }
    if (path === "/admin/settings/bajas") {
      return Promise.resolve({ palabras: opts.bajas ?? [], por_defecto: ["baja", "stop"], usa_por_defecto: !opts.bajas });
    }
    if (path === "/admin/settings") {
      return Promise.resolve({
        identity: identidad,
        brain: { model_primary: "m", model_router: null, model_fallback: null, model_temperature: 0.3, policy_max_tool_calls: 8, policy_budget: 0 },
        memory: { short_term_turns: 12, rag_top_k: 5, rag_min_score: 0.6 },
        skills: [],
      });
    }
    return Promise.reject(new Error(`GET inesperado ${path}`));
  });
}

describe("AjustesTab · Identidad guiada (HU-CFG-06)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAdminApi as jest.Mock).mockReturnValue(cliente);
    (leerAjuste as jest.Mock).mockResolvedValue(null);
    mockPut.mockResolvedValue(undefined);
  });

  it("muestra las mismas etiquetas y segundos que el panel, no identificadores crudos", async () => {
    configurarApi();
    const { findByText, queryByText } = await render(<AjustesTab />);
    expect(await findByText(/Natural · espera 15 s/)).toBeTruthy();
    expect(await findByText("Velocidad de respuesta")).toBeTruthy();
    expect(queryByText("natural")).toBeNull();
    expect(queryByText(/WhatsApp Web/)).toBeNull();
  });

  it("tiene un solo selector de tono y no envía el tono retirado", async () => {
    configurarApi();
    const { findByTestId, queryByTestId, getByTestId } = await render(<AjustesTab />);
    await findByTestId("ajustes-persona_tone-neutral");
    expect(queryByTestId("ajustes-tono")).toBeNull();

    await fireEvent.press(getByTestId("ajustes-guardar"));
    await waitFor(() => expect(mockPut).toHaveBeenCalled());
    const [ruta, cuerpo] = mockPut.mock.calls[0];
    expect(ruta).toBe("/admin/settings/identity");
    expect(cuerpo).not.toHaveProperty("tono");
    expect(cuerpo).toMatchObject({ business_tz: "America/Bogota", difficulty_score_threshold: 3 });
    // La pausa no viaja si no se movió el interruptor.
    expect(cuerpo).not.toHaveProperty("bot_paused");
  });

  it("marca el rango antes de enviar", async () => {
    configurarApi();
    const { findByTestId, getByTestId } = await render(<AjustesTab />);
    await fireEvent.changeText(await findByTestId("ajustes-difficulty_score_threshold"), "11");
    await fireEvent.press(getByTestId("ajustes-guardar"));
    expect((await findByTestId("ajustes-difficulty_score_threshold-error")).props.children).toBe(
      "«Puntaje para razonamiento» debe estar entre 1 y 10.",
    );
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("un 422 marca el campo en español y conserva lo editado", async () => {
    configurarApi();
    mockPut.mockRejectedValue(
      new AdminApiError(422, "validation_error", "Revisa los campos", {
        persona_warmth: "«Calidez» debe estar entre 0 y 5.",
      }),
    );
    const { findByTestId, getByTestId } = await render(<AjustesTab />);
    await fireEvent.changeText(await findByTestId("ajustes-assistant_name"), "Sofía");
    await fireEvent.press(getByTestId("ajustes-guardar"));
    expect((await findByTestId("ajustes-persona_warmth-error")).props.children).toBe(
      "«Calidez» debe estar entre 0 y 5.",
    );
    expect(getByTestId("ajustes-assistant_name").props.value).toBe("Sofía");
  });

  it("apaga el mensaje fuera de horario sin franjas y lo enciende con ellas", async () => {
    configurarApi();
    const { findByTestId, getByTestId, findByText } = await render(<AjustesTab />);
    const mensaje = await findByTestId("ajustes-out_of_hours_message");
    expect(mensaje.props.editable).toBe(false);
    expect(await findByText(/Sin horario de atención/)).toBeTruthy();
    await fireEvent.changeText(getByTestId("ajustes-business_ranges"), "0 08:00-18:00");
    await waitFor(() => expect(getByTestId("ajustes-out_of_hours_message").props.editable).toBe(true));
  });

  it("explica cada guardrail bajo su interruptor", async () => {
    const conNota = JSON.parse(JSON.stringify(catalogo));
    const opcion = conNota.opciones.find((o: { clave: string }) => o.clave === "disabled_guardrails");
    opcion.valores = [{ valor: "verificador_links", etiqueta: "Verificador de enlaces", nota: "Quita los enlaces inventados." }];
    configurarApi({ catalogo: conNota });
    const { findByText } = await render(<AjustesTab />);
    expect(await findByText("Verificador de enlaces")).toBeTruthy();
    expect(await findByText("Quita los enlaces inventados.")).toBeTruthy();
  });

  it("guarda las palabras de baja por su endpoint", async () => {
    configurarApi();
    const { findByTestId, getByTestId } = await render(<AjustesTab />);
    const campo = await findByTestId("ajustes-palabras_de_baja");
    await fireEvent.changeText(campo, "baja");
    await fireEvent.press(getByTestId("ajustes-palabras_de_baja-agregar"));
    await fireEvent.changeText(getByTestId("ajustes-palabras_de_baja"), "no, gracias");
    await fireEvent(getByTestId("ajustes-palabras_de_baja"), "submitEditing");
    await fireEvent.press(getByTestId("ajustes-bajas-guardar"));
    await waitFor(() =>
      expect(mockPut).toHaveBeenCalledWith("/admin/settings/bajas", { palabras: ["baja", "no, gracias"] }),
    );
  });

  it("las palabras de baja no repiten ni aceptan menos de 2 letras, y se pueden quitar", async () => {
    configurarApi({ bajas: ["Cancelación"] });
    const { findByTestId, getByTestId, queryByTestId } = await render(<AjustesTab />);
    await findByTestId("ajustes-palabras_de_baja-frase-0");
    await fireEvent.changeText(getByTestId("ajustes-palabras_de_baja"), "x");
    expect(getByTestId("ajustes-palabras_de_baja-agregar").props.accessibilityState?.disabled).toBe(true);
    await fireEvent.changeText(getByTestId("ajustes-palabras_de_baja"), "cancelacion");
    await fireEvent.press(getByTestId("ajustes-palabras_de_baja-agregar"));
    expect(queryByTestId("ajustes-palabras_de_baja-frase-1")).toBeNull();
    await fireEvent.press(getByTestId("ajustes-palabras_de_baja-quitar-0"));
    expect(queryByTestId("ajustes-palabras_de_baja-frase-0")).toBeNull();
  });

  it("registra una frase prohibida con espacios y comas y viaja intacta en el PUT de identidad", async () => {
    configurarApi();
    const { findByTestId, getByTestId } = await render(<AjustesTab />);
    await fireEvent.changeText(await findByTestId("ajustes-persona_forbidden"), "garantizado, sin falta");
    await fireEvent.press(getByTestId("ajustes-persona_forbidden-agregar"));
    await fireEvent.changeText(getByTestId("ajustes-escalation_keywords"), "ok");
    await fireEvent.press(getByTestId("ajustes-escalation_keywords-agregar"));
    await fireEvent.press(getByTestId("ajustes-guardar"));
    await waitFor(() => expect(mockPut).toHaveBeenCalled());
    expect(mockPut.mock.calls[0][0]).toBe("/admin/settings/identity");
    expect(mockPut.mock.calls[0][1]).toMatchObject({
      persona_forbidden: ["garantizado, sin falta"],
      escalation_keywords: ["ok"],
    });
  });

  it("sin conexión usa el último catálogo guardado en el teléfono", async () => {
    configurarApi({ catalogo: "falla" });
    (leerAjuste as jest.Mock).mockResolvedValue(JSON.stringify(catalogo));
    const { findByText } = await render(<AjustesTab />);
    expect(await findByText(/Natural · espera 15 s/)).toBeTruthy();
  });

  it("sin conexión y sin catálogo guardado avisa, no muestra identificadores crudos", async () => {
    configurarApi({ catalogo: "falla" });
    const { findByTestId, queryByTestId } = await render(<AjustesTab />);
    expect(await findByTestId("ajustes-sin-catalogo")).toBeTruthy();
    expect(queryByTestId("ajustes-debounce_mode-natural")).toBeNull();
  });
});

describe("AjustesTab · números de Cerebro y Memoria", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAdminApi as jest.Mock).mockReturnValue(cliente);
    (leerAjuste as jest.Mock).mockResolvedValue(null);
    mockPut.mockResolvedValue(undefined);
  });

  it("deja borrar el campo, acepta coma decimal y manda el número", async () => {
    configurarApi();
    const { findByTestId, getByTestId } = await render(<AjustesTab />);
    await fireEvent.press(await findByTestId("ajustes-sub-cerebro"));
    const temperatura = await findByTestId("ajustes-temperature");
    await fireEvent.changeText(temperatura, "");
    expect(getByTestId("ajustes-temperature").props.value).toBe("");
    await fireEvent.changeText(getByTestId("ajustes-temperature"), "0,7");
    expect(getByTestId("ajustes-temperature").props.keyboardType).toBe("decimal-pad");
    expect(getByTestId("ajustes-max-tools").props.keyboardType).toBe("number-pad");
    await fireEvent.press(getByTestId("ajustes-guardar"));
    await waitFor(() => expect(mockPut).toHaveBeenCalled());
    expect(mockPut.mock.calls[0][0]).toBe("/admin/settings/brain");
    expect(mockPut.mock.calls[0][1]).toMatchObject({ model_temperature: 0.7, policy_max_tool_calls: 8 });
  });

  it("un campo vacío o fuera de rango se marca y no se envía", async () => {
    configurarApi();
    const { findByTestId, getByTestId } = await render(<AjustesTab />);
    await fireEvent.press(await findByTestId("ajustes-sub-memoria"));
    await fireEvent.changeText(await findByTestId("ajustes-short-term"), "");
    await fireEvent.changeText(getByTestId("ajustes-rag-score"), "1,5");
    await fireEvent.press(getByTestId("ajustes-guardar"));
    expect((await findByTestId("ajustes-short-term-error")).props.children).toBe(
      "«Turnos de contexto» necesita un número.",
    );
    expect(getByTestId("ajustes-rag-score-error").props.children).toBe(
      "«Similitud mínima» debe estar entre 0 y 1.",
    );
    expect(mockPut).not.toHaveBeenCalled();

    // Al corregir un campo, su error se quita.
    await fireEvent.changeText(getByTestId("ajustes-short-term"), "20");
    await waitFor(() => expect(() => getByTestId("ajustes-short-term-error")).toThrow());
  });

  it("quita los ceros a la izquierda y las letras al escribir", async () => {
    configurarApi();
    const { findByTestId, getByTestId } = await render(<AjustesTab />);
    await fireEvent.press(await findByTestId("ajustes-sub-memoria"));
    await fireEvent.changeText(await findByTestId("ajustes-rag-topk"), "04");
    expect(getByTestId("ajustes-rag-topk").props.value).toBe("4");
    await fireEvent.changeText(getByTestId("ajustes-rag-topk"), "1a2");
    expect(getByTestId("ajustes-rag-topk").props.value).toBe("12");
  });
});
