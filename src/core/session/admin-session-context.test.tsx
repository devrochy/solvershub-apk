jest.mock("expo-secure-store");
jest.mock("@core/api/auth-admin", () => ({
  apiLoginAdmin: jest.fn(),
  apiMeAdmin: jest.fn(),
  apiOlvidarContrasena: jest.fn(),
  apiRestablecerContrasena: jest.fn(),
  apiGestorToken: jest.fn(),
  ApiAuthError: class extends Error {
    status: number;
    code: string;
    constructor(status: number, code: string, message: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  },
}));
jest.mock("@core/api/perfil-admin", () => ({
  apiLeerPerfilAdmin: jest.fn(),
}));

import { Pressable, Text } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import { apiLoginAdmin, apiMeAdmin } from "@core/api/auth-admin";
import { apiLeerPerfilAdmin } from "@core/api/perfil-admin";
import { AdminSessionProvider, useAdminSession } from "./admin-session-context";

const ME = {
  admin_id: "a-1",
  email: "dueña@x.com",
  username: "duena",
  nombre: "Dueña",
  telefono: "+5917000111",
  avatar_url: "https://api.test/files/avatar.jpg",
  role: "owner",
  tenant: { id: "t-1", name: "Mi Negocio", role: "owner", active: true },
  tenant_count: 1,
  permissions: { dashboard: "read" },
  invitaciones_pendientes: 0,
  qa_testers_habilitados: false,
};

function Consumidor() {
  const { sesion, loading, perfil, login, logout, refrescarPerfil, aplicarPerfil } = useAdminSession();
  return (
    <>
      <Text testID="estado">{loading ? "cargando" : sesion?.email ?? "sin-sesion"}</Text>
      <Text testID="perfil">{perfil?.nombre ?? "sin-nombre"}</Text>
      <Pressable testID="accion-login" onPress={() => void login("dueña@x.com", "clave")} />
      <Pressable testID="accion-refrescar" onPress={() => void refrescarPerfil()} />
      <Pressable testID="accion-aplicar" onPress={() => void aplicarPerfil(ME)} />
      <Pressable testID="accion-logout" onPress={() => void logout()} />
    </>
  );
}

describe("admin-session-context (HU-APP-02)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
  });

  it("hidrata desde secure-store, incluido el perfil persistido", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
      JSON.stringify({
        token: "t",
        adminId: "a-1",
        email: "guardada@x.com",
        nombre: "Guardada",
        username: "guardada",
        role: "owner",
        tenantId: "t-1",
        tenantName: "Negocio",
        permissions: { dashboard: "read" },
      }),
    );
    const { getByTestId } = await render(
      <AdminSessionProvider>
        <Consumidor />
      </AdminSessionProvider>,
    );
    await waitFor(() => expect(getByTestId("estado").props.children).toBe("guardada@x.com"));
    expect(getByTestId("perfil").props.children).toBe("Guardada");
  });

  it("login guarda la sesión y el perfil, y logout los limpia", async () => {
    (apiLoginAdmin as jest.Mock).mockResolvedValue({
      token: "t-opaco",
      adminId: "a-1",
      expiresIn: 604800,
    });
    (apiMeAdmin as jest.Mock).mockResolvedValue(ME);

    const { getByTestId } = await render(
      <AdminSessionProvider>
        <Consumidor />
      </AdminSessionProvider>,
    );
    await waitFor(() => expect(getByTestId("estado").props.children).toBe("sin-sesion"));
    expect(getByTestId("perfil").props.children).toBe("sin-nombre");

    await fireEvent.press(getByTestId("accion-login"));
    await waitFor(() => expect(getByTestId("estado").props.children).toBe("dueña@x.com"));
    expect(getByTestId("perfil").props.children).toBe("Dueña");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "solvershub_admin_sesion",
      expect.stringContaining("t-opaco"),
    );

    await fireEvent.press(getByTestId("accion-logout"));
    await waitFor(() => expect(getByTestId("estado").props.children).toBe("sin-sesion"));
    expect(getByTestId("perfil").props.children).toBe("sin-nombre");
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("solvershub_admin_sesion");
  });

  it("refrescarPerfil vuelve a leer /admin/me y aplica nombre y avatar", async () => {
    (apiLoginAdmin as jest.Mock).mockResolvedValue({ token: "t", adminId: "a-1", expiresIn: 1 });
    (apiMeAdmin as jest.Mock).mockResolvedValue(ME);
    (apiLeerPerfilAdmin as jest.Mock).mockResolvedValue({ ...ME, nombre: "Actualizada" });

    const { getByTestId } = await render(
      <AdminSessionProvider>
        <Consumidor />
      </AdminSessionProvider>,
    );
    await waitFor(() => expect(getByTestId("estado").props.children).toBe("sin-sesion"));
    await fireEvent.press(getByTestId("accion-login"));
    await waitFor(() => expect(getByTestId("perfil").props.children).toBe("Dueña"));

    await fireEvent.press(getByTestId("accion-refrescar"));
    await waitFor(() => expect(getByTestId("perfil").props.children).toBe("Actualizada"));
    expect(apiLeerPerfilAdmin).toHaveBeenCalledWith(expect.objectContaining({ token: "t" }));
  });

  it("aplicarPerfil actualiza la sesión persistida sin volver a pedirla", async () => {
    (apiLoginAdmin as jest.Mock).mockResolvedValue({ token: "t", adminId: "a-1", expiresIn: 1 });
    (apiMeAdmin as jest.Mock).mockResolvedValue(ME);

    const { getByTestId } = await render(
      <AdminSessionProvider>
        <Consumidor />
      </AdminSessionProvider>,
    );
    await waitFor(() => expect(getByTestId("estado").props.children).toBe("sin-sesion"));
    await fireEvent.press(getByTestId("accion-login"));
    await waitFor(() => expect(getByTestId("perfil").props.children).toBe("Dueña"));

    (SecureStore.setItemAsync as jest.Mock).mockClear();
    await fireEvent.press(getByTestId("accion-aplicar"));
    await waitFor(() => expect(getByTestId("perfil").props.children).toBe("Dueña"));
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "solvershub_admin_sesion",
      expect.stringContaining("Dueña"),
    );
  });
});
