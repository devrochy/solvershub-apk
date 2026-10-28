jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

const mockSesion = {
  actual: {
    token: "t",
    role: "owner",
    permissions: { collaborators: "write", leads: "read", settings: "write" } as Record<
      string,
      string | null
    >,
    tenantId: "tenant-1",
    tenantName: "Tienda Norte",
  },
};

jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => ({ sesion: mockSesion.actual, loading: false }),
}));

import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { ColaboradorDetalleScreen } from "./ColaboradorDetalleScreen";
import type { CollaboratorItem } from "../api";

const mockUseAdminApi = useAdminApi as jest.Mock;
const mockGet = jest.fn();
const mockPost = jest.fn();
const cliente = { get: mockGet, post: mockPost, put: jest.fn(), patch: jest.fn(), del: jest.fn() };

const COLABORADOR: CollaboratorItem = {
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
};

const PERMISOS = [
  { section: "leads", access: "read", heredado: true },
  { section: "settings", access: "write", heredado: false },
];

async function renderDetalle() {
  const onBack = jest.fn();
  const vista = await render(
    <ColaboradorDetalleScreen colaborador={COLABORADOR} onBack={onBack} />,
  );
  return { ...vista, onBack };
}

describe("ColaboradorDetalleScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSesion.actual = {
      token: "t",
      role: "owner",
      permissions: { collaborators: "write", leads: "read", settings: "write" },
      tenantId: "tenant-1",
      tenantName: "Tienda Norte",
    };
    mockUseAdminApi.mockReturnValue(cliente);
    mockPost.mockResolvedValue(undefined);
    mockGet.mockImplementation((path: string) => {
      if (path === "/admin/collaborators/a-1/permissions") return Promise.resolve(PERMISOS);
      if (path === "/admin/platform/tenants") {
        return Promise.resolve({
          items: [
            {
              id: "t-2",
              name: "Otra Tienda",
              slug: "otra",
              status: "active",
              created_at: "2026-01-01T00:00:00Z",
              plan_name: "Base",
              plan_status: "activa",
              operational: true,
            },
          ],
        });
      }
      return Promise.reject(new Error(`no mockeado: ${path}`));
    });
  });

  it("muestra el contacto, el rol, el estado y los negocios", async () => {
    const { getAllByText, getByText } = await renderDetalle();

    await waitFor(() => expect(getAllByText("Ana Pérez").length).toBeGreaterThan(0));
    expect(getAllByText("ana@demo.test").length).toBeGreaterThan(0);
    expect(getAllByText("Colaborador").length).toBeGreaterThan(0);
    expect(getByText("Activa")).toBeTruthy();
    expect(getByText("Tienda Norte · Colaborador")).toBeTruthy();
    expect(getByText("1 explícitos")).toBeTruthy();
    expect(getByText("Clientes")).toBeTruthy();
  });

  it("desactiva la cuenta con confirmación", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, botones) => {
      botones?.find((b) => b.text === "Desactivar")?.onPress?.();
    });
    const { getByTestId } = await renderDetalle();

    await waitFor(() => expect(getByTestId("colaborador-estado")).toBeTruthy());
    await fireEvent.press(getByTestId("colaborador-estado"));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/collaborators/a-1/toggle"),
    );
    alertSpy.mockRestore();
  });

  it("carga la grilla y guarda los permisos en bloque", async () => {
    const { getByTestId } = await renderDetalle();

    await waitFor(() => expect(getByTestId("permiso-leads-read")).toBeTruthy());
    await fireEvent.press(getByTestId("permiso-leads-write"));
    await fireEvent.press(getByTestId("permisos-guardar"));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/collaborators/a-1/permissions", {
        tenant: "",
        permissions: { leads: "write", settings: "write" },
      }),
    );
  });

  it("el master cambia el negocio de la grilla", async () => {
    mockSesion.actual = {
      token: "t",
      role: "master",
      permissions: {},
      tenantId: "tenant-1",
      tenantName: "Tienda Norte",
    };
    const { getByTestId } = await renderDetalle();

    await waitFor(() => expect(getByTestId("colaborador-negocio")).toBeTruthy());
    await fireEvent.press(getByTestId("colaborador-negocio"));
    await fireEvent.press(getByTestId("negocio-permisos-tienda"));

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith("/admin/collaborators/a-1/permissions", {
        tenant: "tienda",
      }),
    );
  });

  it("restablece la contraseña con validación local", async () => {
    const { getByTestId } = await renderDetalle();

    await waitFor(() => expect(getByTestId("colaborador-password")).toBeTruthy());
    await fireEvent.press(getByTestId("colaborador-password"));
    await fireEvent.changeText(getByTestId("colaborador-password-nueva"), "clave12345");
    await fireEvent.press(getByTestId("colaborador-password-guardar"));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/collaborators/a-1/password", {
        password: "clave12345",
      }),
    );
  });

  it("desvincula un negocio con confirmación", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, botones) => {
      botones?.find((b) => b.text === "Desvincular")?.onPress?.();
    });
    const { getByTestId } = await renderDetalle();

    await waitFor(() => expect(getByTestId("desvincular-tienda")).toBeTruthy());
    await fireEvent.press(getByTestId("desvincular-tienda"));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/collaborators/a-1/unlink", {
        tenant: "tienda",
      }),
    );
    alertSpy.mockRestore();
  });

  it("el master vincula un negocio desde el buscador", async () => {
    mockSesion.actual = {
      token: "t",
      role: "master",
      permissions: {},
      tenantId: "tenant-1",
      tenantName: "Tienda Norte",
    };
    const { getByTestId } = await renderDetalle();

    await waitFor(() => expect(getByTestId("colaborador-vincular")).toBeTruthy());
    await fireEvent.press(getByTestId("colaborador-vincular"));
    await waitFor(() => expect(getByTestId("vincular-negocio-otra")).toBeTruthy());
    await fireEvent.press(getByTestId("vincular-negocio-otra"));
    await fireEvent.press(getByTestId("vincular-confirmar"));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/collaborators/a-1/link", {
        tenant: "otra",
        role: "colaborador",
      }),
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
    const { queryByTestId, getByText } = await renderDetalle();

    await waitFor(() => expect(getByText(/Solo lectura/)).toBeTruthy());
    expect(queryByTestId("colaborador-estado")).toBeNull();
    expect(queryByTestId("colaborador-password")).toBeNull();
    expect(queryByTestId("permisos-guardar")).toBeNull();
    expect(queryByTestId("colaborador-vincular")).toBeNull();
  });
});
