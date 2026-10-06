jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { ComercioScreen } from "./ComercioScreen";

const mockUseAdminApi = useAdminApi as jest.Mock;
const mockGet = jest.fn();
const mockPost = jest.fn();
const cliente = { get: mockGet, post: mockPost, put: jest.fn(), patch: jest.fn(), del: jest.fn() };

describe("ComercioScreen (HU-APP-10)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAdminApi.mockReturnValue(cliente);
    mockPost.mockResolvedValue(undefined);
    mockGet.mockImplementation((path: string) => {
      if (path === "/pack/commerce/orders") {
        return Promise.resolve([
          {
            id: "o-1",
            public_order_number: "OC-0001",
            total: 150,
            status: "abierto",
            payment_status: "pendiente",
            payment_method: "efectivo_contraentrega",
            delivery_method: "domicilio",
            delivery_full_name: "Juanita",
            delivery_address: null,
            created_at: "2026-10-06T00:00:00Z",
            line_items: [],
          },
        ]);
      }
      if (path === "/pack/commerce/products") {
        return Promise.resolve([
          { id: "p-1", name: "Chaqueta", description: "", category_id: null, category: null, price: 120, variants: [] },
        ]);
      }
      if (path === "/pack/commerce/promotions") {
        return Promise.resolve([
          { id: "pm-1", type: "temporada", rules: {}, active: true, valid_from: null, valid_to: null, category_id: null, product_id: null, variant_id: null, include_child_categories: true, eligible_segments: null, created_at: "2026-10-01T00:00:00Z" },
        ]);
      }
      if (path === "/pack/commerce/categories") {
        return Promise.resolve([{ id: "c-1", name: "Ropa", parent_id: null, sort_order: 0, active: true }]);
      }
      return Promise.reject(new Error("no mockeado"));
    });
  });

  it("lista pedidos y cambia el estado con confirmación", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, botones) => {
      const despachar = botones?.find((b) => b.text === "despachado");
      despachar?.onPress?.();
    });

    const { getByTestId, getByText } = await render(<ComercioScreen />);
    await waitFor(() => expect(getByText("OC-0001 · $150")).toBeTruthy());

    await fireEvent.press(getByTestId("pedido-OC-0001"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/pack/commerce/orders/o-1/status", {
        status: "despachado",
      }),
    );
    alertSpy.mockRestore();
  });

  it("muestra productos y promociones en sus pestañas", async () => {
    const { getByTestId, getByText } = await render(<ComercioScreen />);
    await waitFor(() => expect(getByTestId("comercio-lista-pedidos")).toBeTruthy());

    await fireEvent.press(getByTestId("comercio-productos"));
    expect(getByText("Chaqueta")).toBeTruthy();

    await fireEvent.press(getByTestId("comercio-promociones"));
    expect(getByText("temporada")).toBeTruthy();
    expect(getByText("activa")).toBeTruthy();
  });

  it("alternar promoción llama al toggle", async () => {
    const { getByTestId, getByText } = await render(<ComercioScreen />);
    await waitFor(() => expect(getByTestId("comercio-lista-pedidos")).toBeTruthy());

    await fireEvent.press(getByTestId("comercio-promociones"));
    await fireEvent.press(getByText("temporada"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/pack/commerce/promotions/pm-1/toggle"),
    );
  });
});
