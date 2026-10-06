jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { ClienteDetalleScreen } from "./ClienteDetalleScreen";

const mockUseAdminApi = useAdminApi as jest.Mock;
const mockGet = jest.fn();
const mockPost = jest.fn();
const cliente = { get: mockGet, post: mockPost, put: jest.fn(), patch: jest.fn(), del: jest.fn() };

const DETALLE = {
  cliente: {
    id: "c-1", nombre: "Juana", apellido: "Perez", telefono: "7000111", tipo_documento: null,
    numero_documento: "555", negocio: null, cartera: "Cobranza Demo", cartera_id: null,
    tope_maximo_deuda: null, color_riesgo: "blanco",
  },
  prestamos: [
    { id: "l-1", valor: "1000", saldo: "600", num_cuotas: 4, tipo_interes: "10", fecha_otorgado: "2026-09-01", estatus: "activa", cuotas: [] },
  ],
  movimientos: [],
  cambios: [
    { id: "ch-1", campos_propuestos: { telefono: "7000999" }, estado: "pendiente", solicitado_por: "gestor", fecha: "2026-10-06", motivo_rechazo: null },
  ],
};

const route = { params: { id: "c-1", titulo: "Juana Perez" } } as never;
const navigation = { navigate: jest.fn() } as never;

describe("ClienteDetalleScreen (HU-APP-18)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAdminApi.mockReturnValue(cliente);
    mockGet.mockResolvedValue(DETALLE);
    mockPost.mockResolvedValue(undefined);
  });

  it("muestra la ficha con préstamos y cambios pendientes", async () => {
    const { getByText } = await render(
      <ClienteDetalleScreen route={route} navigation={navigation} />,
    );
    await waitFor(() => expect(getByText("Juana Perez")).toBeTruthy());
    expect(getByText("$1000 · 4 cuotas")).toBeTruthy();
    expect(getByText("Cambio propuesto")).toBeTruthy();
  });

  it("aprueba un cambio con confirmación", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, botones) => {
      botones?.find((b) => b.text === "Confirmar")?.onPress?.();
    });

    const { getByTestId } = await render(
      <ClienteDetalleScreen route={route} navigation={navigation} />,
    );
    await waitFor(() => expect(getByTestId("aprobar-ch-1")).toBeTruthy());

    await fireEvent.press(getByTestId("aprobar-ch-1"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/pack/cobranza/client-changes/ch-1/decision", {
        decision: "aprobar",
        motivo: "",
      }),
    );
    alertSpy.mockRestore();
  });

  it("rechaza un cambio", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, botones) => {
      botones?.find((b) => b.text === "Confirmar")?.onPress?.();
    });

    const { getByTestId } = await render(
      <ClienteDetalleScreen route={route} navigation={navigation} />,
    );
    await waitFor(() => expect(getByTestId("rechazar-ch-1")).toBeTruthy());

    await fireEvent.press(getByTestId("rechazar-ch-1"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        "/pack/cobranza/client-changes/ch-1/decision",
        expect.objectContaining({ decision: "rechazar" }),
      ),
    );
    alertSpy.mockRestore();
  });
});
