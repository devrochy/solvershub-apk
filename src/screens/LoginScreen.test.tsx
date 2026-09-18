import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { ApiError } from "../api/client";
import { LoginScreen } from "./LoginScreen";
import { SessionContext, SessionValue } from "../session/session-context";

async function renderConSesion(login: jest.Mock) {
  const valor: SessionValue = {
    gestor: null,
    loading: false,
    api: {} as SessionValue["api"],
    login: login as SessionValue["login"],
    logout: jest.fn(),
    actualizarPerfil: jest.fn(),
  };
  return render(
    <SessionContext.Provider value={valor}>
      <LoginScreen />
    </SessionContext.Provider>,
  );
}

describe("LoginScreen", () => {
  it("deshabilita el botón hasta tener usuario y contraseña", async () => {
    const { getByTestId } = await renderConSesion(jest.fn());

    expect(getByTestId("login-button")).toBeDisabled();

    await fireEvent.changeText(getByTestId("usuario-input"), "gestor1");
    await fireEvent.changeText(getByTestId("password-input"), "secret");

    expect(getByTestId("login-button")).not.toBeDisabled();
  });

  it("llama a login con las credenciales al presionar Entrar", async () => {
    const login = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = await renderConSesion(login);

    await fireEvent.changeText(getByTestId("usuario-input"), "gestor1");
    await fireEvent.changeText(getByTestId("password-input"), "secret");
    await fireEvent.press(getByTestId("login-button"));

    await waitFor(() => expect(login).toHaveBeenCalledWith("gestor1", "secret", "gestor"));
  });

  it("permite elegir rol propietario y lo pasa al login", async () => {
    const login = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = await renderConSesion(login);

    await fireEvent.press(getByTestId("rol-propietario"));
    await fireEvent.changeText(getByTestId("usuario-input"), "propietario1");
    await fireEvent.changeText(getByTestId("password-input"), "secret");
    await fireEvent.press(getByTestId("login-button"));

    await waitFor(() => expect(login).toHaveBeenCalledWith("propietario1", "secret", "propietario"));
  });

  it("muestra error de credenciales cuando el login responde 401", async () => {
    const login = jest.fn().mockRejectedValue(new ApiError(401, "Credenciales inválidas"));
    const { getByTestId } = await renderConSesion(login);

    await fireEvent.changeText(getByTestId("usuario-input"), "gestor1");
    await fireEvent.changeText(getByTestId("password-input"), "wrong");
    await fireEvent.press(getByTestId("login-button"));

    await waitFor(() =>
      expect(getByTestId("error-text")).toHaveTextContent(
        "Usuario o contraseña incorrectos.",
      ),
    );
  });

  it("oculta la contraseña por defecto y el ojo la muestra y la vuelve a ocultar", async () => {
    const { getByTestId } = await renderConSesion(jest.fn());

    expect(getByTestId("password-input")).toHaveProp("secureTextEntry", true);

    await fireEvent.press(getByTestId("password-toggle"));
    expect(getByTestId("password-input")).toHaveProp("secureTextEntry", false);

    await fireEvent.press(getByTestId("password-toggle"));
    expect(getByTestId("password-input")).toHaveProp("secureTextEntry", true);
  });

  it("renderiza el logo sin marco", async () => {
    const { getByTestId } = await renderConSesion(jest.fn());

    expect(getByTestId("login-logo")).toBeTruthy();
  });
});