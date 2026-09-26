import { act, fireEvent, render } from "@testing-library/react-native";
import { SessionContext, SessionValue } from "../session/session-context";
import { PerfilScreen } from "./PerfilScreen";

function renderPerfil() {
  const actualizarPerfil = jest.fn(async () => {});
  const value: SessionValue = {
    gestor: {
      id: "7",
      usuario: "cob1",
      nombre: "Carlos",
      apellido: "Ruiz",
      rol: "gestor",
    },
    loading: false,
    api: {} as SessionValue["api"],
    login: jest.fn(),
    logout: jest.fn(),
    actualizarPerfil,
    requiereVinculacion: false,
    marcarDispositivoVinculado: jest.fn(),
  };

  return render(
    <SessionContext.Provider value={value}>
      <PerfilScreen />
    </SessionContext.Provider>,
  ).then((utils) => ({ ...utils, actualizarPerfil }));
}

describe("PerfilScreen", () => {
  it("muestra los datos del usuario", async () => {
    const { getByTestId, getByText } = await renderPerfil();

    expect(getByTestId("perfil-nombre").props.children).toBe("Carlos Ruiz");
    expect(getByText("@cob1")).toBeTruthy();
    expect(getByTestId("perfil-rol").props.children).toBe("Gestor");
  });

  it("abre el modal de edición con los datos actuales", async () => {
    const { getByTestId } = await renderPerfil();

    await fireEvent.press(getByTestId("btn-editar-perfil"));

    expect(getByTestId("perfil-nombre-input").props.value).toBe("Carlos");
    expect(getByTestId("perfil-apellido-input").props.value).toBe("Ruiz");
  });

  it("guarda los cambios llamando a actualizarPerfil", async () => {
    const { getByTestId, actualizarPerfil } = await renderPerfil();

    await fireEvent.press(getByTestId("btn-editar-perfil"));
    await fireEvent.changeText(getByTestId("perfil-nombre-input"), "Nuevo");
    await fireEvent.changeText(getByTestId("perfil-apellido-input"), "Pérez");

    await act(async () => {
      fireEvent.press(getByTestId("perfil-guardar"));
    });

    expect(actualizarPerfil).toHaveBeenCalledWith({
      nombre: "Nuevo",
      apellido: "Pérez",
    });
  });

  it("no guarda si faltan campos", async () => {
    const { getByTestId, actualizarPerfil } = await renderPerfil();

    await fireEvent.press(getByTestId("btn-editar-perfil"));
    await fireEvent.changeText(getByTestId("perfil-nombre-input"), "");

    await act(async () => {
      fireEvent.press(getByTestId("perfil-guardar"));
    });

    expect(actualizarPerfil).not.toHaveBeenCalled();
    expect(getByTestId("perfil-error")).toBeTruthy();
  });
});
