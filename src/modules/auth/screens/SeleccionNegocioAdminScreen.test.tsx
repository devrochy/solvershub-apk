jest.mock("expo-secure-store");
const mockSeleccionar = jest.fn();
const mockLogout = jest.fn();
const mockTenants = jest.fn();
const mockExchange = jest.fn();

const SESION_FIJA = { token: "t-opaco", adminId: "a-1", role: "owner" };
jest.mock("../admin-session-context", () => ({
  useAdminSession: () => ({
    sesion: SESION_FIJA,
    loading: false,
    seleccionarNegocio: mockSeleccionar,
    logout: mockLogout,
  }),
}));
jest.mock("../api", () => ({
  apiTenantsAdmin: (...args: unknown[]) => mockTenants(...args),
  apiGestorToken: (...args: unknown[]) => mockExchange(...args),
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
import { SeleccionNegocioAdminScreen } from "./SeleccionNegocioAdminScreen";

const TENANTS = [
  { id: "t-1", name: "Negocio Uno", role: "owner", active: true },
  { id: "t-2", name: "Negocio Dos", role: "colaborador", active: true },
  { id: "t-3", name: "Inactivo", role: "owner", active: false },
];

describe("SeleccionNegocioAdminScreen (HU-APP-03)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSeleccionar.mockResolvedValue(undefined);
    mockLogout.mockResolvedValue(undefined);
    mockTenants.mockResolvedValue(TENANTS);
  });

  it("lista solo los negocios activos", async () => {
    const { getByTestId, queryByTestId } = await render(
      <SeleccionNegocioAdminScreen
        onAutenticado={jest.fn()}
        onEntrarPanel={jest.fn()}
        onCancelar={jest.fn()}
      />,
    );
    await waitFor(() => expect(getByTestId("negocio-t-1")).toBeTruthy());
    expect(getByTestId("negocio-t-2")).toBeTruthy();
    expect(queryByTestId("negocio-t-3")).toBeNull();
  });

  it("al elegir un negocio intercambia tokens y aplica la sesión", async () => {
    const CAMPO = { accessToken: "a", refreshToken: "r", rol: "propietario" };
    mockExchange.mockResolvedValue(CAMPO);
    const onAutenticado = jest.fn().mockResolvedValue(undefined);
    const onEntrarPanel = jest.fn();

    const { getByTestId } = await render(
      <SeleccionNegocioAdminScreen
        onAutenticado={onAutenticado}
        onEntrarPanel={onEntrarPanel}
        onCancelar={jest.fn()}
      />,
    );
    await waitFor(() => expect(getByTestId("negocio-t-1")).toBeTruthy());
    await fireEvent.press(getByTestId("negocio-t-1"));

    await waitFor(() => expect(onAutenticado).toHaveBeenCalledWith(CAMPO));
    expect(mockSeleccionar).toHaveBeenCalledWith("t-1");
    expect(mockExchange).toHaveBeenCalledWith("t-opaco", "t-1");
    expect(onEntrarPanel).not.toHaveBeenCalled();
  });

  it("si el negocio no tiene acceso de campo entra al panel", async () => {
    mockExchange.mockRejectedValue(new Error("403"));
    const onEntrarPanel = jest.fn();
    const onAutenticado = jest.fn();

    const { getByTestId } = await render(
      <SeleccionNegocioAdminScreen
        onAutenticado={onAutenticado}
        onEntrarPanel={onEntrarPanel}
        onCancelar={jest.fn()}
      />,
    );
    await waitFor(() => expect(getByTestId("negocio-t-2")).toBeTruthy());
    await fireEvent.press(getByTestId("negocio-t-2"));

    await waitFor(() => expect(onEntrarPanel).toHaveBeenCalled());
    expect(onAutenticado).not.toHaveBeenCalled();
  });

  it("al cancelar cierra la sesión admin", async () => {
    const onCancelar = jest.fn();
    const { getByTestId } = await render(
      <SeleccionNegocioAdminScreen
        onAutenticado={jest.fn()}
        onEntrarPanel={jest.fn()}
        onCancelar={onCancelar}
      />,
    );
    await fireEvent.press(getByTestId("selector-cancelar"));
    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    expect(onCancelar).toHaveBeenCalled();
  });
});
