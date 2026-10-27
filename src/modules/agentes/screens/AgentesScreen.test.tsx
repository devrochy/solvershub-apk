jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));
jest.mock("@core/session/admin-session-context", () => ({ useAdminSession: jest.fn() }));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminSession } from "@core/session/admin-session-context";
import { useAdminApi } from "@core/session/use-admin-api";
import { AgentesScreen } from "./AgentesScreen";

const mockGet = jest.fn();
const cliente = { get: mockGet, post: jest.fn(), put: jest.fn(), patch: jest.fn(), del: jest.fn() };

const vista = (runtime: string, items: unknown[]) => ({ runtime, items, sin_atribuir: {} });
const general = { ref: "general", key: "general", kind: "specialist", name: "General", published: true };
const ventas = { ref: "ag-2", key: "ventas", kind: "specialist", name: "Ventas", published: false };

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

  it("si falla la carga avisa y deja reintentar", async () => {
    sesion({ settings: "write" });
    mockGet.mockRejectedValueOnce(new Error("sin red")).mockResolvedValueOnce(vista("v3", [general]));
    const { getByText } = await render(<AgentesScreen />);
    await waitFor(() => getByText(/No pudimos cargar tus agentes/));
    await fireEvent.press(getByText("Reintentar"));
    await waitFor(() => getByText("Publicado"));
  });
});
