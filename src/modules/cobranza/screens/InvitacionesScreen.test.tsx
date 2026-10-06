import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { SessionContext, SessionValue } from "../session/session-context";
import { InvitacionesScreen } from "./InvitacionesScreen";

function renderInvitaciones(resolverInvitacion: jest.Mock) {
  const value: SessionValue = {
    gestor: null,
    loading: false,
    api: {} as SessionValue["api"],
    login: jest.fn(),
    logout: jest.fn(),
    actualizarPerfil: jest.fn(),
    requiereVinculacion: false,
    marcarDispositivoVinculado: jest.fn(),
    negociosPendientes: [],
    membresiaToken: "tok",
    invitaciones: [{ id: "1", slug: "acme", nombre: "Acme", rol: "colaborador" }],
    seleccionarNegocio: jest.fn(),
    resolverInvitacion: resolverInvitacion as SessionValue["resolverInvitacion"],
  };
  return render(
    <SessionContext.Provider value={value}>
      <InvitacionesScreen />
    </SessionContext.Provider>,
  );
}

describe("InvitacionesScreen", () => {
  it("muestra la invitación con su negocio y rol", async () => {
    const { getByText } = await renderInvitaciones(jest.fn(async () => {}));
    expect(getByText("Acme")).toBeTruthy();
    expect(getByText("Colaborador")).toBeTruthy();
  });

  it("acepta la invitación", async () => {
    const resolverInvitacion = jest.fn(async () => {});
    const { getByTestId } = await renderInvitaciones(resolverInvitacion);

    await fireEvent.press(getByTestId("aceptar-1"));

    await waitFor(() => expect(resolverInvitacion).toHaveBeenCalledWith("1", "aceptar"));
  });

  it("rechaza la invitación", async () => {
    const resolverInvitacion = jest.fn(async () => {});
    const { getByTestId } = await renderInvitaciones(resolverInvitacion);

    await fireEvent.press(getByTestId("rechazar-1"));

    await waitFor(() => expect(resolverInvitacion).toHaveBeenCalledWith("1", "rechazar"));
  });

  it("muestra error si no se puede resolver", async () => {
    const resolverInvitacion = jest.fn(async () => {
      throw new Error("boom");
    });
    const { getByTestId } = await renderInvitaciones(resolverInvitacion);

    await fireEvent.press(getByTestId("aceptar-1"));

    await waitFor(() => expect(getByTestId("invitaciones-error")).toBeTruthy());
  });
});
