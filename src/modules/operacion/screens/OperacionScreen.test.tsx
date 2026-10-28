jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { OperacionScreen } from "./OperacionScreen";

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

const CONEXIONES = [
  { id: "con-1", label: "Ventas", channel: "whatsapp", provider: "meta", type_id: "whatsapp_cloud" },
  { id: "con-2", label: "Soporte", channel: "whatsapp", provider: "meta", type_id: "whatsapp_cloud" },
];

const PAGINA_CONVERSACIONES = {
  items: [
    {
      id: "cv-1",
      customer_name: "Juanita",
      external_id: null,
      status: "open",
      bot_paused: false,
      channel: "whatsapp",
      connection_type: "whatsapp_cloud",
      connection_label: "Ventas",
      last_message: "Quiero hablar con alguien",
      last_message_at: "2026-10-06T00:10:00Z",
      last_message_sender: "customer",
      started_at: "2026-10-06T00:00:00Z",
    },
    {
      id: "cv-2",
      customer_name: null,
      external_id: "wa-777",
      status: "escalated",
      bot_paused: true,
      channel: "whatsapp",
      connection_type: "whatsapp_waweb",
      connection_label: "Soporte",
      last_message: "Necesito ayuda",
      last_message_at: "2026-10-06T01:00:00Z",
      last_message_sender: "agent",
      started_at: "2026-10-06T01:00:00Z",
    },
  ],
  page: 1,
  total: 2,
  has_more: false,
};

describe("OperacionScreen (HU-APP-08)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAdminApi.mockReturnValue(cliente);
    mockGet.mockImplementation((path: string) => {
      if (path === "/admin/conversations") {
        return Promise.resolve(PAGINA_CONVERSACIONES);
      }
      if (path === "/admin/conversations/connections") {
        return Promise.resolve(CONEXIONES);
      }
      if (path === "/admin/escalations") {
        return Promise.resolve({
          items: [
            {
              conversation_id: "cv-2",
              created_at: "2026-10-06T01:00:00Z",
              customer_name: "Escalada",
              external_id: null,
              reason: "pidió humano",
              reason_code: "solicitud_cliente",
              reason_label: "Solicitud del cliente",
              status: "pendiente",
              summary: "La clienta pide hablar con una persona.",
            },
          ],
          page: 1,
          total: 1,
          has_more: false,
        });
      }
      if (path === "/admin/leads") {
        return Promise.resolve({
          items: [
            { id: "l-1", cliente: "Lead Uno", canal: "whatsapp", alta: "2026-10-01", extras: {} },
          ],
          page: 1,
          total: 1,
          has_more: false,
        });
      }
      if (path === "/admin/playground") {
        return Promise.resolve({ turns: [{ text: "Hola, soy el demo", escalated: false }] });
      }
      return Promise.reject(new Error("no mockeado"));
    });
  });

  it("carga conversaciones con tarjeta informativa y busca con debounce", async () => {
    const { getByTestId, getByText } = await render(<OperacionScreen />);
    await waitFor(() => expect(getByTestId("lista-conversaciones")).toBeTruthy());
    expect(getByText("Juanita")).toBeTruthy();
    expect(getByText("Quiero hablar con alguien")).toBeTruthy();
    expect(getByText("WhatsApp Cloud · Ventas")).toBeTruthy();

    await fireEvent.changeText(getByTestId("operacion-busqueda"), "juan");
    await waitFor(() =>
      expect(mockGet).toHaveBeenLastCalledWith(
        "/admin/conversations",
        expect.objectContaining({ q: "juan", page: 1 }),
      ),
    );
  });

  it("filtra por estado y por conexión", async () => {
    const { getByTestId } = await render(<OperacionScreen />);
    await waitFor(() => expect(getByTestId("lista-conversaciones")).toBeTruthy());

    await fireEvent.press(getByTestId("filtro-estado-escalated"));
    await waitFor(() =>
      expect(mockGet).toHaveBeenLastCalledWith(
        "/admin/conversations",
        expect.objectContaining({ status: "escalated", page: 1 }),
      ),
    );

    await fireEvent.press(getByTestId("filtro-conexion"));
    await waitFor(() => expect(getByTestId("conexion-con-1")).toBeTruthy());
    await fireEvent.press(getByTestId("conexion-con-1"));
    await waitFor(() =>
      expect(mockGet).toHaveBeenLastCalledWith(
        "/admin/conversations",
        expect.objectContaining({ connection_id: "con-1", page: 1 }),
      ),
    );
  });

  it("pide reintentar cuando la lista falla", async () => {
    mockGet.mockImplementation((path: string) => {
      if (path === "/admin/conversations/connections") return Promise.resolve(CONEXIONES);
      if (path === "/admin/conversations") return Promise.reject(new Error("red"));
      return Promise.reject(new Error("no mockeado"));
    });
    const { getByTestId, getByText } = await render(<OperacionScreen />);
    await waitFor(() => expect(getByTestId("conversaciones-error")).toBeTruthy());

    const antes = mockGet.mock.calls.filter(([path]) => path === "/admin/conversations").length;
    await fireEvent.press(getByText("Reintentar"));
    await waitFor(() =>
      expect(mockGet.mock.calls.filter(([path]) => path === "/admin/conversations").length).toBeGreaterThan(antes),
    );
  });

  it("carga más conversaciones al llegar al final", async () => {
    mockGet.mockImplementation((path: string, params?: { page?: number }) => {
      if (path === "/admin/conversations/connections") return Promise.resolve(CONEXIONES);
      if (path === "/admin/conversations") {
        const pagina = params?.page ?? 1;
        return Promise.resolve(
          pagina === 2
            ? {
                items: [
                  {
                    ...PAGINA_CONVERSACIONES.items[0],
                    id: "cv-3",
                    customer_name: "Chat dos",
                    last_message: "Segunda página",
                  },
                ],
                page: 2,
                total: 3,
                has_more: false,
              }
            : { ...PAGINA_CONVERSACIONES, has_more: true },
        );
      }
      return Promise.reject(new Error("no mockeado"));
    });

    const { getByTestId, getByText } = await render(<OperacionScreen />);
    await waitFor(() => expect(getByTestId("conversaciones-mas")).toBeTruthy());
    await fireEvent.press(getByTestId("conversaciones-mas"));
    await waitFor(() => expect(getByText("Chat dos")).toBeTruthy());
  });

  it("muestra el estado vacío y permite actualizar", async () => {
    mockGet.mockImplementation((path: string) => {
      if (path === "/admin/conversations/connections") return Promise.resolve(CONEXIONES);
      if (path === "/admin/conversations") {
        return Promise.resolve({ items: [], page: 1, total: 0, has_more: false });
      }
      return Promise.reject(new Error("no mockeado"));
    });
    const { getByText } = await render(<OperacionScreen />);
    await waitFor(() => expect(getByText("Sin conversaciones por ahora")).toBeTruthy());
    await fireEvent.press(getByText("Actualizar"));
    expect(getByText("Sin conversaciones por ahora")).toBeTruthy();
  });

  it("cambia a escalaciones y muestra motivo, estado y resumen", async () => {
    const { getByTestId, getByText } = await render(<OperacionScreen />);
    await waitFor(() => expect(getByTestId("lista-conversaciones")).toBeTruthy());

    await fireEvent.press(getByTestId("pestana-escalaciones"));
    await waitFor(() => expect(getByTestId("lista-escalaciones")).toBeTruthy());
    expect(getByText("Escalada")).toBeTruthy();
    expect(getByText("Solicitud del cliente")).toBeTruthy();
    expect(getByText("La clienta pide hablar con una persona.")).toBeTruthy();
  });

  it("filtra escalaciones por motivo", async () => {
    const { getByTestId } = await render(<OperacionScreen />);
    await waitFor(() => expect(getByTestId("lista-conversaciones")).toBeTruthy());
    await fireEvent.press(getByTestId("pestana-escalaciones"));
    await waitFor(() => expect(getByTestId("lista-escalaciones")).toBeTruthy());

    await fireEvent.press(getByTestId("filtro-motivo"));
    await waitFor(() => expect(getByTestId("motivo-queja")).toBeTruthy());
    await fireEvent.press(getByTestId("motivo-queja"));
    await waitFor(() =>
      expect(mockGet).toHaveBeenLastCalledWith(
        "/admin/escalations",
        expect.objectContaining({ reason_code: "queja", page: 1 }),
      ),
    );
  });

  it("abre el resumen completo de una escalación", async () => {
    const { getByTestId, getAllByText } = await render(<OperacionScreen />);
    await waitFor(() => expect(getByTestId("lista-conversaciones")).toBeTruthy());
    await fireEvent.press(getByTestId("pestana-escalaciones"));
    await waitFor(() => expect(getByTestId("lista-escalaciones")).toBeTruthy());

    await fireEvent.press(getByTestId("escalacion-resumen-cv-2"));
    await waitFor(() => expect(getByTestId("sheet-resumen-escalacion")).toBeTruthy());
    expect(getAllByText("La clienta pide hablar con una persona.").length).toBeGreaterThan(0);
    expect(getByTestId("resumen-escalacion-abrir")).toBeTruthy();
  });

  it("carga más escalaciones al llegar al final", async () => {
    mockGet.mockImplementation((path: string, params?: { page?: number }) => {
      if (path === "/admin/conversations/connections") return Promise.resolve(CONEXIONES);
      if (path === "/admin/conversations") return Promise.resolve(PAGINA_CONVERSACIONES);
      if (path === "/admin/escalations") {
        const pagina = params?.page ?? 1;
        return Promise.resolve({
          items: [
            {
              conversation_id: pagina === 2 ? "cv-9" : "cv-2",
              created_at: "2026-10-06T01:00:00Z",
              customer_name: pagina === 2 ? "Segunda escalación" : "Escalada",
              external_id: null,
              reason: "pidió humano",
              reason_code: "solicitud_cliente",
              reason_label: "Solicitud del cliente",
              status: "pendiente",
              summary: "Resumen de la escalación.",
            },
          ],
          page: pagina,
          total: 2,
          has_more: pagina === 1,
        });
      }
      return Promise.reject(new Error("no mockeado"));
    });

    const { getByTestId, getByText } = await render(<OperacionScreen />);
    await waitFor(() => expect(getByTestId("lista-conversaciones")).toBeTruthy());
    await fireEvent.press(getByTestId("pestana-escalaciones"));
    await waitFor(() => expect(getByTestId("escalaciones-mas")).toBeTruthy());
    await fireEvent.press(getByTestId("escalaciones-mas"));
    await waitFor(() => expect(getByText("Segunda escalación")).toBeTruthy());
  });

  it("desde escalaciones vacías vuelve a conversaciones", async () => {
    mockGet.mockImplementation((path: string) => {
      if (path === "/admin/conversations/connections") return Promise.resolve(CONEXIONES);
      if (path === "/admin/conversations") return Promise.resolve(PAGINA_CONVERSACIONES);
      if (path === "/admin/escalations") {
        return Promise.resolve({ items: [], page: 1, total: 0, has_more: false });
      }
      return Promise.reject(new Error("no mockeado"));
    });
    const { getByTestId, getByText } = await render(<OperacionScreen />);
    await waitFor(() => expect(getByTestId("lista-conversaciones")).toBeTruthy());
    await fireEvent.press(getByTestId("pestana-escalaciones"));
    await waitFor(() => expect(getByText("No hay escalaciones")).toBeTruthy());

    await fireEvent.press(getByText("Ver conversaciones"));
    await waitFor(() => expect(getByTestId("lista-conversaciones")).toBeTruthy());
  });

  it("cambia a clientes (leads)", async () => {
    const { getByTestId, getByText } = await render(<OperacionScreen />);
    await waitFor(() => expect(getByTestId("lista-conversaciones")).toBeTruthy());

    await fireEvent.press(getByTestId("pestana-leads"));
    await waitFor(() => expect(getByTestId("lista-leads")).toBeTruthy());
    expect(getByText("Lead Uno")).toBeTruthy();
  });

  it("muestra el playground y reinicia la demo (HU-APP-21)", async () => {
    const { getByTestId, getByText } = await render(<OperacionScreen />);
    await waitFor(() => expect(getByTestId("pestana-playground")).toBeTruthy());

    await fireEvent.press(getByTestId("pestana-playground"));
    await waitFor(() => expect(getByText("Hola, soy el demo")).toBeTruthy());

    await fireEvent.press(getByTestId("playground-reset"));
    await waitFor(() => expect(mockPost).toHaveBeenCalledWith("/admin/playground/reset"));
  });

  it("abre en la pestaña pedida por el cajón del panel (HU-DS-11)", async () => {
    const { getByTestId } = await render(
      <OperacionScreen pestanaInicial={{ pestana: "escalaciones", n: 1 }} />,
    );
    await waitFor(() => expect(getByTestId("pestana-escalaciones")).toHaveStyle({ borderBottomWidth: 2 }));
  });
});
