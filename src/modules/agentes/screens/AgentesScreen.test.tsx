jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));
jest.mock("@core/session/admin-session-context", () => ({ useAdminSession: jest.fn() }));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { useAdminSession } from "@core/session/admin-session-context";
import { useAdminApi } from "@core/session/use-admin-api";
import { AgentesScreen } from "./AgentesScreen";

const mockGet = jest.fn();
const cliente = { get: mockGet, post: jest.fn(), put: jest.fn(), patch: jest.fn(), del: jest.fn() };

const vista = (
  runtime: string,
  items: unknown[],
  cuota = { used: 0, limit: 1, allowed: true },
) => ({ runtime, items, sin_atribuir: {}, cuota_agentes: cuota });
const general = { ref: "general", key: "general", kind: "specialist", name: "General", published: true };
const ventas = { ref: "ag-2", id: "ag-2", key: "ventas", kind: "specialist", name: "Ventas", published: false };

function sesion(permissions: Record<string, string>, role = "owner") {
  (useAdminSession as jest.Mock).mockReturnValue({ sesion: { token: "t", role, permissions } });
}

describe("AgentesScreen (HU-AOS-56)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAdminApi as jest.Mock).mockReturnValue(cliente);
  });

  it("lista los agentes con su tipo y estado, y ofrece «Nuevo agente» a quien puede crear", async () => {
    sesion({ settings: "write" });
    mockGet.mockResolvedValue(vista("v3", [general, ventas]));
    const { getByText, getByTestId } = await render(<AgentesScreen />);
    await waitFor(() => getByText("Ventas"));
    expect(getByText("Publicado")).toBeTruthy();
    expect(getByText("Borrador")).toBeTruthy();
    await fireEvent.press(getByTestId("agentes-nuevo"));
    await waitFor(() => getByTestId("asistente-stepper"));
  });

  it("sin permiso de edición o en runtime legacy no ofrece crear", async () => {
    sesion({ settings: "read" });
    mockGet.mockResolvedValue(vista("v3", [general]));
    const { getByText, queryByTestId } = await render(<AgentesScreen />);
    await waitFor(() => getByText("Publicado"));
    expect(queryByTestId("agentes-nuevo")).toBeNull();
    expect(getByText(/necesitas permiso de edición/)).toBeTruthy();
  });

  it("al tope de agentes avisa y no abre el asistente", async () => {
    sesion({ settings: "write" });
    mockGet.mockResolvedValue(vista("v3", [general, ventas], { used: 1, limit: 1, allowed: false }));
    const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const { getByTestId, queryByTestId } = await render(<AgentesScreen />);
    await waitFor(() => getByTestId("agentes-nuevo"));
    await fireEvent.press(getByTestId("agentes-nuevo"));
    expect(alerta).toHaveBeenCalledWith(
      "Llegaste al tope de agentes",
      expect.stringMatching(/Mejora tu plan/),
      expect.any(Array),
    );
    expect(queryByTestId("asistente-stepper")).toBeNull();
    alerta.mockRestore();
  });

  it("si falla la carga avisa y deja reintentar", async () => {
    sesion({ settings: "write" });
    mockGet.mockRejectedValueOnce(new Error("sin red")).mockResolvedValueOnce(vista("v3", [general]));
    const { getByText } = await render(<AgentesScreen />);
    await waitFor(() => getByText(/No pudimos cargar tus agentes/));
    await fireEvent.press(getByText("Reintentar"));
    await waitFor(() => getByText("Publicado"));
  });

  it("abre la ficha de solo lectura del agente y vuelve a la lista", async () => {
    sesion({ settings: "read" });
    mockGet.mockImplementation((ruta: string) => {
      if (ruta === "/admin/agents/overview") return Promise.resolve(vista("v3", [general, ventas]));
      if (ruta === "/pack/payments/accounts") return Promise.resolve([]);
      return Promise.resolve({ items: [], has_more: false });
    });
    const { getByText, getByTestId, getByLabelText } = await render(<AgentesScreen />);
    await waitFor(() => getByText("Ventas"));
    await fireEvent.press(getByTestId("agente-ag-2"));
    await waitFor(() => getByText("Habilidades"));
    expect(mockGet).toHaveBeenCalledWith("/admin/agents/ag-2/skills", { page: 1, page_size: 100 });
    await fireEvent.press(getByLabelText("Volver a agentes"));
    await waitFor(() => getByTestId("agentes-lista"));
  });
});
