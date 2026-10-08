jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { AvanzadoTab } from "./AvanzadoTab";

const mockGet = jest.fn();
const mockPut = jest.fn();
const mockPost = jest.fn();
const cliente = { get: mockGet, post: mockPost, put: mockPut, patch: jest.fn(), del: jest.fn() };

const AVANZADO = {
  versions: [
    { id: "v-2", version: "1.0.2", is_active: true, created_at: "2026-10-01T00:00:00Z" },
    { id: "v-1", version: "1.0.1", is_active: false, created_at: "2026-09-01T00:00:00Z" },
  ],
  llm: { llm_provider: "deepseek", llm_model: "deepseek-chat", has_api_key: true },
  guardrails_text: "max_length | 500 | retry",
  flow: {
    source: "spec",
    sections: [{ label: "Cobro", purpose: "Recordar cuotas", tools: ["consultar_cuota"] }],
    unknown_tools: ["tool_vieja"],
  },
  eval_runs: [{ id: "abcdef123456", status: "passed", score: 0.92, created_at: null }],
  spec: { name: "agente" },
};

/** Confirma el Alert pulsando el botón destructivo/de acción. */
function aceptarAlert() {
  return jest.spyOn(Alert, "alert").mockImplementation((_t, _m, botones) => {
    botones?.find((b) => b.style !== "cancel")?.onPress?.();
  });
}

async function renderCargado() {
  const utils = await render(<AvanzadoTab />);
  await waitFor(() => expect(utils.getByTestId("avanzado-llm-proveedor")).toBeTruthy());
  return utils;
}

describe("AvanzadoTab (HU-APP-12 · Avanzado)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAdminApi as jest.Mock).mockReturnValue(cliente);
    mockGet.mockResolvedValue(AVANZADO);
    mockPut.mockResolvedValue(undefined);
    mockPost.mockResolvedValue(undefined);
  });

  it("carga versiones, LLM, guardrails, flow y evals", async () => {
    const { getByTestId, getByText } = await renderCargado();
    expect(mockGet).toHaveBeenCalledWith("/admin/settings/advanced");
    expect(getByTestId("avanzado-llm-proveedor").props.value).toBe("deepseek");
    expect(getByTestId("avanzado-llm-modelo").props.value).toBe("deepseek-chat");
    expect(getByTestId("avanzado-guardrails").props.value).toBe("max_length | 500 | retry");
    expect(getByTestId("avanzado-version-v-2")).toBeTruthy();
    expect(getByTestId("avanzado-activar-v-1")).toBeTruthy();
    expect(getByText("Cobro")).toBeTruthy();
    expect(getByText("Herramientas desconocidas: tool_vieja")).toBeTruthy();
    expect(getByTestId("avanzado-eval-abcdef123456")).toBeTruthy();
  });

  it("guarda el LLM sin cambiar la llave si queda vacía", async () => {
    const { getByTestId } = await renderCargado();
    await fireEvent.changeText(getByTestId("avanzado-llm-modelo"), "deepseek-reasoner");
    await fireEvent.press(getByTestId("avanzado-llm-guardar"));

    await waitFor(() =>
      expect(mockPut).toHaveBeenCalledWith("/admin/settings/advanced/llm", {
        llm_provider: "deepseek",
        llm_model: "deepseek-reasoner",
        llm_api_key: "",
      }),
    );
    await waitFor(() => expect(getByTestId("avanzado-mensaje")).toBeTruthy());
  });

  it("avisa las líneas de guardrails que el backend ignoró", async () => {
    mockPut.mockResolvedValue({ guardrails_text: "x", ignored: ["linea rara"] });
    const { getByTestId, getByText } = await renderCargado();
    await fireEvent.changeText(getByTestId("avanzado-guardrails"), "linea rara");
    await fireEvent.press(getByTestId("avanzado-guardrails-guardar"));

    await waitFor(() =>
      expect(mockPut).toHaveBeenCalledWith("/admin/settings/advanced/guardrails", {
        guardrails_text: "linea rara",
      }),
    );
    await waitFor(() => expect(getByTestId("avanzado-ignoradas")).toBeTruthy());
    expect(getByText("• linea rara")).toBeTruthy();
  });

  it("activa una versión histórica tras confirmar", async () => {
    const alerta = aceptarAlert();
    const { getByTestId } = await renderCargado();
    await fireEvent.press(getByTestId("avanzado-activar-v-1"));

    expect(alerta).toHaveBeenCalled();
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/settings/advanced/versions/v-1/activate"),
    );
    alerta.mockRestore();
  });

  it("no envía un AgentSpec que no es JSON válido", async () => {
    const alerta = aceptarAlert();
    const { getByTestId } = await renderCargado();
    await fireEvent.changeText(getByTestId("avanzado-spec"), "{ no es json");
    await fireEvent.press(getByTestId("avanzado-spec-guardar"));

    await waitFor(() => expect(getByTestId("avanzado-error")).toBeTruthy());
    expect(alerta).not.toHaveBeenCalled();
    expect(mockPut).not.toHaveBeenCalledWith("/admin/settings/advanced/spec", expect.anything());
    alerta.mockRestore();
  });

  it("guarda el AgentSpec tras confirmar que reemplaza todo", async () => {
    const alerta = aceptarAlert();
    const { getByTestId } = await renderCargado();
    await fireEvent.changeText(getByTestId("avanzado-spec"), '{"name": "nuevo"}');
    await fireEvent.press(getByTestId("avanzado-spec-guardar"));

    await waitFor(() =>
      expect(mockPut).toHaveBeenCalledWith("/admin/settings/advanced/spec", {
        spec: { name: "nuevo" },
      }),
    );
    alerta.mockRestore();
  });
});
