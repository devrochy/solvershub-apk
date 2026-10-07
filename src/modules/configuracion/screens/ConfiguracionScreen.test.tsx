jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));
jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => ({ sesion: { token: "t", role: "owner", permissions: {}, tenantId: "tenant-1" }, loading: false }),
}));
jest.mock("@data/ajustes", () => ({
  CLAVE_PUSH_HABILITADO: "push_habilitado",
  leerAjuste: jest.fn(() => Promise.resolve("1")),
  guardarAjuste: jest.fn(() => Promise.resolve()),
}));

import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { guardarAjuste as mockGuardarAjuste, leerAjuste as mockLeerAjuste } from "@data/ajustes";
import { ConfiguracionScreen } from "./ConfiguracionScreen";

const mockUseAdminApi = useAdminApi as jest.Mock;
const mockGet = jest.fn();
const mockPost = jest.fn();
const cliente = { get: mockGet, post: mockPost, put: jest.fn(), patch: jest.fn(), del: jest.fn() };

describe("ConfiguracionScreen (HU-APP-12)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAdminApi.mockReturnValue(cliente);
    mockPost.mockResolvedValue(undefined);
    mockGet.mockImplementation((path: string) => {
      if (path === "/admin/collaborators") {
        return Promise.resolve([
          {
            id: "a-1",
            email: "vendedor@x.com",
            username: null,
            role: "colaborador",
            active: true,
            is_self: false,
            is_platform_master: false,
            permissions: {},
            links: [],
          },
        ]);
      }
      if (path === "/admin/plugins") {
        return Promise.resolve([
          {
            id: "pack_cobranza",
            name: "pack_cobranza",
            version: "1.0",
            status: "active",
            error_message: null,
            has_config: true,
            enabled_for_tenant: true,
            tenant_health_error: null,
            display_name: "Cobranza",
            category: "vertical",
            description: "",
            required_connections: [],
          },
        ]);
      }
      if (path === "/admin/connections") {
        return Promise.resolve({
          items: [
            {
              id: "cx-1",
              kind: "whatsapp",
              type_id: "meta",
              origin: "manual",
              channel: "whatsapp",
              label: "Principal",
              external_id: "123",
              active: true,
              is_primary: true,
              created_at: "2026-10-01T00:00:00Z",
              coexistence: false,
            },
          ],
          webhook_url: "https://x/webhooks",
        });
      }
      if (path === "/admin/plan") {
        return Promise.resolve({
          overview: { plan_id: "pro", plan_name: "Pro", status: "activo", operational: true, days_left: 12, has_plan: true },
          usage: {},
          payments: [],
          plans: [
            { id: "pro", name: "Pro", price_cop: 199000, is_free: false, current: true },
            { id: "max", name: "Max", price_cop: 399000, is_free: false, current: false },
          ],
        });
      }
      if (String(path).includes("/templates")) {
        return Promise.resolve({ templates: [], sync_error: null, at_limit: false });
      }
      return Promise.reject(new Error("no mockeado"));
    });
  });

  it("lista colaboradores y desactiva con confirmación", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, botones) => {
      botones?.find((b) => b.text === "desactivar")?.onPress?.();
    });

    const { getByTestId, getByText } = await render(<ConfiguracionScreen />);
    await waitFor(() => expect(getByText("vendedor@x.com")).toBeTruthy());

    await fireEvent.press(getByTestId("colaborador-vendedor@x.com"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/collaborators/a-1/toggle"),
    );
    alertSpy.mockRestore();
  });

  it("desactiva una habilidad con confirmación", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, botones) => {
      botones?.find((b) => b.text === "Confirmar")?.onPress?.();
    });

    const { getByTestId, getByText } = await render(<ConfiguracionScreen />);
    await waitFor(() => expect(getByTestId("config-habilidades")).toBeTruthy());

    await fireEvent.press(getByTestId("config-habilidades"));
    expect(getByText("Cobranza")).toBeTruthy();
    await fireEvent.press(getByTestId("habilidad-pack_cobranza"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/plugins/pack_cobranza/action", {
        action: "deactivate",
      }),
    );
    alertSpy.mockRestore();
  });

  it("lista conexiones con su estado", async () => {
    const { getByTestId, getByText } = await render(<ConfiguracionScreen />);
    await waitFor(() => expect(getByTestId("config-conexiones")).toBeTruthy());

    await fireEvent.press(getByTestId("config-conexiones"));
    expect(getByText("Principal · principal")).toBeTruthy();
  });

  it("invita a un colaborador desde el modal (HU-APP-20)", async () => {
    mockPost.mockResolvedValue(undefined);
    const { getByTestId } = await render(<ConfiguracionScreen />);
    await waitFor(() => expect(getByTestId("config-lista-colaboradores")).toBeTruthy());

    await fireEvent.press(getByTestId("config-invitar"));
    await fireEvent.changeText(getByTestId("modal-email"), "nuevo@demo.test");
    await fireEvent.changeText(getByTestId("modal-clave"), "clave123");
    await fireEvent.press(getByTestId("modal-enviar"));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/collaborators", {
        email: "nuevo@demo.test",
        password: "clave123",
        role: "colaborador",
      }),
    );
  });

  it("muestra el plan y permite suscribirse (HU-APP-21)", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, botones) => {
      botones?.find((b) => b.text === "Suscribir")?.onPress?.();
    });
    const { getByTestId, getByText } = await render(<ConfiguracionScreen />);
    await waitFor(() => expect(getByTestId("config-plan")).toBeTruthy());

    await fireEvent.press(getByTestId("config-plan"));
    await waitFor(() => expect(getByText("Pro")).toBeTruthy());
    expect(getByText("Pro · actual")).toBeTruthy();

    await fireEvent.press(getByTestId("plan-suscribir-max"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/plan/subscribe", { plan_id: "max" }),
    );
    alertSpy.mockRestore();
  });

  it("alterna el opt-out de push (HU-APP-21)", async () => {
    const { getByTestId } = await render(<ConfiguracionScreen />);
    await waitFor(() => expect(getByTestId("config-notificaciones")).toBeTruthy());

    await fireEvent.press(getByTestId("config-notificaciones"));
    await waitFor(() => expect(getByTestId("push-toggle")).toBeTruthy());

    await fireEvent(getByTestId("push-toggle"), "valueChange", false);
    await waitFor(() => expect(mockGuardarAjuste).toHaveBeenCalledWith("push_habilitado", "0"));
  });

  it("abre plantillas de una conexión y sincroniza (HU-APP-21)", async () => {
    const { getByTestId } = await render(<ConfiguracionScreen />);
    await waitFor(() => expect(getByTestId("config-conexiones")).toBeTruthy());

    await fireEvent.press(getByTestId("config-conexiones"));
    await waitFor(() => expect(getByTestId("conexion-cx-1")).toBeTruthy());

    await fireEvent.press(getByTestId("conexion-cx-1"));
    await waitFor(() => expect(getByTestId("plantillas-sync")).toBeTruthy());

    await fireEvent.press(getByTestId("plantillas-sync"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/meta/connections/cx-1/templates/sync"),
    );
  });
});
