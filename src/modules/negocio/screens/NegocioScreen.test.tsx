jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));
let mockRol = "master";
let mockPermisos: Record<string, string> = {};
jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => ({ sesion: { role: mockRol, permissions: mockPermisos } }),
}));

import { Linking } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { AdminApiError } from "@core/api/admin";
import { useAdminApi } from "@core/session/use-admin-api";
import { NegocioScreen } from "./NegocioScreen";

const mockUseAdminApi = useAdminApi as jest.Mock;
const mockGet = jest.fn();
const mockPost = jest.fn();
const cliente = {
  get: mockGet,
  post: mockPost,
  put: jest.fn(),
  patch: jest.fn(),
  del: jest.fn(),
};

const PLAN = {
  overview: {
    days_left: 20,
    has_plan: true,
    operational: true,
    plan_id: "basic",
    plan_name: "Basic",
    status: "activo",
  },
  payments: [],
  plans: [
    {
      id: "basic",
      name: "Basic",
      price_cop: 129000,
      monthly_credits: 12000,
      is_free: false,
      current: true,
      limits: {
        agentes: 2,
        colaboradores: 5,
        clientes: 1000,
        conexiones: 2,
        correos: 1,
      },
      features: { canales: ["whatsapp", "web", "telegram"], soporte: "email" },
    },
  ],
  credit: {
    limit: 12000,
    used: 4000,
    percent: 33.3,
    by_agent_truncated: false,
  },
  usage: [
    {
      key: "conexiones",
      label: "Conexiones",
      unit: "conexiones",
      limit: 2,
      used: 1,
      percent: 50,
      scope: "lifetime",
      exceeded: false,
    },
    {
      key: "agentes",
      label: "Agentes publicados",
      unit: "agentes",
      limit: 2,
      used: 1,
      percent: 50,
      scope: "lifetime",
      exceeded: false,
    },
    {
      key: "creditos",
      label: "Crédito mensual",
      unit: "créditos",
      limit: null,
      used: 4000,
      percent: null,
      scope: "period",
      exceeded: false,
    },
    {
      key: "conversaciones",
      label: "Conversaciones",
      unit: "conversaciones",
      limit: 500,
      used: 10,
      percent: 2,
      scope: "period",
      exceeded: false,
    },
  ],
};

const COSTOS = {
  by_conversation: [],
  by_model: [
    {
      avg_latency: 300,
      calls: 10,
      cost: 0.42,
      model: "deepseek-flash",
      tokens_in: 1,
      tokens_out: 1,
    },
  ],
  month: 1.5,
  today: 0.2,
  total_turns: 25,
};

describe("NegocioScreen (HU-APP-09)", () => {
  afterEach(() => {
    mockRol = "master";
  });

  it("al gestor no le muestra «Costos IA» ni pide los costos (ADR-0210 §5)", async () => {
    mockRol = "admin";
    const { queryByTestId, findByText } = await render(<NegocioScreen />);
    await findByText("Crédito del mes");
    expect(queryByTestId("negocio-costos")).toBeNull();
    expect(mockGet).not.toHaveBeenCalledWith("/admin/costs");
  });

  it("al gestor, una pestaña «costos» pedida por el cajón abre Plan y consumo", async () => {
    mockRol = "admin";
    const { queryByTestId, findByText } = await render(
      <NegocioScreen pestanaInicial={{ pestana: "costos", n: 1 }} />,
    );
    await findByText("Crédito del mes");
    expect(queryByTestId("negocio-costos")).toBeNull();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAdminApi.mockReturnValue(cliente);
    mockGet.mockImplementation((path: string) =>
      path === "/admin/plan" ? Promise.resolve(PLAN) : Promise.resolve(COSTOS),
    );
  });

  it("muestra el crédito del mes, los topes y los planes con precio y beneficios (HU-BILL-27)", async () => {
    const { getByText, getByTestId, queryByTestId, queryByText } = await render(
      <NegocioScreen />,
    );
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
        ? Promise.resolve({
            ...PLAN,
            credit: { limit: 12000, used: null, by_agent_truncated: false },
          })
        : Promise.resolve(COSTOS),
    );
    const { getByText } = await render(<NegocioScreen />);
    await waitFor(() =>
      expect(getByText("12.000 créditos al mes")).toBeTruthy(),
    );
    expect(
      getByText("La medición del consumo llega pronto. 1 crédito = $ 10."),
    ).toBeTruthy();
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
    const { getByTestId } = await render(
      <NegocioScreen pestanaInicial={{ pestana: "costos", n: 1 }} />,
    );
    await waitFor(() =>
      expect(getByTestId("negocio-costos")).toHaveStyle({
        borderBottomWidth: 2,
      }),
    );
  });
});

const CON_RECARGAS = {
  ...PLAN,
  recargas: [
    { id: "recarga_5k", creditos: 5000, precio_lista_cop: 50000, descuento_pct: 15, precio_cop: 42500 },
    { id: "recarga_20k", creditos: 20000, precio_lista_cop: 200000, descuento_pct: 15, precio_cop: 170000 },
  ],
  credit: {
    limit: 12000,
    used: 13000,
    percent: 108.3,
    by_agent_truncated: false,
    balance: {
      total: 20000,
      month: 12000,
      accumulated: 3000,
      accumulated_expires_at: "2026-12-19T12:00:00Z",
      top_ups: 5000,
      used_month: 12000,
      used_accumulated: 1000,
      used_top_ups: 0,
      over_balance: 0,
    },
    balance_percent: 65,
  },
};

describe("NegocioScreen: saldo y compra de créditos (HU-BILL-27 parte 2b)", () => {
  const abrir = jest.spyOn(Linking, "openURL");

  beforeEach(() => {
    jest.clearAllMocks();
    mockRol = "master";
    mockPermisos = {};
    abrir.mockResolvedValue(undefined);
    mockUseAdminApi.mockReturnValue(cliente);
    mockGet.mockImplementation((path: string) =>
      path === "/admin/plan" ? Promise.resolve(CON_RECARGAS) : Promise.resolve(COSTOS),
    );
  });

  it("muestra el saldo total, su equivalente en pesos y el desglose", async () => {
    const { getByText, findByTestId } = await render(<NegocioScreen />);
    await findByTestId("negocio-saldo");
    expect(getByText("Te quedan 7.000 créditos")).toBeTruthy();
    expect(getByText("Saldo total: 20.000 créditos · $ 200.000")).toBeTruthy();
    expect(getByText("Acumulado · Vence el 19 de dic.")).toBeTruthy();
    expect(getByText("Usaste 0 de 5.000")).toBeTruthy();
  });

  it("lista los paquetes, pide el link y lo abre", async () => {
    mockPost.mockResolvedValue({ checkout_url: "https://checkout.wompi.co/l/recarga" });
    const { findByTestId, getByTestId, getByText, queryByTestId } = await render(<NegocioScreen />);
    await fireEvent.press(await findByTestId("negocio-comprar-creditos"));
    expect(getByText("5.000 créditos")).toBeTruthy();
    expect(getByTestId("negocio-recarga-recarga_5k-lista")).toBeTruthy();
    expect(getByText("$ 42.500")).toBeTruthy();
    expect(getByText("$ 50.000")).toBeTruthy();
    await fireEvent.press(getByTestId("negocio-recarga-recarga_5k-comprar"));
    await waitFor(() => expect(abrir).toHaveBeenCalledWith("https://checkout.wompi.co/l/recarga"));
    expect(mockPost).toHaveBeenCalledWith("/admin/plan/recargas", { paquete: "recarga_5k" });
    expect(queryByTestId("negocio-recarga-error")).toBeNull();
  });

  it("bajo el mínimo muestra el mensaje del backend tal cual; otro error, un texto claro", async () => {
    const minimo =
      "Esta recarga cuesta $42.500 COP y en este ambiente la pasarela solo acepta pagos desde $150.000 COP, así que no se puede pagar aquí.";
    mockPost
      .mockRejectedValueOnce(new AdminApiError(409, "recarga_bajo_minimo", minimo))
      .mockRejectedValueOnce(new AdminApiError(502, "checkout_failed", "x"));
    const { findByTestId, getByTestId, findByText } = await render(<NegocioScreen />);
    await fireEvent.press(await findByTestId("negocio-comprar-creditos"));
    await fireEvent.press(getByTestId("negocio-recarga-recarga_5k-comprar"));
    expect(await findByText(minimo)).toBeTruthy();
    await fireEvent.press(getByTestId("negocio-recarga-recarga_20k-comprar"));
    expect(await findByText("No pudimos abrir el pago. Intenta de nuevo en unos minutos.")).toBeTruthy();
    expect(abrir).not.toHaveBeenCalled();
  });

  it("sin paquetes (Free o sin suscripción activa) no aparece «Comprar créditos»", async () => {
    mockGet.mockImplementation((path: string) =>
      path === "/admin/plan" ? Promise.resolve({ ...CON_RECARGAS, recargas: [] }) : Promise.resolve(COSTOS),
    );
    const { findByTestId, queryByTestId } = await render(<NegocioScreen />);
    await findByTestId("negocio-saldo");
    expect(queryByTestId("negocio-comprar-creditos")).toBeNull();
  });

  it("sin permiso de escritura en plan no aparece; con él, sí", async () => {
    mockRol = "admin";
    mockPermisos = { plan: "read" };
    const vista = await render(<NegocioScreen />);
    await vista.findByTestId("negocio-saldo");
    expect(vista.queryByTestId("negocio-comprar-creditos")).toBeNull();
    vista.unmount();
    mockPermisos = { plan: "write" };
    const otra = await render(<NegocioScreen />);
    expect(await otra.findByTestId("negocio-comprar-creditos")).toBeTruthy();
  });
});
