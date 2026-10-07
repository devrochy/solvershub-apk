jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { CarteraDetalleScreen } from "./CarteraDetalleScreen";

const mockUseAdminApi = useAdminApi as jest.Mock;
const mockGet = jest.fn();
const mockPost = jest.fn();
const cliente = { get: mockGet, post: mockPost, put: jest.fn(), patch: jest.fn(), del: jest.fn() };

const route = { params: { id: "car-1", titulo: "Cobranza Demo" } } as never;
const navigation = { navigate: jest.fn() } as never;

describe("CarteraDetalleScreen (HU-APP-19)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAdminApi.mockReturnValue(cliente);
    mockPost.mockResolvedValue(undefined);
    mockGet.mockImplementation((path: string) => {
      if (String(path).includes("/cash")) {
        return Promise.resolve({ saldo_inicial: 1000, saldo_actual: 1200, actualizado: "2026-10-06" });
      }
      if (String(path).includes("/route")) {
        return Promise.resolve({
          clientes: [{ id: "c-1", cliente: "Juana Perez", telefono: "7000111", saldo: 600, mora: 0, riesgo: "blanco", lat: null, lng: null }],
          plan: { orden: ["c-1"], distancia_km: 1.5, tiempo_min: 12, fecha: "2026-10-06" },
        });
      }
      return Promise.reject(new Error("no mockeado"));
    });
  });

  it("muestra la caja y la ruta del día", async () => {
    const { getByText } = await render(<CarteraDetalleScreen route={route} navigation={navigation} />);
    await waitFor(() => expect(getByText("$1200")).toBeTruthy());
    expect(getByText("1. Juana Perez")).toBeTruthy();
    expect(getByText("1 visitas · 1.5 km · 12 min")).toBeTruthy();
  });

  it("abre caja con confirmación", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, botones) => {
      botones?.find((b) => b.text === "Confirmar")?.onPress?.();
    });
    const { getByText } = await render(<CarteraDetalleScreen route={route} navigation={navigation} />);
    await waitFor(() => expect(getByText("Abrir caja")).toBeTruthy());

    await fireEvent.press(getByText("Abrir caja"));
    await waitFor(() => expect(mockPost).toHaveBeenCalledWith("/pack/cobranza/portfolios/car-1/cash/opening"));
    alertSpy.mockRestore();
  });

  it("ajusta la caja desde el modal", async () => {
    const { getByTestId, getByText } = await render(<CarteraDetalleScreen route={route} navigation={navigation} />);
    await waitFor(() => expect(getByText("Ajustar")).toBeTruthy());

    await fireEvent.press(getByText("Ajustar"));
    await fireEvent.changeText(getByTestId("modal-valor"), "1300");
    await fireEvent.changeText(getByTestId("modal-motivo"), "cuadre");
    await fireEvent.press(getByTestId("modal-confirmar"));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/pack/cobranza/portfolios/car-1/cash/adjustment", {
        valor_nuevo: 1300,
        motivo: "cuadre",
      }),
    );
  });

  it("optimiza la ruta", async () => {
    const { getByText } = await render(<CarteraDetalleScreen route={route} navigation={navigation} />);
    await waitFor(() => expect(getByText("Optimizar ruta")).toBeTruthy());

    await fireEvent.press(getByText("Optimizar ruta"));
    await waitFor(() => expect(mockPost).toHaveBeenCalledWith("/pack/cobranza/portfolios/car-1/route/optimize"));
  });
});
