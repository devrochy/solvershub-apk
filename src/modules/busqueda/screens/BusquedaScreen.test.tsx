jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { BusquedaScreen } from "./BusquedaScreen";

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
