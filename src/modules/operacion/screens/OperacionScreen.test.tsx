jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { OperacionScreen } from "./OperacionScreen";

const mockUseAdminApi = useAdminApi as jest.Mock;
const mockGet = jest.fn();
const cliente = {
  get: mockGet,
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  del: jest.fn(),
};

const PAGINA_CONVERSACIONES = {
  items: [
    {
      id: "cv-1",
      customer_name: "Juanita",
      external_id: null,
      status: "open",
      bot_paused: false,
      channel: "whatsapp",
      started_at: "2026-10-06T00:00:00Z",
    },
    {
      id: "cv-2",
      customer_name: null,
      external_id: "wa-777",
      status: "escalated",
      bot_paused: true,
      channel: "whatsapp",
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
      if (path === "/admin/escalations") {
        return Promise.resolve({
          items: [
            {
              conversation_id: "cv-2",
              created_at: "2026-10-06T01:00:00Z",
              customer_name: "Escalada",
              external_id: null,
              reason: "pidió humano",
              status: "pendiente",
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
      return Promise.reject(new Error("no mockeado"));
    });
  });

  it("carga conversaciones con búsqueda y filtro", async () => {
    const { getByTestId, getByText } = await render(<OperacionScreen />);
    await waitFor(() => expect(getByTestId("lista-conversaciones")).toBeTruthy());
    expect(getByText("Juanita")).toBeTruthy();

    await fireEvent.changeText(getByTestId("operacion-busqueda"), "juan");
    await waitFor(() =>
      expect(mockGet).toHaveBeenLastCalledWith(
        "/admin/conversations",
        expect.objectContaining({ q: "juan", page: 1 }),
      ),
    );
  });

  it("cambia a escalaciones y las lista", async () => {
    const { getByTestId, getByText } = await render(<OperacionScreen />);
    await waitFor(() => expect(getByTestId("lista-conversaciones")).toBeTruthy());

    await fireEvent.press(getByTestId("pestana-escalaciones"));
    await waitFor(() => expect(getByTestId("lista-escalaciones")).toBeTruthy());
    expect(getByText("Escalada")).toBeTruthy();
    expect(getByText("pidió humano")).toBeTruthy();
  });

  it("cambia a clientes (leads)", async () => {
    const { getByTestId, getByText } = await render(<OperacionScreen />);
    await waitFor(() => expect(getByTestId("lista-conversaciones")).toBeTruthy());

    await fireEvent.press(getByTestId("pestana-leads"));
    await waitFor(() => expect(getByTestId("lista-leads")).toBeTruthy());
    expect(getByText("Lead Uno")).toBeTruthy();
  });

  it("con error de red muestra el aviso", async () => {
    mockGet.mockRejectedValue(new Error("red"));
    const { getByTestId } = await render(<OperacionScreen />);
    await waitFor(() => expect(getByTestId("operacion-error")).toBeTruthy());
  });
});
