let mockSesion: { token: string; tenantId: string | null; adminId?: string } | null = null;
jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => ({ sesion: mockSesion, loading: false }),
}));
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: () => ({}) }));
jest.mock("./use-centro", () => ({
  useCentro: () => ({
    noLeidas: 3,
    refrescarContador: jest.fn(),
    recargar: jest.fn(),
    marcarLeida: jest.fn(),
  }),
}));
jest.mock("./CentroSheet", () => ({ CentroSheet: () => null }));

import { useEffect } from "react";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";
import { useCentroNotificaciones } from "@core/notificaciones/centro-context";
import { CentroNotificacionesProvider } from "./CentroProvider";

const montajes = jest.fn();
const desmontajes = jest.fn();

function Hijo() {
  const centro = useCentroNotificaciones();
  useEffect(() => {
    montajes();
    return () => desmontajes();
  }, []);
  return <Text testID="hijo">{centro.disponible ? `centro:${centro.noLeidas}` : "sin-centro"}</Text>;
}

const arbol = () => (
  <CentroNotificacionesProvider>
    <Hijo />
  </CentroNotificacionesProvider>
);

describe("CentroNotificacionesProvider (apk#220)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSesion = null;
  });

  it("al iniciar sesión no vuelve a montar la app que envuelve", async () => {
    const { rerender, getByTestId } = await render(arbol());
    expect(montajes).toHaveBeenCalledTimes(1);

    mockSesion = { token: "t", tenantId: "n-1", adminId: "a-1" };
    await rerender(arbol());

    expect(montajes).toHaveBeenCalledTimes(1);
    expect(desmontajes).not.toHaveBeenCalled();
    expect(getByTestId("hijo").props.children).toBe("centro:3");
  });

  it("al cerrar sesión tampoco la desmonta y la campana desaparece", async () => {
    mockSesion = { token: "t", tenantId: "n-1", adminId: "a-1" };
    const { rerender, getByTestId } = await render(arbol());
    mockSesion = null;
    await rerender(arbol());
    expect(desmontajes).not.toHaveBeenCalled();
    expect(getByTestId("hijo").props.children).toBe("sin-centro");
  });

  it("al cambiar de negocio reinicia solo el estado del centro, no la app", async () => {
    mockSesion = { token: "t", tenantId: "n-1", adminId: "a-1" };
    const { rerender } = await render(arbol());
    mockSesion = { token: "t2", tenantId: "n-2", adminId: "a-1" };
    await rerender(arbol());
    expect(desmontajes).not.toHaveBeenCalled();
  });
});
