import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { ApiError } from "../api/client";
import { LoginScreen } from "./LoginScreen";
import { SessionContext, SessionValue } from "../session/session-context";

async function renderConSesion(login: jest.Mock) {
  const valor: SessionValue = {
    cobrador: null,
    loading: false,
    api: {} as SessionValue["api"],
    login: login as SessionValue["login"],
    logout: jest.fn(),
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

    await fireEvent.changeText(getByTestId("usuario-input"), "cobrador1");
    await fireEvent.changeText(getByTestId("password-input"), "secret");

    expect(getByTestId("login-button")).not.toBeDisabled();
  });

  it("llama a login con las credenciales al presionar Entrar", async () => {
    const login = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = await renderConSesion(login);

    await fireEvent.changeText(getByTestId("usuario-input"), "cobrador1");
    await fireEvent.changeText(getByTestId("password-input"), "secret");
    await fireEvent.press(getByTestId("login-button"));

    await waitFor(() => expect(login).toHaveBeenCalledWith("cobrador1", "secret", "cobrador"));
  });

  it("permite elegir rol socio y lo pasa al login", async () => {
    const login = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = await renderConSesion(login);

    await fireEvent.press(getByTestId("rol-socio"));
    await fireEvent.changeText(getByTestId("usuario-input"), "socio1");
    await fireEvent.changeText(getByTestId("password-input"), "secret");
    await fireEvent.press(getByTestId("login-button"));

    await waitFor(() => expect(login).toHaveBeenCalledWith("socio1", "secret", "socio"));
  });

  it("muestra error de credenciales cuando el login responde 401", async () => {
    const login = jest.fn().mockRejectedValue(new ApiError(401, "Credenciales inválidas"));
    const { getByTestId } = await renderConSesion(login);

    await fireEvent.changeText(getByTestId("usuario-input"), "cobrador1");
    await fireEvent.changeText(getByTestId("password-input"), "wrong");
    await fireEvent.press(getByTestId("login-button"));

    await waitFor(() =>
      expect(getByTestId("error-text")).toHaveTextContent(
        "Usuario o contraseña incorrectos.",
      ),
    );
  });
});