jest.mock("expo-secure-store");
jest.mock("expo-local-authentication", () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(false),
  isEnrolledAsync: jest.fn().mockResolvedValue(false),
  authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
}));
jest.mock("../admin-session-context", () => ({
  useAdminSession: jest.fn(),
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
import { useAdminSession } from "../admin-session-context";
import { LoginUnificadoScreen } from "./LoginUnificadoScreen";

const mockUseAdminSession = useAdminSession as jest.Mock;

const CAMPO_RESULT = {
  accessToken: "jwt-access",
  refreshToken: "jwt-refresh",
  rol: "gestor",
  perfil: { id: "g-1", usuario: "g", nombre: "G", apellido: "" },
  requiereVinculacion: true,
};

const ME_UN_NEGOCIO = {
  tenantCount: 1,
  tenant: { id: "t-1", name: "Mi Negocio", role: "owner", active: true },
};

function dadoMe(me: Record<string, unknown>) {
  mockUseAdminSession.mockReturnValue({
    sesion: null,
    loading: false,
    login: jest.fn(async (identifier: string) => ({
      sesion: { token: "t-opaco", adminId: "a-1", email: identifier, role: "owner" },
      me,
    })),
    logout: jest.fn(),
    seleccionarNegocio: jest.fn(),
  });
}

function renderLogin(extra: Partial<Record<string, jest.Mock>> = {}) {
  return render(
    <LoginUnificadoScreen
      onAutenticado={extra.onAutenticado ?? jest.fn().mockResolvedValue(undefined)}
      onFlujoLegado={extra.onFlujoLegado ?? jest.fn()}
      alSeleccionarNegocios={extra.alSeleccionarNegocios ?? jest.fn()}
      onEntrarPanel={extra.onEntrarPanel ?? jest.fn()}
      irARecuperarContrasena={extra.irARecuperarContrasena ?? jest.fn()}
    />,
  );
}

describe("LoginUnificadoScreen (HU-APP-02/03)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dadoMe(ME_UN_NEGOCIO);
  });

  it("con un solo negocio intercambia tokens de campo y aplica la sesión", async () => {
    (apiGestorToken as jest.Mock).mockResolvedValue(CAMPO_RESULT);
    const onAutenticado = jest.fn().mockResolvedValue(undefined);
    const onFlujoLegado = jest.fn();

    const { getByTestId } = await renderLogin({ onAutenticado, onFlujoLegado });

    await fireEvent.changeText(getByTestId("login-usuario"), "gestor@x.com");
    await fireEvent.changeText(getByTestId("login-password"), "clave");
    await fireEvent.press(getByTestId("login-entrar"));

    await waitFor(() => expect(onAutenticado).toHaveBeenCalledWith(CAMPO_RESULT));
    expect(onFlujoLegado).not.toHaveBeenCalled();
  });

  it("con cero negocios delega al flujo legado (invitaciones ADR-0081)", async () => {
    dadoMe({ tenantCount: 0, tenant: null });
    const onFlujoLegado = jest.fn().mockResolvedValue(undefined);
    const onAutenticado = jest.fn();

    const { getByTestId } = await renderLogin({ onFlujoLegado, onAutenticado });
    await fireEvent.changeText(getByTestId("login-usuario"), "invitada@x.com");
    await fireEvent.changeText(getByTestId("login-password"), "clave");
    await fireEvent.press(getByTestId("login-entrar"));

    await waitFor(() => expect(onFlujoLegado).toHaveBeenCalledWith("invitada@x.com", "clave"));
    expect(onAutenticado).not.toHaveBeenCalled();
  });

  it("con varios negocios abre el selector admin (HU-APP-03)", async () => {
    dadoMe({
      tenantCount: 2,
      tenant: { id: "t-1", name: "A", role: "owner", active: true },
    });
    const alSeleccionarNegocios = jest.fn();

    const { getByTestId } = await renderLogin({ alSeleccionarNegocios });
    await fireEvent.changeText(getByTestId("login-usuario"), "multi@x.com");
    await fireEvent.changeText(getByTestId("login-password"), "clave");
    await fireEvent.press(getByTestId("login-entrar"));

    await waitFor(() => expect(alSeleccionarNegocios).toHaveBeenCalled());
  });

  it("si el exchange devuelve 403 entra al panel con la sesión admin", async () => {
    const { ApiAuthError } = jest.requireMock("../api");
    (apiGestorToken as jest.Mock).mockRejectedValue(
      new ApiAuthError(403, "sin_acceso_campo", "Sin acceso de campo."),
    );
    const onEntrarPanel = jest.fn();
    const onAutenticado = jest.fn();

    const { getByTestId } = await renderLogin({ onEntrarPanel, onAutenticado });
    await fireEvent.changeText(getByTestId("login-usuario"), "panel@x.com");
    await fireEvent.changeText(getByTestId("login-password"), "clave");
    await fireEvent.press(getByTestId("login-entrar"));

    await waitFor(() => expect(onEntrarPanel).toHaveBeenCalled());
    expect(onAutenticado).not.toHaveBeenCalled();
  });

  it("con credenciales inválidas muestra el error sin delegar", async () => {
    const { ApiAuthError } = jest.requireMock("../api");
    (apiGestorToken as jest.Mock).mockRejectedValue(
      new ApiAuthError(401, "invalid_credentials", "Mal."),
    );
    const onAutenticado = jest.fn();
    const onFlujoLegado = jest.fn();

    const { getByTestId } = await renderLogin({ onAutenticado, onFlujoLegado });

    await fireEvent.changeText(getByTestId("login-usuario"), "x@x.com");
    await fireEvent.changeText(getByTestId("login-password"), "mala");
    await fireEvent.press(getByTestId("login-entrar"));

    await waitFor(() => expect(getByTestId("login-error")).toBeTruthy());
    expect(onAutenticado).not.toHaveBeenCalled();
    expect(onFlujoLegado).not.toHaveBeenCalled();
  });

  it("sin campos completos pide usuario y contraseña", async () => {
    const { getByTestId } = await renderLogin();
    await fireEvent.press(getByTestId("login-entrar"));
    await waitFor(() => expect(getByTestId("login-error")).toBeTruthy());
  });

  it("navega a recuperar contraseña", async () => {
    const irARecuperar = jest.fn();
    const { getByTestId } = await renderLogin({ irARecuperarContrasena: irARecuperar });
    await fireEvent.press(getByTestId("login-recuperar"));
    expect(irARecuperar).toHaveBeenCalled();
  });
});
