jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { NegocioScreen } from "./NegocioScreen";

const mockUseAdminApi = useAdminApi as jest.Mock;
const mockGet = jest.fn();
const cliente = { get: mockGet, post: jest.fn(), put: jest.fn(), patch: jest.fn(), del: jest.fn() };

const PLAN = {
  overview: { days_left: 20, has_plan: true, operational: true, plan_id: "p1", plan_name: "Negocio", status: "activo" },
  payments: [],
  plans: [{ id: "p1", name: "Negocio", price_cop: 199000, is_free: false, current: true, limits: {}, features: {} }],
  usage: [{ key: "credits", label: "Créditos", limit: 1000, percent: 42, remaining: 580, scope: "month", exceeded: false }],
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

  it("muestra plan, consumo y planes disponibles", async () => {
    const { getByText } = await render(<NegocioScreen />);
    await waitFor(() => expect(getByText("Negocio")).toBeTruthy());
    expect(getByText("Créditos")).toBeTruthy();
    expect(getByText("580 restantes de 1000")).toBeTruthy();
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
