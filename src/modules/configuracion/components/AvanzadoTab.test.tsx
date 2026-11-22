jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { AvanzadoTab } from "./AvanzadoTab";

const mockGet = jest.fn();
const mockPut = jest.fn();
const mockPost = jest.fn();
const cliente = { get: mockGet, post: mockPost, put: mockPut, patch: jest.fn(), del: jest.fn() };

// Con el v2 retirado (HU-AOS-91) `versions`, `guardrails_text` y `spec` llegan vacíos.
const AVANZADO = {
  versions: [],
  llm: { llm_provider: "deepseek", llm_model: "deepseek-chat", has_api_key: true },
  guardrails_text: "",
  flow: {
    source: "spec",
    sections: [{ label: "Cobro", purpose: "Recordar cuotas", tools: ["consultar_cuota"] }],
    unknown_tools: ["tool_vieja"],
  },
  eval_runs: [{ id: "abcdef123456", status: "passed", score: 0.92, created_at: null }],
  spec: {},
};

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

  it("carga LLM, flow y evals, sin versiones, guardrails ni editor del spec", async () => {
    const { getByTestId, getByText, queryByTestId, queryByText } = await renderCargado();
    expect(mockGet).toHaveBeenCalledWith("/admin/settings/advanced");
    expect(getByTestId("avanzado-llm-proveedor").props.value).toBe("deepseek");
    expect(getByTestId("avanzado-llm-modelo").props.value).toBe("deepseek-chat");
    expect(getByText("Cobro")).toBeTruthy();
    expect(getByText("Herramientas desconocidas: tool_vieja")).toBeTruthy();
    expect(getByTestId("avanzado-eval-abcdef123456")).toBeTruthy();
    expect(queryByTestId("avanzado-guardrails")).toBeNull();
    expect(queryByTestId("avanzado-spec")).toBeNull();
    expect(queryByText("Versiones del agente")).toBeNull();
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
});
