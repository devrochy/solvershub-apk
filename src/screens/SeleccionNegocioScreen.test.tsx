import { fireEvent, render } from "@testing-library/react-native";
import { SessionContext, SessionValue } from "../session/session-context";
import { SeleccionNegocioScreen } from "./SeleccionNegocioScreen";

function renderSelector(seleccionarNegocio: jest.Mock) {
  const value: SessionValue = {
    gestor: null,
    loading: false,
    api: {} as SessionValue["api"],
    login: jest.fn(),
    logout: jest.fn(),
    actualizarPerfil: jest.fn(),
    requiereVinculacion: false,
    marcarDispositivoVinculado: jest.fn(),
    negociosPendientes: [
      { slug: "acme", nombre: "Acme", rol: "gestor" },
      { slug: "norte", nombre: "Norte", rol: "propietario" },
    ],
    membresiaToken: null,
    invitaciones: [],
    seleccionarNegocio: seleccionarNegocio as SessionValue["seleccionarNegocio"],
    resolverInvitacion: jest.fn(),
  };
  return render(
    <SessionContext.Provider value={value}>
      <SeleccionNegocioScreen />
    </SessionContext.Provider>,
  );
}

describe("SeleccionNegocioScreen", () => {
  it("lista los negocios con su rol", async () => {
    const { getByText } = await renderSelector(jest.fn());
    expect(getByText("Acme")).toBeTruthy();
    expect(getByText("Gestor")).toBeTruthy();
    expect(getByText("Norte")).toBeTruthy();
    expect(getByText("Propietario")).toBeTruthy();
  });

  it("al elegir un negocio llama seleccionarNegocio con su slug", async () => {
    const seleccionarNegocio = jest.fn(async () => {});
    const { getByTestId } = await renderSelector(seleccionarNegocio);

    await fireEvent.press(getByTestId("negocio-norte"));

    expect(seleccionarNegocio).toHaveBeenCalledWith("norte");
  });
});
