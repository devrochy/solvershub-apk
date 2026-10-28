jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));
let mockSesion: unknown = null;
jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => ({ sesion: mockSesion, loading: false }),
}));

import { Alert } from "react-native";
import { fireEvent, render, waitFor, within } from "@testing-library/react-native";
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
            {
              id: "t-2",
              name: "Negocio Dos",
              slug: "dos",
              status: "suspended",
              created_at: "2026-10-01T00:00:00Z",
              plan_name: "Negocio",
              plan_status: "active",
              operational: false,
            },
          ],
          page: 1,
          has_more: false,
          total: 2,
        });
      }
      if (path === "/admin/plan") {
        return Promise.resolve({
          plans: [
            { id: "p1", name: "Negocio", price_cop: 199000, is_free: false, current: true, limits: {}, features: {} },
            { id: "p2", name: "Pro", price_cop: 399000, is_free: false, current: false, limits: {}, features: {} },
          ],
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
    await fireEvent.press(getByTestId("negocio-estado-uno"));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/platform/tenants/t-1/deactivate"),
    );
    alertSpy.mockRestore();
  });

  it("master activa un negocio suspendido", async () => {
    mockSesion = { token: "t", role: "master", permissions: {} };
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, botones) => {
      botones?.find((b) => b.text === "Activar")?.onPress?.();
    });

    const { getByTestId, getByText } = await render(
      <HerramientasScreen pestanaInicial={{ pestana: "negocios", n: 1 }} />,
    );
    await waitFor(() => expect(getByText("Negocio Dos")).toBeTruthy());
    await fireEvent.press(getByTestId("negocio-estado-dos"));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/platform/tenants/t-2/activate"),
    );
    alertSpy.mockRestore();
  });

  it("master cambia el plan desde el badge", async () => {
    mockSesion = { token: "t", role: "master", permissions: {} };
    const { getByTestId, getByText } = await render(
      <HerramientasScreen pestanaInicial={{ pestana: "negocios", n: 1 }} />,
    );
    await waitFor(() => expect(getByText("Negocio Uno")).toBeTruthy());

    await fireEvent.press(getByTestId("negocio-plan-uno"));
    await waitFor(() => expect(getByTestId("plan-negocio-p2")).toBeTruthy());
    await fireEvent.press(getByTestId("plan-negocio-p2"));
    await fireEvent.press(getByTestId("aplicar-plan-negocio"));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/platform/tenants/t-1/plan", {
        plan_id: "p2",
        extend_days: 0,
      }),
    );
  });

  it("abre el detalle del negocio sin salir de la lista", async () => {
    mockSesion = { token: "t", role: "master", permissions: {} };
    const { getByTestId, getByText } = await render(
      <HerramientasScreen pestanaInicial={{ pestana: "negocios", n: 1 }} />,
    );
    await waitFor(() => expect(getByText("Negocio Uno")).toBeTruthy());

    await fireEvent.press(getByTestId("negocio-detalle-uno"));
    await waitFor(() => expect(getByTestId("detalle-negocio")).toBeTruthy());
    expect(getByText("Creado")).toBeTruthy();
    expect(within(getByTestId("detalle-negocio")).getByText("Activo")).toBeTruthy();
  });

  it("master elimina un negocio suspendido con la frase exacta", async () => {
    mockSesion = { token: "t", role: "master", permissions: {} };

    const { getByTestId, getByText } = await render(
      <HerramientasScreen pestanaInicial={{ pestana: "negocios", n: 1 }} />,
    );
    await waitFor(() => expect(getByText("Negocio Dos")).toBeTruthy());
    await fireEvent.press(getByTestId("negocio-eliminar-dos"));

    await waitFor(() => expect(getByTestId("eliminar-negocio-frase")).toBeTruthy());
    expect(getByTestId("eliminar-negocio-confirmar")).toBeDisabled();
    await fireEvent.changeText(getByTestId("eliminar-negocio-frase"), "ELIMINAR uno");
    expect(getByTestId("eliminar-negocio-confirmar")).toBeDisabled();
    await fireEvent.changeText(getByTestId("eliminar-negocio-frase"), "ELIMINAR dos");
    await fireEvent.press(getByTestId("eliminar-negocio-confirmar"));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/platform/tenants/t-2/purge", {
        confirm_phrase: "ELIMINAR dos",
      }),
    );
  });

  it("un negocio activo pide suspenderlo antes de eliminarlo", async () => {
    mockSesion = { token: "t", role: "master", permissions: {} };

    const { getByTestId, getByText, queryByTestId } = await render(
      <HerramientasScreen pestanaInicial={{ pestana: "negocios", n: 1 }} />,
    );
    await waitFor(() => expect(getByText("Negocio Uno")).toBeTruthy());
    await fireEvent.press(getByTestId("negocio-eliminar-uno"));

    await waitFor(() => expect(getByTestId("eliminar-negocio-aviso")).toBeTruthy());
    expect(queryByTestId("eliminar-negocio-frase")).toBeNull();
    expect(mockPost).not.toHaveBeenCalledWith(expect.stringContaining("/purge"), expect.anything());
  });

  it("abre en la pestaña pedida por el cajón del panel (HU-DS-11)", async () => {
    mockSesion = { token: "t", role: "master", permissions: {} };
    const { getByTestId } = await render(<HerramientasScreen pestanaInicial={{ pestana: "negocios", n: 1 }} />);
    await waitFor(() => expect(getByTestId("herramientas-negocios")).toHaveStyle({ borderBottomWidth: 2 }));
  });
});
