jest.mock("expo-secure-store");
jest.mock("./api", () => ({
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

import { Pressable, Text } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import { apiLoginAdmin, apiMeAdmin } from "./api";
import { AdminSessionProvider, useAdminSession } from "./admin-session-context";

function Consumidor() {
  const { sesion, loading, login, logout } = useAdminSession();
  return (
    <>
      <Text testID="estado">{loading ? "cargando" : sesion?.email ?? "sin-sesion"}</Text>
      <Pressable testID="accion-login" onPress={() => void login("dueña@x.com", "clave")} />
      <Pressable testID="accion-logout" onPress={() => void logout()} />
    </>
  );
}

describe("admin-session-context (HU-APP-02)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
  });

  it("hidrata desde secure-store si ya hay sesión", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
      JSON.stringify({
        token: "t",
        adminId: "a-1",
        email: "guardada@x.com",
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
  });

  it("login guarda la sesión en secure-store y logout la limpia", async () => {
    (apiLoginAdmin as jest.Mock).mockResolvedValue({
      token: "t-opaco",
      adminId: "a-1",
      expiresIn: 604800,
    });
    (apiMeAdmin as jest.Mock).mockResolvedValue({
      adminId: "a-1",
      email: "dueña@x.com",
      username: null,
      role: "owner",
      tenant: { id: "t-1", name: "Mi Negocio", role: "owner", active: true },
      tenantCount: 1,
      permissions: { dashboard: "read" },
    });

    const { getByTestId } = await render(
      <AdminSessionProvider>
        <Consumidor />
      </AdminSessionProvider>,
    );
    await waitFor(() => expect(getByTestId("estado").props.children).toBe("sin-sesion"));

    await fireEvent.press(getByTestId("accion-login"));
    await waitFor(() => expect(getByTestId("estado").props.children).toBe("dueña@x.com"));
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "solvershub_admin_sesion",
      expect.stringContaining("t-opaco"),
    );

    await fireEvent.press(getByTestId("accion-logout"));
    await waitFor(() => expect(getByTestId("estado").props.children).toBe("sin-sesion"));
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("solvershub_admin_sesion");
  });
});
