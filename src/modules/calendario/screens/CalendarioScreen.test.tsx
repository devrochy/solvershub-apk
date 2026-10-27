jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));
jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => ({
    sesion: {
      token: "t",
      tenantId: "08ccdc19-f2ef-4eeb-b9a9-65c898c34fd1",
      role: "owner",
      permissions: {
        "pack_calendar:citas": "write",
        "pack_calendar:configuracion": "write",
        connections: "write",
      },
    },
  }),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { aUtcDesdeZona, hoyEnZona } from "../domain/zona";
import { CalendarioScreen } from "./CalendarioScreen";

const mockUseAdminApi = useAdminApi as jest.Mock;
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockPut = jest.fn();
const mockDel = jest.fn();
const cliente = { get: mockGet, post: mockPost, put: mockPut, patch: mockPatch, del: mockDel };

function hoyIso(hora: number): string {
  const hoy = hoyEnZona("America/Bogota");
  const [anio, mes, dia] = hoy.split("-").map(Number);
  return aUtcDesdeZona(anio, mes, dia, hora, 0, "America/Bogota");
}

const agenda1 = {
  id: "ag-1",
  name: "Principal",
  description: "",
  aliases: [],
  color: "cat-1",
  timezone: "America/Bogota",
  is_default: true,
  active: true,
  sort_order: 1,
  source: "interno",
  connected: true,
  account_email: "",
};

const agenda2 = {
  ...agenda1,
  id: "ag-2",
  name: "Sede Norte",
  color: "cat-2",
  is_default: false,
  sort_order: 2,
};

const cita = {
  id: "appt-1",
  title: "Demo",
  start: hoyIso(10),
  end: hoyIso(11),
  kind: "appointment",
  status: "scheduled",
  source: "local",
  color: "#198754",
  can_cancel: true,
  attendee_email: "",
  notes: "",
  appointment_type_id: "t-1",
  tipo_color: "cat-2",
  tipo_codigo: "DEM",
  calendar_id: "ag-1",
  calendar_color: "cat-1",
};

const bloqueo = {
  ...cita,
  id: "block-1",
  title: "Almuerzo",
  start: hoyIso(12),
  end: hoyIso(13),
  kind: "block",
  status: "blocked",
  tipo_codigo: "",
  appointment_type_id: "",
};

function eventos(multi = true) {
  return {
    events: [cita, bloqueo],
    tipos: [{ id: "t-1", name: "Demo", color: "cat-2", codigo: "DEM", duration_minutes: 30 }],
    calendars: [agenda1, agenda2],
    multi_activo: multi,
    timezone: "America/Bogota",
  };
}

describe("CalendarioScreen (HU-CAL-08)", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockUseAdminApi.mockReturnValue(cliente);
    mockGet.mockImplementation((path: string) => {
      if (path === "/pack/calendar/events") return Promise.resolve(eventos());
      if (path === "/pack/calendar/calendars") {
        return Promise.resolve({
          calendars: [agenda1, agenda2],
          multi_activo: true,
          multi_agenda_modo: "cliente_elige",
        });
      }
      if (path === "/pack/calendar/types") {
        return Promise.resolve([
          {
            id: "t-1",
            name: "Demo",
            duration_minutes: 30,
            description: "",
            active: true,
            color: "cat-2",
            codigo: "DEM",
          },
        ]);
      }
      if (path === "/admin/plugins/pack_calendar/config") {
        return Promise.resolve({
          plugin_id: "pack_calendar",
          values: { business_hours: '{"mon":"08:00-18:00"}' },
        });
      }
      if (path === "/admin/collaborators") return Promise.resolve([]);
      return Promise.reject(new Error(`no mockeado: ${path}`));
    });
    mockPost.mockResolvedValue({});
    mockPatch.mockResolvedValue({ notification: null });
    mockPut.mockResolvedValue({ plugin_id: "pack_calendar", values: {} });
    mockDel.mockResolvedValue(undefined);
  });

  it("muestra la semana y el día con citas y bloqueos", async () => {
    const { getByTestId, getByText } = await render(<CalendarioScreen />);
    await waitFor(() => expect(getByTestId("agenda-linea")).toBeTruthy());
    expect(getByText("DEM · Demo")).toBeTruthy();
    expect(getByText(/Bloqueo · Almuerzo/)).toBeTruthy();
    expect(getByTestId("agenda-semana")).toBeTruthy();
  });

  it("con 2 agendas muestra los chips y puede ocultar una", async () => {
    const { getByTestId, queryByTestId } = await render(<CalendarioScreen />);
    await waitFor(() => expect(getByTestId("agenda-chip-ag-2")).toBeTruthy());
    expect(getByTestId("agenda-chip-ag-1")).toBeTruthy();
    fireEvent.press(getByTestId("agenda-chip-ag-2"));
    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith(
        "/pack/calendar/events",
        expect.objectContaining({ calendar_ids: "ag-1" }),
      ),
    );
    expect(queryByTestId("agenda-chip-ag-2")).toBeTruthy();
  });

  it("crea un bloqueo desde un hueco con la agenda elegida", async () => {
    const { getByTestId } = await render(<CalendarioScreen />);
    await waitFor(() => expect(getByTestId("agenda-hueco")).toBeTruthy());
    fireEvent.press(getByTestId("agenda-hueco"), { nativeEvent: { locationY: 120 } });
    await waitFor(() => expect(getByTestId("hoja-evento")).toBeTruthy());
    fireEvent.press(getByTestId("hoja-que-bloqueo"));
    await waitFor(() => expect(getByTestId("hoja-motivo")).toBeTruthy());
    fireEvent.changeText(getByTestId("hoja-motivo"), "Almuerzo equipo");
    await waitFor(() => expect(getByTestId("hoja-motivo").props.value).toBe("Almuerzo equipo"));
    fireEvent.press(getByTestId("hoja-evento-guardar"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        "/pack/calendar/blocks",
        expect.objectContaining({ reason: "Almuerzo equipo", calendar_id: "ag-1" }),
      ),
    );
  });

  it("crea una cita con título, tipo y agenda", async () => {
    const { getByTestId } = await render(<CalendarioScreen />);
    await waitFor(() => expect(getByTestId("agenda-hueco")).toBeTruthy());
    fireEvent.press(getByTestId("agenda-hueco"), { nativeEvent: { locationY: 120 } });
    await waitFor(() => expect(getByTestId("hoja-evento")).toBeTruthy());
    fireEvent.changeText(getByTestId("hoja-titulo"), "Asesoría");
    await waitFor(() => expect(getByTestId("hoja-titulo").props.value).toBe("Asesoría"));
    fireEvent.press(getByTestId("hoja-tipo-t-1"));
    await waitFor(() => expect(getByTestId("hoja-titulo").props.value).toBe("Asesoría"));
    fireEvent.press(getByTestId("hoja-evento-guardar"));
    await waitFor(
      () =>
        expect(mockPost).toHaveBeenCalledWith(
          "/pack/calendar/appointments",
          expect.objectContaining({ title: "Asesoría", appointment_type_id: "t-1", calendar_id: "ag-1" }),
        ),
      { timeout: 5000 },
    );
  });

  it("abre una cita y la guarda", async () => {
    const { getByTestId } = await render(<CalendarioScreen />);
    await waitFor(() => expect(getByTestId("agenda-evento-abrir-appt-1")).toBeTruthy());
    fireEvent.press(getByTestId("agenda-evento-abrir-appt-1"));
    await waitFor(() => expect(getByTestId("hoja-evento")).toBeTruthy());
    fireEvent.changeText(getByTestId("hoja-titulo"), "Demo reagendada");
    await waitFor(() => expect(getByTestId("hoja-titulo").props.value).toBe("Demo reagendada"));
    fireEvent.press(getByTestId("hoja-evento-guardar"));
    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith(
        "/pack/calendar/appointments/1",
        expect.objectContaining({ title: "Demo reagendada" }),
      ),
    );
  });

  it("abre el cajón de ajustes y navega a tipos, horario y agendas", async () => {
    const { getByTestId } = await render(<CalendarioScreen />);
    await waitFor(() => expect(getByTestId("agenda-ajustes")).toBeTruthy());
    fireEvent.press(getByTestId("agenda-ajustes"));
    await waitFor(() => expect(getByTestId("hoja-ajustes")).toBeTruthy());

    fireEvent.press(getByTestId("ajustes-tipos"));
    await waitFor(() => expect(getByTestId("ajustes-volver")).toBeTruthy());
    fireEvent.press(getByTestId("ajustes-volver"));
    await waitFor(() => expect(getByTestId("ajustes-horario")).toBeTruthy());

    fireEvent.press(getByTestId("ajustes-horario"));
    await waitFor(() => expect(getByTestId("horario-inicio-mon")).toBeTruthy());
    fireEvent.press(getByTestId("ajustes-volver"));
    await waitFor(() => expect(getByTestId("ajustes-agendas")).toBeTruthy());

    fireEvent.press(getByTestId("ajustes-agendas"));
    await waitFor(() => expect(getByTestId("agenda-multi")).toBeTruthy());
  });

  it("con error de red avisa", async () => {
    mockGet.mockRejectedValue(new Error("red"));
    const { getByTestId } = await render(<CalendarioScreen />);
    await waitFor(() => expect(getByTestId("calendario-error")).toBeTruthy());
  });
});
