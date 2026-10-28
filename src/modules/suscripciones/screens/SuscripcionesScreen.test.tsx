jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { SuscripcionesScreen } from "./SuscripcionesScreen";

const mockUseAdminApi = useAdminApi as jest.Mock;

describe("SuscripcionesScreen (SPEC-35)", () => {
  it("muestra métricas, suscripciones y pagos", async () => {
    mockUseAdminApi.mockReturnValue({
      get: jest.fn((path: string) => {
        if (path === "/admin/datos-de-prueba/suscripciones") return Promise.reject(new Error("404"));
        if (path.startsWith("/pack/pack_subscriptions/metricas")) {
          return Promise.resolve({
            moneda: "COP",
            mrr: 120000,
            activas: 2,
            en_prueba: 0,
            pausadas: 0,
            vencidas: 1,
            altas_mes: 1,
            bajas_mes: 0,
            mora: { cargos: 1, monto: 90000 },
          });
        }
        if (path.startsWith("/pack/pack_subscriptions/suscripciones")) {
          return Promise.resolve({
            items: [
              {
                id: "s1",
                cliente: { id: "c1", nombre: "Ana", telefono: null, canal: "web" },
                plan: "Plan mensual",
                estado: "activa",
                periodicidad: "mensual",
                valor_periodo: 90000,
                moneda: "COP",
                proximo_cargo: "2026-11-28T00:00:00Z",
                deuda: 0,
                en_mora: 0,
                dias_mora: null,
              },
            ],
            total: 1,
            page: 1,
            page_size: 20,
            has_more: false,
          });
        }
        return Promise.resolve({
          items: [
            {
              id: "p1",
              suscripcion_id: "s1",
              cliente: { id: "c1", nombre: "Ana", telefono: null, canal: "web" },
              plan: "Plan mensual",
              periodo: "2026-10",
              monto: 90000,
              moneda: "COP",
              estado: "pendiente",
              fecha_vencimiento: "2026-10-30T00:00:00Z",
              dias_mora: 2,
            },
          ],
          total: 1,
          page: 1,
          page_size: 20,
          has_more: false,
        });
      }),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      del: jest.fn(),
    });

    const { getByTestId, getByText } = await render(<SuscripcionesScreen />);
    await waitFor(() => expect(getByTestId("suscripciones-resumen")).toBeTruthy());
    expect(getByText("Ingreso mensual")).toBeTruthy();

    await fireEvent.press(getByTestId("suscripciones-suscripciones"));
    await waitFor(() => expect(getByText(/Plan mensual · activa · cobra/)).toBeTruthy());

    await fireEvent.press(getByTestId("suscripciones-pagos"));
    await waitFor(() => expect(getByText(/2026-10 ·/)).toBeTruthy());
  });
});
