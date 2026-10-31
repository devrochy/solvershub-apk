jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));
let mockSesion: Record<string, unknown> | null = null;
jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => ({ sesion: mockSesion }),
}));

import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { SeguridadScreen } from "./SeguridadScreen";

const mockGet = jest.fn();
const mockPost = jest.fn();
const cliente = { get: mockGet, post: mockPost, put: jest.fn(), patch: jest.fn(), del: jest.fn() };

const base = {
  device_id_corto: "ab12cd",
  plataforma: "android",
  origen: "autoregistro",
  bloqueo_equipo: false,
  legacy: false,
  ultimo_uso_at: null,
  ultima_ip: null,
  aprobado_at: null,
  bloqueado_at: null,
  motivo: null,
  created_at: "2026-10-30T10:00:00Z",
};
const PENDIENTE = {
  ...base,
  id: "d-1",
  estado: "pendiente",
  device_label: "Samsung A14",
  rol_al_registrar: "gestor",
  cuenta: { id: "g-1", nombre: "Gestor Uno", email: "gestor@x.co", rol: "colaborador" },
};
const ACTIVO = {
  ...base,
  id: "d-2",
  estado: "activo",
  device_label: null,
  rol_al_registrar: "colaborador",
  cuenta: { id: "c-1", nombre: null, email: "ana@x.co", rol: "colaborador" },
};
const EVENTO = {
  id: "e-1",
  tipo: "login_fallido",
  severidad: "critico",
  canal: "campo",
  rol: "gestor",
  cuenta: { id: "g-1", nombre: null, email: "gestor@x.co", rol: "colaborador" },
  device_id_corto: "ab12cd",
  ip: null,
  detalle: null,
  occurred_at: "2026-10-30T10:00:00Z",
};

describe("SeguridadScreen (HU-ACC-05)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSesion = { token: "t", adminId: "yo", role: "admin", tenantRole: "owner", permissions: { devices: "write", access_alerts: "read" } };
    (useAdminApi as jest.Mock).mockReturnValue(cliente);
    mockGet.mockImplementation((path: string) => {
      if (path === "/access/devices") return Promise.resolve({ items: [PENDIENTE, ACTIVO], next_cursor: null });
      if (path === "/access/policy") return Promise.resolve({ owner: "abierto", colaborador: "abierto", gestor: "restringido" });
      if (path === "/access/events") return Promise.resolve({ items: [EVENTO], next_cursor: null });
      return Promise.reject(new Error(path));
    });
    mockPost.mockResolvedValue({});
  });

  it("lista los equipos con su política y solo las acciones que la API acepta", async () => {
    const { getByText, getByTestId, queryByTestId } = await render(<SeguridadScreen />);
    await waitFor(() => expect(getByText("Gestor Uno")).toBeTruthy());
    expect(getByText(/Gestor: Restringido/)).toBeTruthy();
    expect(getByText(/Gestor · Samsung A14/)).toBeTruthy();
    expect(getByTestId("accion-aprobar-d-1")).toBeTruthy();
    expect(getByTestId("accion-bloquear-d-2")).toBeTruthy();
    expect(queryByTestId("accion-aprobar-d-2")).toBeNull();
  });

  it("aprobar pide confirmación y manda el estado que se veía", async () => {
    const alerta = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, botones) => {
      botones?.find((b) => b.text === "Aprobar")?.onPress?.();
    });
    const { getByTestId, getByText } = await render(<SeguridadScreen />);
    await waitFor(() => expect(getByText("Gestor Uno")).toBeTruthy());
    await fireEvent.press(getByTestId("accion-aprobar-d-1"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/access/devices/d-1/aprobar", { esperado: "pendiente" }),
    );
    alerta.mockRestore();
  });

  it("filtra por estado", async () => {
    const { getByTestId, getByText } = await render(<SeguridadScreen />);
    await waitFor(() => expect(getByText("Gestor Uno")).toBeTruthy());
    await fireEvent.press(getByTestId("filtro-pendiente"));
    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith("/access/devices", expect.objectContaining({ estado: "pendiente" })),
    );
  });

  it("sin permiso de escritura no hay acciones", async () => {
    mockSesion = { token: "t", adminId: "yo", role: "admin", tenantRole: "colaborador", permissions: { devices: "read" } };
    const { getByText, queryByTestId } = await render(<SeguridadScreen />);
    await waitFor(() => expect(getByText("Gestor Uno")).toBeTruthy());
    expect(queryByTestId("accion-aprobar-d-1")).toBeNull();
  });

  it("muestra las alertas con su severidad cuando solo se ve esa sección", async () => {
    mockSesion = { token: "t", adminId: "yo", role: "admin", tenantRole: "colaborador", permissions: { access_alerts: "read" } };
    const { getByText, queryByTestId } = await render(<SeguridadScreen />);
    await waitFor(() => expect(getByText("Intento de acceso fallido")).toBeTruthy());
    expect(getByText(/Crítico · /)).toBeTruthy();
    expect(queryByTestId("seguridad-dispositivos")).toBeNull();
  });
});
