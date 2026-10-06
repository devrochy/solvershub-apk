jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
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
  customer_name: "Juanita",
  external_id: null,
  id: "cv-1",
  messages: [
    {
      content: "Hola, quiero pagar",
      created_at: "2026-10-06T00:00:00Z",
      direction: "in",
      id: "m-1",
      sender_type: "customer",
      status: "delivered",
    },
  ],
  started_at: "2026-10-06T00:00:00Z",
  status: "open",
};

const route = { params: { id: "cv-1", titulo: "Juanita" } } as never;
const navigation = { navigate: jest.fn() } as never;

describe("ConversacionDetalleScreen (HU-APP-08)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAdminApi.mockReturnValue(cliente);
    mockGet.mockResolvedValue(DETALLE);
    mockPost.mockResolvedValue(undefined);
  });

  it("muestra el hilo y envía una respuesta como humano", async () => {
    const { getByTestId, getByText } = await render(
      <ConversacionDetalleScreen route={route} navigation={navigation} />,
    );
    await waitFor(() => expect(getByText("Hola, quiero pagar")).toBeTruthy());

    await fireEvent.changeText(getByTestId("detalle-respuesta"), "Ya te ayudo");
    await fireEvent.press(getByTestId("detalle-enviar"));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/conversations/cv-1/messages", {
        content: "Ya te ayudo",
      }),
    );
  });

  it("pausa y reanuda el asistente", async () => {
    const { getByTestId } = await render(
      <ConversacionDetalleScreen route={route} navigation={navigation} />,
    );
    await waitFor(() => expect(getByTestId("detalle-toggle-bot")).toBeTruthy());

    await fireEvent.press(getByTestId("detalle-toggle-bot"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/conversations/cv-1/toggle-bot"),
    );
  });

  it("resolver pide confirmación y llama al endpoint", async () => {
    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation((_t, _m, botones) => {
        botones?.[1]?.onPress?.();
      });

    const { getByTestId } = await render(
      <ConversacionDetalleScreen route={route} navigation={navigation} />,
    );
    await waitFor(() => expect(getByTestId("detalle-resolver")).toBeTruthy());

    await fireEvent.press(getByTestId("detalle-resolver"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/conversations/cv-1/resolve"),
    );
    alertSpy.mockRestore();
  });
});
