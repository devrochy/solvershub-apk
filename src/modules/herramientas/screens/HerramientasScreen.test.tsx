jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));
let mockSesion: unknown = null;
jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => ({ sesion: mockSesion, loading: false }),
}));

import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { HerramientasScreen } from "./HerramientasScreen";

const mockUseAdminApi = useAdminApi as jest.Mock;
const mockGet = jest.fn();
const mockPost = jest.fn();
const cliente = { get: mockGet, post: mockPost, put: jest.fn(), patch: jest.fn(), del: jest.fn() };

describe("HerramientasScreen (HU-APP-13)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAdminApi.mockReturnValue(cliente);
    mockPost.mockResolvedValue(undefined);
    mockGet.mockImplementation((path: string) => {
      if (path === "/admin/dlq") {
        return Promise.resolve({
          entries: [
            { entry_id: "e-1", external_message_id: "wamid-1", tenant_id: "t-1", content: "falló el envío" },
          ],
        });
      }
      if (path === "/admin/platform/tenants") {
        return Promise.resolve({
          items: [
            {
              id: "t-1",
              name: "Negocio Uno",
              slug: "uno",
              status: "active",
              created_at: "2026-10-01T00:00:00Z",
              plan_name: "Negocio",
              plan_status: "active",
              operational: true,
            },
          ],
          page: 1,
          has_more: false,
          total: 1,
        });
      }
      return Promise.reject(new Error("no mockeado"));
    });
  });

  it("lista la bandeja de fallos y reintenta", async () => {
    const { getByTestId, getByText } = await render(<HerramientasScreen />);
    await waitFor(() => expect(getByText("falló el envío")).toBeTruthy());

    await fireEvent.press(getByTestId("dlq-e-1"));
    await waitFor(() => expect(mockPost).toHaveBeenCalledWith("/admin/dlq/e-1/retry"));
  });

  it("no-master no ve Negocios", async () => {
    mockSesion = { token: "t", role: "owner", permissions: {} };
    const { getByTestId } = await render(<HerramientasScreen />);
    await waitFor(() => expect(getByTestId("herramientas-lista-dlq")).toBeTruthy());
    expect(mockGet).not.toHaveBeenCalledWith("/admin/platform/tenants", expect.anything());
  });

  it("master suspende un negocio con confirmación", async () => {
    mockSesion = { token: "t", role: "master", permissions: {} };
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, botones) => {
      botones?.find((b) => b.text === "Suspender")?.onPress?.();
    });

    const { getByTestId, getByText } = await render(<HerramientasScreen />);
    await waitFor(() => expect(getByTestId("herramientas-negocios")).toBeTruthy());

    await fireEvent.press(getByTestId("herramientas-negocios"));
    await waitFor(() => expect(getByText("Negocio Uno")).toBeTruthy());
    await fireEvent.press(getByTestId("negocio-plataforma-uno"));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/platform/tenants/t-1/deactivate"),
    );
    alertSpy.mockRestore();
  });
});
