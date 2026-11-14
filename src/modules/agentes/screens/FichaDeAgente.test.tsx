jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { FichaDeAgente } from "./FichaDeAgente";

const mockGet = jest.fn();
const cliente = {
  get: mockGet,
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  del: jest.fn(),
};

const pagina = (items: unknown[]) => ({
  items,
  has_more: false,
  page: 1,
  page_size: 100,
  total: items.length,
});
const habilidades = [
  {
    pack_id: "pack_payments",
    installed: true,
    status: "active",
    config: { cuenta_id: "c1" },
  },
  { pack_id: "pack_knowledge", installed: false, status: null, config: {} },
];
const acciones = [
  {
    tool: "crear_pedido",
    group: "pedidos",
    pack_id: "pack_commerce",
    enabled: true,
    in_agent: true,
    by_superpower: false,
    max_calls_per_conversation: null,
    requires_confirmation: true,
  },
  {
    tool: "confirmar_pago_pedido",
    group: "pagos",
    pack_id: "pack_payments",
    enabled: false,
    in_agent: true,
    by_superpower: false,
    max_calls_per_conversation: null,
    requires_confirmation: false,
  },
];
const cuentas = [{ id: "c1", name: "Tienda principal", sandbox: false, agent_ids: ["ag-1"] }];

function responder(opciones: { cuentas?: unknown; fallaHabilidades?: boolean } = {}) {
  mockGet.mockImplementation((ruta: string) => {
    if (ruta.endsWith("/skills")) {
      return opciones.fallaHabilidades ? Promise.reject(new Error("sin red")) : Promise.resolve(pagina(habilidades));
    }
    if (ruta.endsWith("/actions")) return Promise.resolve(pagina(acciones));
    if (ruta === "/pack/payments/accounts") {
      return opciones.cuentas instanceof Error
        ? Promise.reject(opciones.cuentas)
        : Promise.resolve(opciones.cuentas ?? cuentas);
    }
    return Promise.reject(new Error(`ruta inesperada ${ruta}`));
  });
}

describe("FichaDeAgente (HU-AOS-66)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAdminApi as jest.Mock).mockReturnValue(cliente);
  });

  it("muestra las habilidades con la cuenta Wompi y las acciones agrupadas, sin controles de edición", async () => {
    responder();
    const { getByText, getAllByText, getByTestId, queryByRole } = await render(
      <FichaDeAgente agentId="ag-1" nombre="Ventas" onVolver={jest.fn()} />,
    );
    await waitFor(() => getByText("Pagos en línea"));
    expect(mockGet).toHaveBeenCalledWith("/admin/agents/ag-1/skills", {
      page: 1,
      page_size: 100,
    });
    expect(mockGet).toHaveBeenCalledWith("/admin/agents/ag-1/actions", {
      page: 1,
      page_size: 100,
    });
    expect(getByText("Lista")).toBeTruthy();
    expect(getByText("Cobra con: Tienda principal · producción")).toBeTruthy();
    expect(getByText("Conocimiento")).toBeTruthy();
    expect(getByText("Sin agregar")).toBeTruthy();
    expect(getByTestId("grupo-pedidos")).toBeTruthy();
    expect(getByText("Crear el pedido")).toBeTruthy();
    expect(getByText("Pide confirmación antes de hacerlo")).toBeTruthy();
    expect(getAllByText("Pagos").length).toBeGreaterThan(0);
    expect(getByText("Apagada")).toBeTruthy();
    expect(queryByRole("switch")).toBeNull();
    expect(getByText(/entra al panel web/)).toBeTruthy();
  });

  it("sin permiso para ver las cuentas, la ficha se muestra igual", async () => {
    responder({ cuentas: new Error("403") });
    const { getByText } = await render(<FichaDeAgente agentId="ag-1" nombre="Ventas" onVolver={jest.fn()} />);
    await waitFor(() => getByText("Cobra con una cuenta Wompi del negocio."));
  });

  it("los textos no hablan de pack, plugin ni tool", async () => {
    responder();
    const { getByText, toJSON } = await render(<FichaDeAgente agentId="ag-1" nombre="Ventas" onVolver={jest.fn()} />);
    await waitFor(() => getByText("Pagos en línea"));
    const textos: string[] = [];
    const recorrer = (n: unknown): void => {
      if (typeof n === "string") textos.push(n);
      else if (Array.isArray(n)) n.forEach(recorrer);
      else if (n && typeof n === "object") recorrer((n as { children?: unknown }).children);
    };
    recorrer(toJSON());
    const visibles = textos.join(" ");
    expect(visibles).toContain("Crear el pedido");
    expect(visibles).not.toMatch(/\b(pack|plugin|tool)s?\b/i);
  });

  it("si falla la carga avisa, deja reintentar y volver", async () => {
    const onVolver = jest.fn();
    responder({ fallaHabilidades: true });
    const { getByText, getByLabelText } = await render(
      <FichaDeAgente agentId="ag-1" nombre="Ventas" onVolver={onVolver} />,
    );
    await waitFor(() => getByText(/No pudimos cargar este agente/));
    responder();
    await fireEvent.press(getByText("Reintentar"));
    await waitFor(() => getByText("Pagos en línea"));
    await fireEvent.press(getByLabelText("Volver a agentes"));
    expect(onVolver).toHaveBeenCalled();
  });
});
