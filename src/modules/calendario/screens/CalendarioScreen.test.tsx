jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { CalendarioScreen } from "./CalendarioScreen";

const mockUseAdminApi = useAdminApi as jest.Mock;
const mockGet = jest.fn();
const cliente = { get: mockGet, post: jest.fn(), put: jest.fn(), patch: jest.fn(), del: jest.fn() };

describe("CalendarioScreen (HU-APP-11)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAdminApi.mockReturnValue(cliente);
    mockGet.mockImplementation((path: string) => {
      if (path === "/pack/calendar/week") {
        return Promise.resolve({
          start: "2026-10-05",
          days: [],
          items: [
            {
              kind: "cita",
              id: "a-1",
              title: "Demo con Juan",
              start_at: "2026-10-06T14:00:00Z",
              end_at: "2026-10-06T15:00:00Z",
              status: "scheduled",
              source: "interno",
            },
            {
              kind: "bloqueo",
              id: "b-1",
              title: "Almuerzo",
              start_at: "2026-10-06T12:00:00Z",
              end_at: "2026-10-06T13:00:00Z",
              status: "activo",
              source: "interno",
            },
          ],
        });
      }
      if (path === "/pack/calendar/types") {
        return Promise.resolve([
          { id: "t-1", name: "Demo 30 min", duration_minutes: 30, description: null, active: true },
        ]);
      }
      if (path === "/pack/calendar/blocks") {
        return Promise.resolve([
          { id: "b-1", start_at: "2026-10-06T12:00:00Z", end_at: "2026-10-06T13:00:00Z", reason: "Almuerzo" },
        ]);
      }
      return Promise.reject(new Error("no mockeado"));
    });
  });

  it("muestra la semana con citas y bloqueos ordenados", async () => {
    const { getByTestId, getByText } = await render(<CalendarioScreen />);
    await waitFor(() => expect(getByTestId("calendario-lista-semana")).toBeTruthy());
    expect(getByText("Demo con Juan")).toBeTruthy();
    expect(getByText("Almuerzo")).toBeTruthy();
  });

  it("muestra tipos y bloqueos en sus pestañas", async () => {
    const { getByTestId, getByText } = await render(<CalendarioScreen />);
    await waitFor(() => expect(getByTestId("calendario-lista-semana")).toBeTruthy());

    await fireEvent.press(getByTestId("calendario-tipos"));
    expect(getByText("Demo 30 min")).toBeTruthy();

    await fireEvent.press(getByTestId("calendario-bloqueos"));
    expect(getByTestId("calendario-lista-bloqueos")).toBeTruthy();
  });

  it("con error de red avisa", async () => {
    mockGet.mockRejectedValue(new Error("red"));
    const { getByTestId } = await render(<CalendarioScreen />);
    await waitFor(() => expect(getByTestId("calendario-error")).toBeTruthy());
  });
});
