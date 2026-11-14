jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

const mockSesion = {
  actual: {
    token: "t",
    role: "owner",
    permissions: { collaborators: "write" } as Record<string, string | null>,
    tenantId: "tenant-1",
    tenantName: "Tienda Norte",
  },
};

jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => ({ sesion: mockSesion.actual, loading: false }),
}));

jest.mock("@shared/equipo-evento", () => ({
  abrirColaborador: jest.fn(),
  suscribirCambioEquipo: jest.fn(() => jest.fn()),
}));

import { Alert } from "react-native";
import { fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { abrirColaborador } from "@shared/equipo-evento";
import { EquipoTab } from "./EquipoTab";

const mockUseAdminApi = useAdminApi as jest.Mock;
const mockAbrirColaborador = abrirColaborador as jest.Mock;
const mockGet = jest.fn();
const mockPost = jest.fn();
const cliente = { get: mockGet, post: mockPost, put: jest.fn(), patch: jest.fn(), del: jest.fn() };

const CUENTAS = [
  {
    id: "a-1",
    email: "ana@demo.test",
    username: "ana",
    nombre: "Ana Pérez",
    telefono: "+57 300 123 4567",
    avatar_url: null,
    role: "colaborador",
    active: true,
    is_self: false,
    is_platform_master: false,
    permissions: [{ section: "leads", access: "read", scope: "*" }],
    links: [{ slug: "tienda", name: "Tienda Norte", role: "colaborador" }],
  },
  {
    id: "a-2",
    email: "luis@demo.test",
    username: null,
    nombre: null,
    telefono: null,
    avatar_url: null,
    role: "colaborador",
    active: false,
    is_self: false,
    is_platform_master: false,
    permissions: [],
    links: [],
  },
];

const INVITACIONES = [
  { id: "i-1", email: "nuevo@demo.test", rol: "colaborador", creadaEn: "2026-10-27T12:00:00Z" },
];

describe("EquipoTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSesion.actual = {
      token: "t",
      role: "owner",
      permissions: { collaborators: "write" },
      tenantId: "tenant-1",
      tenantName: "Tienda Norte",
    };
    mockUseAdminApi.mockReturnValue(cliente);
    mockPost.mockResolvedValue(undefined);
    mockGet.mockImplementation((path: string) => {
      if (path === "/admin/collaborators") return Promise.resolve(CUENTAS);
      if (path === "/admin/invitations/outgoing") return Promise.resolve(INVITACIONES);
      return Promise.reject(new Error(`no mockeado: ${path}`));
    });
  });

  it("muestra el resumen y las tarjetas de contacto", async () => {
    const { getByText, getByTestId } = await render(<EquipoTab />);

    await waitFor(() => expect(getByText("Ana Pérez")).toBeTruthy());
    expect(getByText("2 cuentas")).toBeTruthy();
    expect(getByText("1 activa")).toBeTruthy();
    expect(getByText("1 invitación pendiente")).toBeTruthy();
    expect(within(getByTestId("colaborador-ana@demo.test")).getByText("Colaborador")).toBeTruthy();
    expect(within(getByTestId("colaborador-ana@demo.test")).getByText("Activa")).toBeTruthy();
    expect(getByText("1 permiso")).toBeTruthy();
    expect(getByText("1 negocio")).toBeTruthy();
    expect(getByTestId("colaborador-luis@demo.test")).toBeTruthy();
  });

  it("abre la ficha al tocar la tarjeta", async () => {
    const { getByTestId, getByText } = await render(<EquipoTab />);
    await waitFor(() => expect(getByText("Ana Pérez")).toBeTruthy());

    await fireEvent.press(getByTestId("colaborador-ana@demo.test"));
    expect(mockAbrirColaborador).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a-1", email: "ana@demo.test" }),
    );
  });

  it("revoca una invitación pendiente con confirmación", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, botones) => {
      botones?.find((b) => b.text === "Revocar")?.onPress?.();
    });

    const { getByTestId, queryByTestId, getByText } = await render(<EquipoTab />);
    await waitFor(() => expect(getByText("nuevo@demo.test")).toBeTruthy());

    await fireEvent.press(getByTestId("revocar-i-1"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/invitations/i-1/revoke"),
    );
    await waitFor(() => expect(queryByTestId("revocar-i-1")).toBeNull());
    alertSpy.mockRestore();
  });

  it("el master puede pedir todas las cuentas", async () => {
    mockSesion.actual = {
      token: "t",
      role: "master",
      permissions: {},
      tenantId: "tenant-1",
      tenantName: "Tienda Norte",
    };
    const { getByTestId } = await render(<EquipoTab />);

    await waitFor(() => expect(getByTestId("equipo-todas")).toBeTruthy());
    await fireEvent.press(getByTestId("equipo-todas"));

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith("/admin/collaborators", { todos: 1 }),
    );
  });

  it("sin permiso de escritura no ofrece acciones de gestión", async () => {
    mockSesion.actual = {
      token: "t",
      role: "owner",
      permissions: { collaborators: "read" },
      tenantId: "tenant-1",
      tenantName: "Tienda Norte",
    };
    const { queryByTestId, getByText, getByTestId } = await render(<EquipoTab />);

    await waitFor(() => expect(getByText(/Solo lectura/)).toBeTruthy());
    expect(queryByTestId("equipo-invitar")).toBeNull();
    expect(getByTestId("colaborador-ana@demo.test")).toBeTruthy();
  });
});
