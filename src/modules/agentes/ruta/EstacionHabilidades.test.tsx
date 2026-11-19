jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import type { GuardarEstacion } from "@shared/ruta/estacion-del-agente";
import { EstacionHabilidades } from "./EstacionHabilidades";

const mockGet = jest.fn();
const mockPut = jest.fn();
const cliente = { get: mockGet, post: jest.fn(), put: mockPut, patch: jest.fn(), del: jest.fn() };

const poder = (id: string, title: string) => ({
  id,
  title,
  description: "",
  group: "ventas",
  group_label: "Al vender",
  phrases: ["uno", "dos", "tres"],
  skill: "pack_commerce",
  version: "1.4.0",
});
const FORMAS = {
  agent_id: "a-1",
  configurada: false,
  pago_en_linea_disponible: false,
  transfer_proof_required: true,
  transfer_ocr_enabled: false,
  transfer_accounts: [],
  forms: [{ method: "transferencia", enabled: false, instructions: "", estado: "apagada", falta: "", label: "", superpoder: null }],
};

function preparar() {
  mockGet.mockImplementation((path: string) => {
    if (path === "/admin/agent-superpowers")
      return Promise.resolve({ items: [poder("pc.pedido", "Tomar pedido"), poder("pc.cotizar", "Cotizar")], has_more: false });
    if (path === "/admin/agents/a-1/draft")
      return Promise.resolve({ content: { procedures: [{ id: "pc.pedido", version: "^1.0" }] }, lock_version: 7 });
    if (path === "/admin/agent-models") return Promise.resolve({ min_phrases: 3 });
    if (path === "/pack/commerce/agents/a-1/payment-forms") return Promise.resolve(FORMAS);
    if (path === "/admin/agents/a-1/skills") return Promise.resolve({ items: [], has_more: false });
    if (path === "/pack/payments/accounts") return Promise.resolve([]);
    return Promise.reject(new Error(path));
  });
  mockPut.mockImplementation((path: string, body: { content?: unknown }) =>
    Promise.resolve(path.endsWith("/draft") ? { content: body.content, lock_version: 8 } : FORMAS),
  );
}

async function montar() {
  let guardar: GuardarEstacion | null = null;
  const onResumen = jest.fn();
  const api = await render(
    <EstacionHabilidades
      estacion="habilidades"
      agenteId="a-1"
      tipo="ventas"
      nombre="Laura"
      negocio="La Espiga"
      registrarGuardar={(g) => {
        guardar = g;
      }}
      onResumen={onResumen}
      onCargados={jest.fn()}
      onSeguir={jest.fn()}
    />,
  );
  await waitFor(() => api.getByTestId("habilidad-pc.pedido"));
  return { api, onResumen, guardar: () => (guardar as unknown as GuardarEstacion)() };
}

describe("EstacionHabilidades (HU-APP-23)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAdminApi as jest.Mock).mockReturnValue(cliente);
    preparar();
  });

  it("muestra los superpoderes del enfoque agrupados, con lo recomendado y sus cambios", async () => {
    const { api, onResumen } = await montar();
    expect(mockGet).toHaveBeenCalledWith("/admin/agent-superpowers", { agent_id: "a-1", page: 1, page_size: 100 });
    expect(api.getByText("Al vender")).toBeTruthy();
    expect(api.getByText("Recomendado: las 2")).toBeTruthy();
    // El borrador trae uno de los dos: un cambio frente a lo recomendado.
    expect(api.getByText(/1 cambio/)).toBeTruthy();
    expect(onResumen).toHaveBeenLastCalledWith("habilidades", "1 de 2 encendidas");
    await fireEvent.press(api.getByTestId("habilidades-recomendado-usar"));
    expect(api.getByTestId("habilidad-pc.cotizar").props.accessibilityState.checked).toBe(true);
    expect(api.queryByText("Usar lo recomendado")).toBeNull();
  });

  it("guarda el borrador con `procedures` y la cuenta de «Al cobrar»", async () => {
    const { api, guardar } = await montar();
    await fireEvent.press(api.getByTestId("habilidad-pc.cotizar"));
    await fireEvent.changeText(api.getByTestId("habilidades-entidad"), "Nequi");
    await fireEvent.changeText(api.getByTestId("habilidades-numero"), "3001234567");
    await act(async () => {
      await expect(guardar()).resolves.toBe(true);
    });
    expect(mockPut).toHaveBeenCalledWith("/admin/agents/a-1/draft", {
      content: { procedures: [{ id: "pc.pedido", version: "^1.0" }, { id: "pc.cotizar", version: "^1.0" }] },
      lock_version: 7,
    });
    expect(mockPut).toHaveBeenCalledWith(
      "/pack/commerce/agents/a-1/payment-forms",
      expect.objectContaining({
        transfer_accounts: [expect.objectContaining({ entity: "Nequi", accountNumber: "3001234567" })],
        forms: [{ method: "transferencia", enabled: true, instructions: "" }],
      }),
    );
  });

  it("sin superpoderes encendidos no deja seguir ni escribe", async () => {
    const { api, guardar } = await montar();
    await fireEvent.press(api.getByTestId("habilidad-pc.pedido"));
    await act(async () => {
      await expect(guardar()).resolves.toBe(false);
    });
    expect(api.getByText("Marca al menos un superpoder para este agente.")).toBeTruthy();
    expect(mockPut).not.toHaveBeenCalled();
  });
});
