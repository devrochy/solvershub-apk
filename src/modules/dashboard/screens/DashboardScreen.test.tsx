jest.mock("expo-secure-store");
const mockGet = jest.fn();
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));
let mockSesion: unknown = null;
jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => ({ sesion: mockSesion, loading: false }),
}));

import { fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { emitirNavegacion } from "@shared/navegacion-evento";
import { useAdminApi } from "@core/session/use-admin-api";
import { DashboardScreen } from "./DashboardScreen";

jest.mock("@shared/navegacion-evento", () => ({ emitirNavegacion: jest.fn() }));

const mockUseAdminApi = useAdminApi as jest.Mock;
const clienteFijo = {
  get: mockGet,
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  del: jest.fn(),
};

const DASHBOARD = {
  billing: null,
  bot_paused: false,
  kpi: {
    active_plugins: 2,
    conversations_7d: 12,
    cost_30d: 1.5,
    messages_7d: 40,
    pending_escalations: 3,
  },
  llm_label: "deepseek-flash",
  recent: [
    { customer_name: "Juanita", external_id: null, id: "c-1", status: "open" },
  ],
  tenant_id: "t-1",
};

const SESION = {
  token: "t",
  adminId: "a-1",
  email: "e",
  role: "admin",
  tenantRole: "owner",
  tenantId: "t-1",
  tenantName: "Mi Negocio",
  permissions: {
    dashboard: "write",
    conversations: "write",
    escalations: "write",
    plan: "write",
    settings: "write",
    agents: "write",
    costs: "read",
  },
};

const SUPERVISOR = {
  ...SESION,
  tenantRole: "colaborador",
  permissions: { dashboard: "read", conversations: "read", "pack_cobranza:resumen": "write" },
};

const OPERADOR = {
  ...SESION,
  tenantRole: "colaborador",
  permissions: { dashboard: "read", conversations: "read", escalations: "write", plan: "read" },
};

const kpi = (parcial: object) => ({
  id: "k",
  label: "K",
  valor: 1,
  unidad: "count",
  previo: null,
  delta_pct: null,
  polaridad: "up-good",
  ...parcial,
});

const POR_AGENTE = {
  periodo: { dias: 7 },
  runtime: "v3",
  general: {
    kpis: [
      kpi({
        id: "conversaciones",
        label: "Conversaciones",
        valor: 30,
        previo: 20,
        delta_pct: 50,
        hint: "Últimos 7 días",
        destino: { ruta: "conversaciones", params: {} },
      }),
      kpi({
        id: "escalaciones_pendientes",
        label: "Escalaciones pendientes",
        valor: 3,
        polaridad: "up-bad",
        destino: { ruta: "escalaciones", params: {} },
      }),
      kpi({ id: "tasa_escalamiento", label: "Tasa de escalamiento", valor: 4.8, unidad: "pct", previo: 5.4, delta_pct: -11, polaridad: "up-bad" }),
      kpi({ id: "consistencia", label: "Consistencia", valor: 92, unidad: "pct", previo: 89, delta_pct: 3 }),
      kpi({ id: "costo_llm", label: "Costo de IA", valor: 1.5, unidad: "usd", polaridad: "up-bad" }),
    ],
    serie: [
      { fecha: "2026-10-21", turnos: 3, conversaciones: 2, costo: 0.02 },
      { fecha: "2026-10-22", turnos: 4, conversaciones: 3, costo: 0.02 },
      { fecha: "2026-10-23", turnos: 1, conversaciones: 1, costo: 0 },
      { fecha: "2026-10-24", turnos: 5, conversaciones: 4, costo: 0.03 },
      { fecha: "2026-10-25", turnos: 3, conversaciones: 2, costo: 0.02 },
      { fecha: "2026-10-26", turnos: 5, conversaciones: 3, costo: 0.03 },
      { fecha: "2026-10-27", turnos: 3, conversaciones: 2, costo: 0.02 },
    ],
  },
  agentes: [
    {
      ref: "ag-1",
      key: "ventas",
      name: "Ventas",
      kind: "specialist",
      kpis: [kpi({ id: "turnos", label: "Turnos", valor: 9 })],
      serie: [
        { fecha: "2026-10-21", turnos: 1, conversaciones: 1, costo: 0.01 },
        { fecha: "2026-10-22", turnos: 2, conversaciones: 1, costo: 0.01 },
        { fecha: "2026-10-23", turnos: 0, conversaciones: 0, costo: 0 },
        { fecha: "2026-10-24", turnos: 2, conversaciones: 1, costo: 0.01 },
        { fecha: "2026-10-25", turnos: 1, conversaciones: 1, costo: 0.01 },
        { fecha: "2026-10-26", turnos: 2, conversaciones: 1, costo: 0.01 },
        { fecha: "2026-10-27", turnos: 1, conversaciones: 1, costo: 0.01 },
      ],
      ultima_actividad: "2026-10-27T18:30:00Z",
      modulos: [
        {
          id: "pack_commerce",
          nombre: "Comercio",
          kpis: [
            kpi({ id: "pedidos", label: "Pedidos", valor: 4, destino: { ruta: "comercio.pedidos", params: {} } }),
          ],
        },
      ],
    },
    {
      ref: "ag-2",
      key: "cobranza",
      name: "Cobranza",
      kind: "backoffice",
      kpis: [],
      serie: [],
      modulos: [
        {
          id: "pack_cobranza",
          nombre: "Cobranza",
          error: null,
          kpis: [
            kpi({ id: "recaudo", label: "Recaudo", valor: 1250000, unidad: "money", delta_pct: 12, previo: 1000000 }),
            kpi({ id: "cartera_en_mora", label: "Cartera en mora", valor: 8, polaridad: "up-bad", delta_pct: 25, previo: 6 }),
            kpi({ id: "promesas_pendientes", label: "Promesas pendientes", valor: 5 }),
          ],
        },
      ],
    },
    {
      ref: "ag-core",
      key: "coordinador",
      name: "Coordinador",
      kind: "core",
      kpis: [kpi({ id: "turnos", label: "Turnos", valor: 4 })],
      serie: [],
      modulos: [],
    },
  ],
};

const ESCALACIONES = {
  items: [
    {
      conversation_id: "conv-9",
      created_at: new Date(Date.now() - 12 * 60000).toISOString(),
      customer_name: "Marta Ruiz",
      external_id: null,
      reason: "x",
      reason_code: "queja",
      reason_label: "Queja del cliente",
      status: "pendiente",
      summary: "s",
    },
  ],
};

type Respuestas = Partial<Record<"dashboard" | "agentes" | "escalaciones" | "cobranza", unknown>>;

function responder(r: Respuestas = {}) {
  const por = {
    dashboard: DASHBOARD,
    agentes: POR_AGENTE,
    escalaciones: ESCALACIONES,
    cobranza: { kpis: [] },
    ...r,
  };
  const ruta: Record<string, keyof typeof por> = {
    "/admin/dashboard": "dashboard",
    "/admin/dashboard/agents": "agentes",
    "/admin/escalations": "escalaciones",
    "/pack/cobranza/summary": "cobranza",
  };
  mockGet.mockImplementation((path: string) => {
    const valor = por[ruta[path.split("?")[0]]];
    return valor instanceof Error ? Promise.reject(valor) : Promise.resolve(valor);
  });
}



describe("DashboardScreen: Resumen por rol (HU-DS-13)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSesion = SESION;
    mockUseAdminApi.mockReturnValue(clienteFijo);
    responder();
  });

  describe("perfil Dueño", () => {
    it("muestra el perfil, las cifras del negocio, el estado y la actividad", async () => {
      const { getByTestId, getByText, queryByText } = await render(<DashboardScreen />);
      await waitFor(() => expect(getByTestId("kpi-kpi.conversaciones")).toBeTruthy());

      expect(getByText("Resumen")).toBeTruthy();
      expect(getByText("Perfil Dueño")).toBeTruthy();
      expect(getByText("30")).toBeTruthy();
      expect(getByText("+50 % frente a los 7 días anteriores")).toBeTruthy();
      expect(getByText("+50 % frente a los 7 días anteriores")).toBeTruthy();
      expect(within(getByTestId("kpi-kpi.conversaciones")).getByText("Últimos 7 días")).toBeTruthy();
      expect(getByText("Estado del sistema")).toBeTruthy();
      expect(getByText("deepseek-flash")).toBeTruthy();
      expect(getByText("Actividad reciente")).toBeTruthy();
      expect(getByText("Juanita")).toBeTruthy();
      // La cola de escalaciones es del operador.
      expect(queryByText("Cola de escalaciones")).toBeNull();
    });

    it("ordena el Resumen en secciones: agente general, evolución diaria y agentes", async () => {
      const { getByTestId, getByText } = await render(<DashboardScreen />);
      await waitFor(() => expect(getByTestId("resumen-agentes")).toBeTruthy());
      expect(getByText("Agente general")).toBeTruthy();
      expect(getByText("Evolución diaria")).toBeTruthy();
      expect(getByText("Agentes")).toBeTruthy();
      // La tabla «Actividad por agente» y el rótulo de antes ya no están.
      expect(() => getByText("Actividad por agente")).toThrow();
      expect(() => getByText("Módulos por agente")).toThrow();
    });

    it("el agente general lleva la cifra principal con la tendencia del negocio", async () => {
      const { getByTestId } = await render(<DashboardScreen />);
      // La tendencia es decorativa (la cifra ya está escrita), así que no cuenta para accesibilidad.
      await waitFor(() => expect(getByTestId("tendencia-conversaciones", { includeHiddenElements: true })).toBeTruthy());
      expect(within(getByTestId("resumen-general")).getByTestId("kpi-kpi.conversaciones")).toBeTruthy();
    });

    it("cada agente es una tarjeta plegable: la primera abierta, sin Coordinador y con insignia solo de back-office", async () => {
      const { getByTestId, queryByTestId, queryByText, getByText } = await render(<DashboardScreen />);
      await waitFor(() => expect(getByTestId("resumen-ag-1")).toBeTruthy());
      // Ventas abierta: su módulo se ve; Cobranza plegada: solo sus dos cifras.
      expect(getByText("Módulo · Comercio")).toBeTruthy();
      expect(queryByText("Módulo · Cobranza")).toBeNull();
      expect(getByText("Recaudo $ 1.250.000 · Cartera en mora 8")).toBeTruthy();
      expect(queryByTestId("resumen-ag-core")).toBeNull();
      expect(queryByText("Especialista")).toBeNull();
      // Abrir Cobranza enseña su insignia y su módulo.
      await fireEvent.press(getByTestId("resumen-ag-2-cabecera"));
      expect(getByText("Back-office")).toBeTruthy();
      expect(getByText("Módulo · Cobranza")).toBeTruthy();
    });

    it("el agente general suma tasa de escalamiento, consistencia y costo IA", async () => {
      const { getByTestId, getByText } = await render(<DashboardScreen />);
      await waitFor(() => expect(getByTestId("kpi-kpi.tasa_escalamiento")).toBeTruthy());
      const general = within(getByTestId("resumen-general"));
      expect(general.getByText("Tasa de escalamiento")).toBeTruthy();
      expect(general.getByText("4,8 %")).toBeTruthy();
      expect(general.getByText("Consistencia")).toBeTruthy();
      expect(general.getByText("92 %")).toBeTruthy();
      expect(general.getByTestId("kpi-kpi.costo_ia")).toBeTruthy();
      expect(getByText("US$ 1,50")).toBeTruthy();
    });

    it("sin permiso de costos o de agentes, esas cifras no salen", async () => {
      mockSesion = { ...SESION, permissions: { ...SESION.permissions, costs: null, agents: null } };
      const { getByTestId, queryByTestId } = await render(<DashboardScreen />);
      await waitFor(() => expect(getByTestId("kpi-kpi.conversaciones")).toBeTruthy());
      expect(queryByTestId("kpi-kpi.costo_ia")).toBeNull();
      expect(queryByTestId("kpi-kpi.tasa_escalamiento")).toBeNull();
      expect(queryByTestId("kpi-kpi.consistencia")).toBeNull();
    });

    it("las cifras de un módulo no se repiten arriba cuando la tarjeta de su agente las trae", async () => {
      const { getByTestId, queryByTestId } = await render(<DashboardScreen />);
      await waitFor(() => expect(getByTestId("resumen-agentes")).toBeTruthy());
      expect(queryByTestId("kpi-kpi.pedidos")).toBeNull();
      expect(queryByTestId("kpi-kpi.recaudo_hoy")).toBeNull();
    });

    it("tocar una cifra con pantalla navega a ella", async () => {
      const { getByTestId } = await render(<DashboardScreen />);
      await waitFor(() => expect(getByTestId("kpi-kpi.por_atender")).toBeTruthy());
      await fireEvent.press(getByTestId("kpi-kpi.por_atender"));
      expect(emitirNavegacion).toHaveBeenCalledWith({ tab: "conversaciones", pestana: "escalaciones" });
    });

    it("avisa si el asistente está pausado y deja reanudarlo", async () => {
      responder({ dashboard: { ...DASHBOARD, bot_paused: true } });
      mockUseAdminApi.mockReturnValue({ ...clienteFijo, put: jest.fn().mockResolvedValue({ paused: false }) });
      const { getByTestId, getByText, queryByText } = await render(<DashboardScreen />);
      await waitFor(() => expect(getByText("Tu asistente está pausado")).toBeTruthy());

      await fireEvent.press(getByTestId("accion-pausar-asistente"));
      await waitFor(() => expect(queryByText("Tu asistente está pausado")).toBeNull());
      expect((mockUseAdminApi.mock.results[0].value as typeof clienteFijo).put).toHaveBeenCalledWith(
        "/admin/settings/bot-paused",
        { paused: false },
      );
    });
  });

  describe("perfil Supervisor", () => {
    beforeEach(() => {
      mockSesion = SUPERVISOR;
    });

    it("ve las cifras de su pack con polaridad y no las del plan ni la cola", async () => {
      const { getByTestId, getByText, queryByText } = await render(<DashboardScreen />);
      await waitFor(() => expect(getByTestId("kpi-kpi.mora")).toBeTruthy());

      expect(getByText("Perfil Supervisor")).toBeTruthy();
      expect(getByText("Recaudo")).toBeTruthy();
      expect(getByText("$ 1.250.000")).toBeTruthy();
      expect(getByText("Cartera en mora")).toBeTruthy();
      // La mora sube: el delta se escribe con flecha (desfavorable por polaridad).
      expect(getByText("+25 % frente a los 7 días anteriores")).toBeTruthy();
      expect(getByText("Promesas pendientes")).toBeTruthy();
      expect(queryByText("Cola de escalaciones")).toBeNull();
      expect(queryByText("Pedidos")).toBeNull();
      expect(queryByText("Estado del sistema")).toBeNull();
      expect(queryByText("Acciones rápidas")).toBeNull();
    });

    it("se lee por secciones: Cobranza con el recaudo como cifra principal", async () => {
      const { getByTestId, getByText } = await render(<DashboardScreen />);
      await waitFor(() => expect(getByTestId("resumen-cobranza")).toBeTruthy());
      expect(getByText("Cobranza")).toBeTruthy();
      const cobranza = within(getByTestId("resumen-cobranza"));
      expect(cobranza.getByTestId("kpi-kpi.recaudo_hoy")).toBeTruthy();
      expect(cobranza.getByTestId("kpi-kpi.mora")).toBeTruthy();
      expect(cobranza.getByTestId("kpi-kpi.promesas_hoy")).toBeTruthy();
    });

    it("con pedidos y citas suma la sección «Operación del día» aparte de Cobranza", async () => {
      mockSesion = {
        ...SUPERVISOR,
        permissions: { ...SUPERVISOR.permissions, pack_commerce: "write" },
      };
      responder({
        agentes: {
          ...POR_AGENTE,
          agentes: [
            POR_AGENTE.agentes[0],
            POR_AGENTE.agentes[1],
          ],
        },
      });
      const { getByTestId } = await render(<DashboardScreen />);
      await waitFor(() => expect(getByTestId("resumen-operacion")).toBeTruthy());
      expect(within(getByTestId("resumen-operacion")).getByTestId("kpi-kpi.pedidos")).toBeTruthy();
      expect(within(getByTestId("resumen-cobranza")).queryByTestId("kpi-kpi.pedidos")).toBeNull();
    });

    it("sin el módulo en el resumen por agente conserva las cifras planas de cobranza", async () => {
      responder({
        agentes: { ...POR_AGENTE, agentes: [] },
        cobranza: { kpis: [{ label: "Caja actual", value: "1.200.000" }] },
      });
      const { getByText } = await render(<DashboardScreen />);
      await waitFor(() => expect(getByText("Caja actual")).toBeTruthy());
      expect(getByText("1.200.000")).toBeTruthy();
    });

    it("no pide el resumen de cobranza si ya vino en el resumen por agente", async () => {
      const { getByTestId } = await render(<DashboardScreen />);
      await waitFor(() => expect(getByTestId("kpi-kpi.mora")).toBeTruthy());
      expect(mockGet).not.toHaveBeenCalledWith("/pack/cobranza/summary");
    });
  });

  describe("perfil Operador", () => {
    beforeEach(() => {
      mockSesion = OPERADOR;
    });

    it("se lee en «Por atender» sin selector de período y con la cola debajo", async () => {
      const { getByTestId, getByText, queryByTestId } = await render(<DashboardScreen />);
      await waitFor(() => expect(getByTestId("resumen-atender")).toBeTruthy());
      expect(getByText("Por atender")).toBeTruthy();
      expect(within(getByTestId("resumen-atender")).getByTestId("kpi-kpi.por_atender")).toBeTruthy();
      expect(queryByTestId("periodo-7")).toBeNull();
      await waitFor(() => expect(getByText("Cola de escalaciones")).toBeTruthy());
    });

    it("ve lo que hay por atender, la cola con antigüedad y ninguna cifra de costos, plan ni packs", async () => {
      const { getByTestId, getByText, queryByText } = await render(<DashboardScreen />);
      await waitFor(() => expect(getByTestId("escalacion-conv-9")).toBeTruthy());

      expect(getByText("Perfil Operador")).toBeTruthy();
      expect(getByText("Escalaciones pendientes")).toBeTruthy();
      expect(getByText("Cola de escalaciones")).toBeTruthy();
      expect(getByText("Marta Ruiz")).toBeTruthy();
      expect(getByText("Queja del cliente")).toBeTruthy();
      expect(getByText("hace 12 min")).toBeTruthy();
      expect(queryByText("Costo de IA")).toBeNull();
      expect(queryByText("Recaudo")).toBeNull();
      expect(queryByText("Estado del sistema")).toBeNull();
      expect(queryByText("Agentes")).toBeNull();
    });
  });

  describe("sin datos (negocio recién creado)", () => {
    it("invita a conectar WhatsApp en vez de mostrar un cero suelto", async () => {
      responder({
        dashboard: { ...DASHBOARD, recent: [], kpi: { ...DASHBOARD.kpi, conversations_7d: 0 } },
        agentes: {
          ...POR_AGENTE,
          general: { kpis: [kpi({ id: "conversaciones", label: "Conversaciones", valor: 0, previo: 0 })] },
          agentes: [],
        },
      });
      const { getByTestId, getAllByText, queryByTestId } = await render(<DashboardScreen />);
      await waitFor(() => expect(getByTestId("conversaciones-vacia")).toBeTruthy());
      expect(queryByTestId("kpi-kpi.conversaciones")).toBeNull();
      expect(getByTestId("actividad-vacia")).toBeTruthy();

      await fireEvent.press(getAllByText("Ir a Conexiones")[0]);
      expect(emitirNavegacion).toHaveBeenCalledWith({ tab: "configuracion", pestana: "conexiones" });
    });

    it("la cola de escalaciones vacía lo dice y ofrece una acción", async () => {
      mockSesion = OPERADOR;
      responder({ escalaciones: { items: [] } });
      const { getByTestId, getByText } = await render(<DashboardScreen />);
      await waitFor(() => expect(getByTestId("escalaciones-vacia")).toBeTruthy());
      expect(getByText("Nada por atender")).toBeTruthy();
      await fireEvent.press(getByText("Ver conversaciones"));
      expect(emitirNavegacion).toHaveBeenCalledWith({ tab: "conversaciones", pestana: "conversaciones" });
    });

    it("una cifra sin datos suficientes se muestra como «—», no como cero", async () => {
      responder({
        agentes: {
          ...POR_AGENTE,
          general: { kpis: [kpi({ id: "conversaciones", label: "Conversaciones", valor: null, unidad: "pct" })] },
        },
      });
      const { getByTestId } = await render(<DashboardScreen />);
      await waitFor(() => expect(getByTestId("kpi-kpi.conversaciones")).toBeTruthy());
      expect(within(getByTestId("kpi-kpi.conversaciones")).getByText("—")).toBeTruthy();
    });
  });

  describe("fallas", () => {
    it("si falla la cola de escalaciones, solo ese widget avisa y se puede reintentar", async () => {
      mockSesion = OPERADOR;
      responder({ escalaciones: new Error("500") });
      const { getByTestId, getByText } = await render(<DashboardScreen />);
      await waitFor(() => expect(getByTestId("widget-lista.escalaciones-error")).toBeTruthy());
      expect(getByText("No pudimos cargar «Cola de escalaciones».")).toBeTruthy();
      // El resto del Resumen sigue ahí.
      expect(getByTestId("kpi-kpi.por_atender")).toBeTruthy();

      responder({});
      await fireEvent.press(getByTestId("widget-lista.escalaciones-reintentar"));
      await waitFor(() => expect(getByText("Marta Ruiz")).toBeTruthy());
    });

    it.each([
      ["el endpoint falla", new Error("500")],
      ["llega vacío", { periodo: {}, runtime: "legacy", general: { kpis: [] }, agentes: [] }],
      ["llega mal formado", { kpis: [] }],
    ])("si el Resumen por agente %s, quedan las cifras de siempre", async (_caso, respuesta) => {
      responder({ agentes: respuesta });
      const { getByTestId, getByText, queryByTestId } = await render(<DashboardScreen />);
      await waitFor(() => expect(getByTestId("kpi-kpi.conversaciones")).toBeTruthy());
      expect(getByText("12")).toBeTruthy();
      expect(getByText("Escalaciones pendientes")).toBeTruthy();
      expect(queryByTestId("resumen-agentes")).toBeNull();
    });

    it("si todo falla muestra un solo error con reintento", async () => {
      mockGet.mockRejectedValue(new Error("red"));
      const { getByTestId } = await render(<DashboardScreen />);
      await waitFor(() => expect(getByTestId("dashboard-error")).toBeTruthy());

      responder();
      await fireEvent.press(getByTestId("dashboard-reintentar"));
      await waitFor(() => expect(getByTestId("kpi-kpi.conversaciones")).toBeTruthy());
    });
  });
});
