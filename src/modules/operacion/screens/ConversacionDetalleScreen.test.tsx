jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { AdminApiError } from "@core/api/admin";
import { useAdminApi } from "@core/session/use-admin-api";
import { ConversacionDetalleScreen } from "./ConversacionDetalleScreen";

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

const DETALLE = {
  bot_paused: false,
  channel: "whatsapp",
  connection_label: "Ventas",
  connection_type: "whatsapp_cloud",
  customer_id: "lead-1",
  customer_name: "Juanita",
  external_id: "wa-1",
  id: "cv-1",
  messages: [
    {
      content: "Hola, quiero pagar",
      created_at: "2026-10-06T00:00:00Z",
      direction: "inbound",
      id: "m-1",
      sender_type: "customer",
      status: "delivered",
      tool_calls: [],
    },
    {
      content: "Claro, te ayudo",
      created_at: "2026-10-06T00:01:00Z",
      direction: "outbound",
      id: "m-2",
      sender_type: "agent",
      status: "sent",
      tool_calls: ["crear_pedido", "consultar_precio"],
    },
  ],
  notes: [
    {
      text: "Cliente frecuente",
      source: "human",
      author_email: "ana@negocio.co",
      created_at: "2026-10-06T00:02:00Z",
    },
  ],
  started_at: "2026-10-06T00:00:00Z",
  status: "open",
  usage: { cost_usd: 0.02, input_tokens: 1000, output_tokens: 500, turns: 2 },
};

const ESCALADA = {
  ...DETALLE,
  status: "escalated",
  bot_paused: true,
  escalation: {
    id: "e-1",
    reason_code: "queja",
    reason_label: "Queja",
    status: "pendiente",
    summary: "La clienta pide hablar con una persona.",
    assigned_admin_email: null,
    assigned_admin_id: null,
    created_at: "2026-10-06T00:03:00Z",
  },
};

const ASIGNADA = {
  ...ESCALADA,
  escalation: {
    ...ESCALADA.escalation,
    status: "asignada",
    assigned_admin_email: "ana@negocio.co",
    assigned_admin_id: "admin-1",
  },
};

const route = { params: { id: "cv-1", titulo: "Juanita" } } as never;

function crearNavigation() {
  return { navigate: jest.fn() } as never;
}

describe("ConversacionDetalleScreen (HU-APP-08)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAdminApi.mockReturnValue(cliente);
    mockPost.mockResolvedValue(undefined);
    mockGet.mockImplementation((path: string) => {
      if (path === "/admin/conversations/cv-1/templates") {
        return Promise.resolve([
          {
            id: "t-1",
            name: "recordatorio",
            language: "es",
            category: "UTILITY",
            body: "Hola {{1}}, te recordamos tu pago.",
            variables: ["1"],
          },
        ]);
      }
      return Promise.resolve(DETALLE);
    });
  });

  it("muestra cabecera, uso, herramientas y envía una respuesta como humano", async () => {
    mockGet.mockResolvedValue({ ...DETALLE, bot_paused: true });
    const { getByTestId, getByText } = await render(
      <ConversacionDetalleScreen route={route} navigation={crearNavigation()} />,
    );
    await waitFor(() => expect(getByText("Hola, quiero pagar")).toBeTruthy());
    expect(getByText("1.500 tokens", { exact: false })).toBeTruthy();
    expect(getByText("Usó 2 herramientas")).toBeTruthy();

    await fireEvent.press(getByTestId("herramientas-m-2"));
    expect(getByText("crear_pedido")).toBeTruthy();

    await fireEvent.changeText(getByTestId("detalle-respuesta"), "Ya te ayudo");
    await fireEvent.press(getByTestId("detalle-enviar"));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/conversations/cv-1/messages", {
        content: "Ya te ayudo",
      }),
    );
  });

  it("pausa y reanuda el asistente desde la cabecera", async () => {
    const { getByTestId } = await render(
      <ConversacionDetalleScreen route={route} navigation={crearNavigation()} />,
    );
    await waitFor(() => expect(getByTestId("detalle-toggle-bot")).toBeTruthy());

    await fireEvent.press(getByTestId("detalle-toggle-bot"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/conversations/cv-1/toggle-bot"),
    );
  });

  it("resolver pide confirmación y llama al endpoint en una escalada", async () => {
    mockGet.mockResolvedValue(ESCALADA);
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, botones) => {
      botones?.[1]?.onPress?.();
    });

    const { getByTestId } = await render(
      <ConversacionDetalleScreen route={route} navigation={crearNavigation()} />,
    );
    await waitFor(() => expect(getByTestId("detalle-mas-acciones")).toBeTruthy());

    await fireEvent.press(getByTestId("detalle-mas-acciones"));
    await fireEvent.press(getByTestId("detalle-resolver"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/conversations/cv-1/resolve"),
    );
    alertSpy.mockRestore();
  });

  it("toma una escalación y muestra la caja de respuesta", async () => {
    mockGet.mockResolvedValueOnce(ESCALADA).mockResolvedValue(ASIGNADA);
    const { getByTestId, getByText } = await render(
      <ConversacionDetalleScreen route={route} navigation={crearNavigation()} />,
    );
    await waitFor(() => expect(getByText("Esperando a una persona del equipo")).toBeTruthy());

    await fireEvent.press(getByTestId("detalle-tomar"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/conversations/cv-1/take"),
    );
    await waitFor(() => expect(getByTestId("detalle-respuesta")).toBeTruthy());
  });

  it("devuelve al agente con confirmación", async () => {
    mockGet.mockResolvedValue(ASIGNADA);
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, botones) => {
      botones?.[1]?.onPress?.();
    });
    const { getByTestId, getByText } = await render(
      <ConversacionDetalleScreen route={route} navigation={crearNavigation()} />,
    );
    await waitFor(() => expect(getByText("La atiende ana@negocio.co")).toBeTruthy());

    await fireEvent.press(getByTestId("detalle-devolver"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/conversations/cv-1/return-to-bot"),
    );
    alertSpy.mockRestore();
  });

  it("agrega una nota interna desde el icono de la cabecera", async () => {
    const { getByTestId, getByText } = await render(
      <ConversacionDetalleScreen route={route} navigation={crearNavigation()} />,
    );
    await waitFor(() => expect(getByTestId("detalle-notas")).toBeTruthy());

    await fireEvent.press(getByTestId("detalle-notas"));
    expect(getByText("Cliente frecuente")).toBeTruthy();

    await fireEvent.changeText(getByTestId("detalle-nota-nueva"), "Prefiere pagos en la tarde");
    await fireEvent.press(getByTestId("detalle-nota-guardar"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/conversations/cv-1/notes", {
        text: "Prefiere pagos en la tarde",
      }),
    );
  });

  it("ofrece plantilla cuando la ventana de 24 h expiró", async () => {
    mockGet.mockImplementation((path: string) => {
      if (path === "/admin/conversations/cv-1/templates") {
        return Promise.resolve([
          {
            id: "t-1",
            name: "recordatorio",
            language: "es",
            category: "UTILITY",
            body: "Hola {{1}}, te recordamos tu pago.",
            variables: ["1"],
          },
        ]);
      }
      return Promise.resolve({ ...DETALLE, bot_paused: true });
    });
    mockPost.mockImplementation((path: string) => {
      if (path === "/admin/conversations/cv-1/messages") {
        return Promise.reject(
          new AdminApiError(409, "window_expired", "La ventana de 24 h expiró."),
        );
      }
      return Promise.resolve(undefined);
    });

    const { getByTestId } = await render(
      <ConversacionDetalleScreen route={route} navigation={crearNavigation()} />,
    );
    await waitFor(() => expect(getByTestId("detalle-respuesta")).toBeTruthy());
    await fireEvent.changeText(getByTestId("detalle-respuesta"), "Te recuerdo tu pago");
    await fireEvent.press(getByTestId("detalle-enviar"));

    await waitFor(() => expect(getByTestId("detalle-abrir-plantilla")).toBeTruthy());
    await fireEvent.press(getByTestId("detalle-abrir-plantilla"));
    await waitFor(() => expect(getByTestId("plantilla-t-1")).toBeTruthy());
    await fireEvent.press(getByTestId("plantilla-t-1"));
    await fireEvent.changeText(getByTestId("detalle-plantilla-1"), "Ana");
    await fireEvent.press(getByTestId("detalle-plantilla-enviar"));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/conversations/cv-1/template-messages", {
        template_id: "t-1",
        variables: { "1": "Ana" },
      }),
    );
  });

  it("abre la ficha del cliente desde las acciones", async () => {
    const navigation = crearNavigation();
    const { getByTestId } = await render(
      <ConversacionDetalleScreen route={route} navigation={navigation} />,
    );
    await waitFor(() => expect(getByTestId("detalle-mas-acciones")).toBeTruthy());

    await fireEvent.press(getByTestId("detalle-mas-acciones"));
    await fireEvent.press(getByTestId("detalle-ver-ficha"));
    expect((navigation as { navigate: jest.Mock }).navigate).toHaveBeenCalledWith("ClienteDetalle", {
      id: "lead-1",
      titulo: "Juanita",
    });
  });

  it("no ofrece resolver en una conversación abierta sin escalación", async () => {
    const { getByTestId, queryByTestId } = await render(
      <ConversacionDetalleScreen route={route} navigation={crearNavigation()} />,
    );
    await waitFor(() => expect(getByTestId("detalle-mas-acciones")).toBeTruthy());

    await fireEvent.press(getByTestId("detalle-mas-acciones"));
    expect(queryByTestId("detalle-resolver")).toBeNull();
  });

  it("muestra el motivo de un mensaje fallido", async () => {
    mockGet.mockResolvedValue({
      ...DETALLE,
      messages: [
        ...DETALLE.messages,
        {
          content: "Aviso",
          created_at: "2026-10-06T00:04:00Z",
          direction: "outbound",
          id: "m-3",
          sender_type: "agent",
          status: "failed",
          error_reason: "sin_plantilla",
          tool_calls: [],
        },
      ],
    });
    const { getByText } = await render(
      <ConversacionDetalleScreen route={route} navigation={crearNavigation()} />,
    );
    await waitFor(() =>
      expect(getByText(/más de 24 h sin escribir/)).toBeTruthy(),
    );
  });
});
