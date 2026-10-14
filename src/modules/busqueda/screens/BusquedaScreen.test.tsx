jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));
jest.mock("@shared/navegacion-evento", () => ({ emitirNavegacion: jest.fn() }));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { emitirNavegacion } from "@shared/navegacion-evento";
import { BusquedaScreen, DESTINO_POR_ENTIDAD } from "./BusquedaScreen";

const mockUseAdminApi = useAdminApi as jest.Mock;
const mockGet = jest.fn();
const cliente = { get: mockGet, post: jest.fn(), put: jest.fn(), patch: jest.fn(), del: jest.fn() };

describe("BusquedaScreen (HU-APP-14)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAdminApi.mockReturnValue(cliente);
    mockGet.mockResolvedValue({
      resultados: [
        {
          seccion: "pack_cobranza:clientes",
          label: "Clientes de cobranza",
          items: [
            {
              id: "c-1",
              tipo: "cliente_cobranza",
              titulo: "Juana Perez",
              subtitulo: "5551234",
              extra: {},
            },
          ],
        },
      ],
    });
  });

  it("busca con debounce y agrupa por sección", async () => {
    jest.useFakeTimers();
    const { getByTestId, getByText } = await render(<BusquedaScreen />);

    await fireEvent.changeText(getByTestId("busqueda-campo"), "juana");
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    jest.useRealTimers();

    await waitFor(() => expect(getByText("Juana Perez")).toBeTruthy());
    expect(getByText("Clientes de cobranza · 5551234")).toBeTruthy();
    expect(mockGet).toHaveBeenCalledWith("/search", { q: "juana", limit: 5 });
  });

  it("tocar un resultado pide al shell el módulo y la pestaña de la entidad (HU-APP-21)", async () => {
    jest.useFakeTimers();
    const { getByTestId } = await render(<BusquedaScreen />);
    await fireEvent.changeText(getByTestId("busqueda-campo"), "juana");
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    jest.useRealTimers();

    await waitFor(() => expect(getByTestId("busqueda-item-cliente_cobranza-c-1")).toBeTruthy());
    await fireEvent.press(getByTestId("busqueda-item-cliente_cobranza-c-1"));
    // Entidad sin destino propio → Inicio; las conocidas llevan pestaña.
    expect(emitirNavegacion).toHaveBeenCalledWith({ tab: "inicio" });
    expect(DESTINO_POR_ENTIDAD.pedido).toEqual({ tab: "comercio", pestana: "pedidos" });
    expect(DESTINO_POR_ENTIDAD.cita).toEqual({ tab: "calendario", pestana: "semana" });
  });

  it("con menos de 2 caracteres no consulta", async () => {
    jest.useFakeTimers();
    const { getByTestId } = await render(<BusquedaScreen />);
    await fireEvent.changeText(getByTestId("busqueda-campo"), "j");
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    jest.useRealTimers();
    expect(mockGet).not.toHaveBeenCalled();
  });
});
