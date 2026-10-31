jest.mock("expo-secure-store");
jest.mock("expo-local-authentication", () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(false),
  isEnrolledAsync: jest.fn().mockResolvedValue(false),
  authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
}));
jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: jest.fn(),
}));
jest.mock("@core/api/auth-admin", () => ({
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

import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { apiGestorToken } from "@core/api/auth-admin";
import { useAdminSession } from "@core/session/admin-session-context";
import { CLAVE_TEMA, ThemeProvider } from "@core/theme/theme-context";
import { LOGO_POR_TEMA } from "../marca";
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
  tenant_count: 1,
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

function propsDeLogin(extra: Partial<Record<string, jest.Mock>> = {}) {
  return {
    onAutenticado: extra.onAutenticado ?? jest.fn().mockResolvedValue(undefined),
    onFlujoLegado: extra.onFlujoLegado ?? jest.fn(),
    alSeleccionarNegocios: extra.alSeleccionarNegocios ?? jest.fn(),
    onEntrarPanel: extra.onEntrarPanel ?? jest.fn(),
    irARecuperarContrasena: extra.irARecuperarContrasena ?? jest.fn(),
  };
}

function renderLogin(extra: Partial<Record<string, jest.Mock>> = {}) {
  return render(<LoginUnificadoScreen {...propsDeLogin(extra)} />);
}

function renderLoginConTema(extra: Partial<Record<string, jest.Mock>> = {}) {
  return render(
    <ThemeProvider>
      <LoginUnificadoScreen {...propsDeLogin(extra)} />
    </ThemeProvider>,
  );
}

describe("LoginUnificadoScreen (HU-APP-02/03)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dadoMe(ME_UN_NEGOCIO);
  });

  it("reemplaza el texto de marca por el logo definitivo", async () => {
    const { getByTestId, queryByText } = await renderLogin();
    const logo = getByTestId("login-logo");

    expect(logo.props.accessibilityLabel).toBe("SolversHub");
    expect(logo.props.source).toBe(LOGO_POR_TEMA.claro);
    expect(queryByText("SolversHub")).toBeNull();
    expect(queryByText("Un solo login para todo tu negocio")).toBeNull();
  });

  it("usa el logo oscuro con el tema oscuro por defecto", async () => {
    await AsyncStorage.clear();
    const { getByTestId } = await renderLoginConTema();

    await waitFor(() =>
      expect(getByTestId("login-logo").props.source).toBe(LOGO_POR_TEMA.oscuro),
    );
  });

  it("usa el logo claro cuando el tema guardado es claro", async () => {
    await AsyncStorage.setItem(CLAVE_TEMA, "claro");
    const { getByTestId } = await renderLoginConTema();

    await waitFor(() => expect(getByTestId("login-logo").props.source).toBe(LOGO_POR_TEMA.claro));
    await AsyncStorage.clear();
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
    dadoMe({ tenant_count: 0, tenant: null });
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
      tenant_count: 2,
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
    const { ApiAuthError } = jest.requireMock("@core/api/auth-admin");
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

  it.each(["dispositivo_pendiente", "dispositivo_bloqueado", "dispositivo_no_autorizado", "dispositivo_requerido"])(
    "un 403 %s no es «sin acceso de campo»: no entra al panel (la raíz muestra la espera del equipo)",
    async (code) => {
      const { ApiAuthError } = jest.requireMock("@core/api/auth-admin");
      (apiGestorToken as jest.Mock).mockRejectedValue(new ApiAuthError(403, code, "Equipo no autorizado."));
      const onEntrarPanel = jest.fn();
      const onAutenticado = jest.fn();

      const { getByTestId, queryByTestId } = await renderLogin({ onEntrarPanel, onAutenticado });
      await fireEvent.changeText(getByTestId("login-usuario"), "gestor@x.com");
      await fireEvent.changeText(getByTestId("login-password"), "clave");
      await fireEvent.press(getByTestId("login-entrar"));

      await waitFor(() => expect(apiGestorToken).toHaveBeenCalled());
      expect(onEntrarPanel).not.toHaveBeenCalled();
      expect(onAutenticado).not.toHaveBeenCalled();
      expect(queryByTestId("login-error")).toBeNull();
    },
  );

  it("un 403 de otra cosa no lleva al panel: muestra el error", async () => {
    const { ApiAuthError } = jest.requireMock("@core/api/auth-admin");
    (apiGestorToken as jest.Mock).mockRejectedValue(new ApiAuthError(403, "otra_cosa", "No."));
    const onEntrarPanel = jest.fn();

    const { getByTestId } = await renderLogin({ onEntrarPanel });
    await fireEvent.changeText(getByTestId("login-usuario"), "x@x.com");
    await fireEvent.changeText(getByTestId("login-password"), "clave");
    await fireEvent.press(getByTestId("login-entrar"));

    await waitFor(() => expect(getByTestId("login-error")).toBeTruthy());
    expect(onEntrarPanel).not.toHaveBeenCalled();
  });

  it("con credenciales inválidas muestra el error sin delegar", async () => {
    const { ApiAuthError } = jest.requireMock("@core/api/auth-admin");
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

  it("la contraseña arranca oculta y el ojo permite verla", async () => {
    const { getByTestId } = await renderLogin();
    expect(getByTestId("login-password").props.secureTextEntry).toBe(true);
    await fireEvent.press(getByTestId("login-password-ojo"));
    expect(getByTestId("login-password").props.secureTextEntry).toBe(false);
  });
});
