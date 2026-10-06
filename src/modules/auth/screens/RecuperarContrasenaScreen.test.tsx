jest.mock("expo-secure-store");
jest.mock("@core/api/auth-admin", () => ({
  apiOlvidarContrasena: jest.fn(),
  apiRestablecerContrasena: jest.fn(),
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
import { apiOlvidarContrasena, apiRestablecerContrasena } from "@core/api/auth-admin";
import { RecuperarContrasenaScreen } from "./RecuperarContrasenaScreen";

describe("RecuperarContrasenaScreen (HU-APP-02)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("solicita el código, lo aplica y confirma el restablecimiento", async () => {
    (apiOlvidarContrasena as jest.Mock).mockResolvedValue(undefined);
    (apiRestablecerContrasena as jest.Mock).mockResolvedValue(undefined);

    const { getByTestId } = await render(
      <RecuperarContrasenaScreen volverAlLogin={jest.fn()} />,
    );

    await fireEvent.changeText(getByTestId("recuperar-identifier"), "correo@x.com");
    await fireEvent.press(getByTestId("recuperar-solicitar"));
    await waitFor(() => expect(apiOlvidarContrasena).toHaveBeenCalledWith("correo@x.com"));

    await fireEvent.changeText(getByTestId("recuperar-codigo"), "abc123");
    await fireEvent.changeText(getByTestId("recuperar-nueva"), "nueva-clave-123");
    await fireEvent.changeText(getByTestId("recuperar-confirmacion"), "nueva-clave-123");
    await fireEvent.press(getByTestId("recuperar-aplicar"));

    await waitFor(() => expect(apiRestablecerContrasena).toHaveBeenCalledWith("ABC123", "nueva-clave-123"));
    await waitFor(() => expect(getByTestId("recuperar-volver")).toBeTruthy());
  });

  it("rechaza contraseñas que no coinciden", async () => {
    (apiOlvidarContrasena as jest.Mock).mockResolvedValue(undefined);
    const { getByTestId } = await render(
      <RecuperarContrasenaScreen volverAlLogin={jest.fn()} />,
    );

    await fireEvent.changeText(getByTestId("recuperar-identifier"), "correo@x.com");
    await fireEvent.press(getByTestId("recuperar-solicitar"));
    await waitFor(() => expect(getByTestId("recuperar-codigo")).toBeTruthy());

    await fireEvent.changeText(getByTestId("recuperar-codigo"), "abc123");
    await fireEvent.changeText(getByTestId("recuperar-nueva"), "nueva-clave-123");
    await fireEvent.changeText(getByTestId("recuperar-confirmacion"), "otra-clave-456");
    await fireEvent.press(getByTestId("recuperar-aplicar"));

    await waitFor(() => expect(getByTestId("recuperar-error")).toBeTruthy());
    expect(apiRestablecerContrasena).not.toHaveBeenCalled();
  });

  it("código inválido muestra el error del servidor", async () => {
    (apiOlvidarContrasena as jest.Mock).mockResolvedValue(undefined);
    const { ApiAuthError } = jest.requireMock("@core/api/auth-admin");
    (apiRestablecerContrasena as jest.Mock).mockRejectedValue(
      new ApiAuthError(400, "invalid_token", "Código inválido o vencido."),
    );

    const { getByTestId } = await render(
      <RecuperarContrasenaScreen volverAlLogin={jest.fn()} />,
    );
    await fireEvent.changeText(getByTestId("recuperar-identifier"), "correo@x.com");
    await fireEvent.press(getByTestId("recuperar-solicitar"));
    await waitFor(() => expect(getByTestId("recuperar-codigo")).toBeTruthy());

    await fireEvent.changeText(getByTestId("recuperar-codigo"), "malo");
    await fireEvent.changeText(getByTestId("recuperar-nueva"), "nueva-clave-123");
    await fireEvent.changeText(getByTestId("recuperar-confirmacion"), "nueva-clave-123");
    await fireEvent.press(getByTestId("recuperar-aplicar"));

    await waitFor(() => expect(getByTestId("recuperar-error")).toBeTruthy());
  });

  it("vuelve al login al cancelar", async () => {
    const volver = jest.fn();
    const { getByTestId } = await render(<RecuperarContrasenaScreen volverAlLogin={volver} />);
    await fireEvent.press(getByTestId("recuperar-cancelar"));
    expect(volver).toHaveBeenCalled();
  });
});
