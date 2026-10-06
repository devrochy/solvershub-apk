jest.mock("expo-secure-store");
jest.mock("expo-local-authentication", () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(false),
  isEnrolledAsync: jest.fn().mockResolvedValue(false),
  authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
}));
jest.mock("../admin-session-context", () => ({
  useAdminSession: () => ({
    sesion: null,
    loading: false,
    login: jest.fn(async (identifier: string) => ({
      sesion: { token: "t-opaco", adminId: "a-1", email: identifier, role: "owner" },
      me: { tenantCount: 1, tenant: { id: "t-1", name: "Mi Negocio", role: "owner", active: true } },
    })),
    logout: jest.fn(),
  }),
}));
jest.mock("../api", () => ({
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

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { apiGestorToken } from "../api";
import { LoginUnificadoScreen } from "./LoginUnificadoScreen";

const CAMPO_RESULT = {
  accessToken: "jwt-access",
  refreshToken: "jwt-refresh",
  rol: "gestor",
  perfil: { id: "g-1", usuario: "g", nombre: "G", apellido: "" },
  requiereVinculacion: true,
};

describe("LoginUnificadoScreen (HU-APP-02)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("con un solo negocio intercambia tokens de campo y aplica la sesión", async () => {
    (apiGestorToken as jest.Mock).mockResolvedValue(CAMPO_RESULT);
    const onAutenticado = jest.fn().mockResolvedValue(undefined);
    const onFlujoLegado = jest.fn();

    const { getByTestId } = await render(
      <LoginUnificadoScreen
        onAutenticado={onAutenticado}
        onFlujoLegado={onFlujoLegado}
        irARecuperarContrasena={jest.fn()}
      />,
    );

    await fireEvent.changeText(getByTestId("login-usuario"), "gestor@x.com");
    await fireEvent.changeText(getByTestId("login-password"), "clave");
    await fireEvent.press(getByTestId("login-entrar"));

    await waitFor(() => expect(onAutenticado).toHaveBeenCalledWith(CAMPO_RESULT));
    expect(onFlujoLegado).not.toHaveBeenCalled();
  });

  it("con credenciales inválidas muestra el error sin delegar", async () => {
    const { ApiAuthError } = jest.requireMock("../api");
    (apiGestorToken as jest.Mock).mockRejectedValue(
      new ApiAuthError(401, "invalid_credentials", "Mal."),
    );
    const onAutenticado = jest.fn();
    const onFlujoLegado = jest.fn();

    const { getByTestId } = await render(
      <LoginUnificadoScreen
        onAutenticado={onAutenticado}
        onFlujoLegado={onFlujoLegado}
        irARecuperarContrasena={jest.fn()}
      />,
    );

    await fireEvent.changeText(getByTestId("login-usuario"), "x@x.com");
    await fireEvent.changeText(getByTestId("login-password"), "mala");
    await fireEvent.press(getByTestId("login-entrar"));

    await waitFor(() => expect(getByTestId("login-error")).toBeTruthy());
    expect(onAutenticado).not.toHaveBeenCalled();
    expect(onFlujoLegado).not.toHaveBeenCalled();
  });

  it("sin campos completos pide usuario y contraseña", async () => {
    const { getByTestId } = await render(
      <LoginUnificadoScreen
        onAutenticado={jest.fn()}
        onFlujoLegado={jest.fn()}
        irARecuperarContrasena={jest.fn()}
      />,
    );
    await fireEvent.press(getByTestId("login-entrar"));
    await waitFor(() => expect(getByTestId("login-error")).toBeTruthy());
  });

  it("navega a recuperar contraseña", async () => {
    const irARecuperar = jest.fn();
    const { getByTestId } = await render(
      <LoginUnificadoScreen
        onAutenticado={jest.fn()}
        onFlujoLegado={jest.fn()}
        irARecuperarContrasena={irARecuperar}
      />,
    );
    await fireEvent.press(getByTestId("login-recuperar"));
    expect(irARecuperar).toHaveBeenCalled();
  });
});
