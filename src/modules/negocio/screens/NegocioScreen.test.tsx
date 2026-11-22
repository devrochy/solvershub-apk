jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { NegocioScreen } from "./NegocioScreen";

const mockUseAdminApi = useAdminApi as jest.Mock;
const mockGet = jest.fn();
const cliente = { get: mockGet, post: jest.fn(), put: jest.fn(), patch: jest.fn(), del: jest.fn() };

const PLAN = {
  overview: { days_left: 20, has_plan: true, operational: true, plan_id: "basic", plan_name: "Basic", status: "activo" },
  payments: [],
  plans: [
    {
      id: "basic",
      name: "Basic",
      price_cop: 129000,
      monthly_credits: 12000,
      is_free: false,
      current: true,
      limits: { agentes: 2, colaboradores: 5, clientes: 1000, conexiones: 2, correos: 1 },
      features: { canales: ["whatsapp", "web", "telegram"], soporte: "email" },
    },
  ],
  credit: { limit: 12000, used: 4000, percent: 33.3, by_agent_truncated: false },
  usage: [
    { key: "conexiones", label: "Conexiones", unit: "conexiones", limit: 2, used: 1, percent: 50, scope: "lifetime", exceeded: false },
    { key: "agentes", label: "Agentes publicados", unit: "agentes", limit: 2, used: 1, percent: 50, scope: "lifetime", exceeded: false },
    { key: "creditos", label: "Crédito mensual", unit: "créditos", limit: null, used: 4000, percent: null, scope: "period", exceeded: false },
    { key: "conversaciones", label: "Conversaciones", unit: "conversaciones", limit: 500, used: 10, percent: 2, scope: "period", exceeded: false },
  ],
};

const COSTOS = {
  by_conversation: [],
  by_model: [{ avg_latency: 300, calls: 10, cost: 0.42, model: "deepseek-flash", tokens_in: 1, tokens_out: 1 }],
  month: 1.5,
  today: 0.2,
  total_turns: 25,
};

describe("NegocioScreen (HU-APP-09)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAdminApi.mockReturnValue(cliente);
    mockGet.mockImplementation((path: string) =>
      path === "/admin/plan" ? Promise.resolve(PLAN) : Promise.resolve(COSTOS),
    );
  });

  it("muestra el crédito del mes, los topes y los planes con precio y beneficios (HU-BILL-27)", async () => {
    const { getByText, getByTestId, queryByTestId, queryByText } = await render(<NegocioScreen />);
    await waitFor(() => expect(getByTestId("negocio-credito")).toBeTruthy());
    expect(getByText("Te quedan 8.000 créditos")).toBeTruthy();
    expect(getByText("Unos $ 80.000 · Usaste 4.000 de 12.000")).toBeTruthy();
    expect(getByTestId("negocio-tope-agentes")).toBeTruthy();
    expect(getByTestId("negocio-tope-conexiones")).toBeTruthy();
    // Ni el crédito duplicado como barra ni las métricas retiradas de v1.
    expect(queryByTestId("negocio-tope-creditos")).toBeNull();
    expect(queryByTestId("negocio-tope-conversaciones")).toBeNull();
    expect(queryByText("Conversaciones")).toBeNull();
    expect(getByText("$ 129.000 al mes")).toBeTruthy();
    expect(getByText("· 12.000 créditos al mes")).toBeTruthy();
    expect(getByText("· 1 correo")).toBeTruthy();
  });

  it("sin medición del crédito lo dice en vez de pintar una barra", async () => {
    mockGet.mockImplementation((path: string) =>
      path === "/admin/plan"
        ? Promise.resolve({ ...PLAN, credit: { limit: 12000, used: null, by_agent_truncated: false } })
        : Promise.resolve(COSTOS),
    );
    const { getByText } = await render(<NegocioScreen />);
    await waitFor(() => expect(getByText("12.000 créditos al mes")).toBeTruthy());
    expect(getByText("La medición del consumo llega pronto. 1 crédito = $ 10.")).toBeTruthy();
  });

  it("cambia a costos y muestra los KPIs y modelos", async () => {
    const { getByTestId, getByText } = await render(<NegocioScreen />);
    await waitFor(() => expect(getByTestId("negocio-costos")).toBeTruthy());

    await fireEvent.press(getByTestId("negocio-costos"));
    expect(getByText("US$ 0.20")).toBeTruthy();
    expect(getByText("US$ 1.50")).toBeTruthy();
    expect(getByText("deepseek-flash")).toBeTruthy();
  });

  it("con error muestra el aviso", async () => {
    mockGet.mockRejectedValue(new Error("red"));
    const { getByTestId } = await render(<NegocioScreen />);
    await waitFor(() => expect(getByTestId("negocio-error")).toBeTruthy());
  });
  it("abre en la pestaña pedida por el cajón del panel (HU-DS-11)", async () => {
    const { getByTestId } = await render(<NegocioScreen pestanaInicial={{ pestana: "costos", n: 1 }} />);
    await waitFor(() => expect(getByTestId("negocio-costos")).toHaveStyle({ borderBottomWidth: 2 }));
  });
});
