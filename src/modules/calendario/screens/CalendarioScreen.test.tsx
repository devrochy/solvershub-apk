jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { CalendarioScreen } from "./CalendarioScreen";

const mockUseAdminApi = useAdminApi as jest.Mock;
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const cliente = { get: mockGet, post: mockPost, put: mockPut, patch: jest.fn(), del: jest.fn() };

describe("CalendarioScreen (HU-APP-11)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAdminApi.mockReturnValue(cliente);
    mockGet.mockImplementation((path: string) => {
      if (path === "/pack/calendar/status") {
        return Promise.resolve({
          configured: true,
          connected: false,
          account_email: null,
          connection_label: null,
          timezone: "America/Bogota",
          default_duration_minutes: 30,
        });
      }
      if (path === "/admin/plugins/pack_calendar/config") {
        return Promise.resolve({
          plugin_id: "pack_calendar",
          values: { business_hours: '{"mon":"08:00-18:00","sat":"09:00-12:00"}' },
        });
      }
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

  it("crea un tipo de cita desde el modal (HU-APP-20)", async () => {
    mockPost.mockResolvedValue(undefined);
    const { getByTestId } = await render(<CalendarioScreen />);
    await waitFor(() => expect(getByTestId("calendario-lista-semana")).toBeTruthy());

    await fireEvent.press(getByTestId("calendario-tipos"));
    await fireEvent.press(getByTestId("calendario-nuevo"));
    await fireEvent.changeText(getByTestId("modal-nombre"), "Revisión express");
    await fireEvent.changeText(getByTestId("modal-duracion"), "15");
    await fireEvent.press(getByTestId("modal-crear"));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/pack/calendar/types", { name: "Revisión express", duration_minutes: 15 }),
    );
  });

  it("crea un bloqueo desde el modal (HU-APP-20)", async () => {
    mockPost.mockResolvedValue(undefined);
    const { getByTestId, getByText } = await render(<CalendarioScreen />);
    await waitFor(() => expect(getByTestId("calendario-lista-semana")).toBeTruthy());

    await fireEvent.press(getByTestId("calendario-bloqueos"));
    await fireEvent.press(getByTestId("calendario-nuevo"));
    await fireEvent.changeText(getByTestId("modal-inicio"), "2026-10-07 12:00");
    await fireEvent.changeText(getByTestId("modal-fin"), "2026-10-07 13:00");
    await fireEvent.changeText(getByTestId("modal-nombre"), "Almuerzo equipo");
    await fireEvent.press(getByTestId("modal-crear"));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/pack/calendar/blocks", expect.objectContaining({ reason: "Almuerzo equipo" })),
    );
  });

  it("carga y guarda el horario de atención (cierre de réplica)", async () => {
    mockPut.mockResolvedValue({ plugin_id: "pack_calendar", values: { business_hours: '{"mon":"09:00-17:00"}' } });
    const { getByTestId } = await render(<CalendarioScreen />);
    await waitFor(() => expect(getByTestId("calendario-lista-semana")).toBeTruthy());

    await fireEvent.press(getByTestId("calendario-horario"));
    await waitFor(() => expect(getByTestId("horario-inicio-mon")).toBeTruthy());
    expect(getByTestId("horario-inicio-mon").props.value).toBe("08:00");

    await fireEvent.changeText(getByTestId("horario-inicio-mon"), "09:00");
    await fireEvent.changeText(getByTestId("horario-fin-mon"), "17:00");
    await fireEvent.press(getByTestId("horario-guardar"));

    await waitFor(() =>
      expect(mockPut).toHaveBeenCalledWith("/admin/plugins/pack_calendar/config", {
        values: expect.objectContaining({ business_hours: expect.stringContaining('"mon":"09:00-17:00"') }),
      }),
    );
    await waitFor(() => expect(getByTestId("horario-mensaje")).toBeTruthy());
  });


  it("muestra el estado de la conexión con Google (cierre de réplica)", async () => {
    const { getByTestId, getByText } = await render(<CalendarioScreen />);
    await waitFor(() => expect(getByTestId("calendario-lista-semana")).toBeTruthy());

    await fireEvent.press(getByTestId("calendario-conexion"));
    await waitFor(() => expect(getByTestId("conexion-tarjeta")).toBeTruthy());
    expect(getByText("Configurado pero sin conectar.")).toBeTruthy();
    expect(getByText("Conectar con Google")).toBeTruthy();
  });

});
