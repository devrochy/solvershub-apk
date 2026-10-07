jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));
jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => ({ sesion: { token: "t", role: "master", permissions: {} }, loading: false }),
}));

import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { CobranzaAdminScreen } from "./CobranzaAdminScreen";

const mockUseAdminApi = useAdminApi as jest.Mock;
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const cliente = { get: mockGet, post: mockPost, put: mockPut, patch: jest.fn(), del: jest.fn() };

describe("CobranzaAdminScreen (HU-APP-18)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAdminApi.mockReturnValue(cliente);
    mockPost.mockResolvedValue(undefined);
    mockGet.mockImplementation((path: string) => {
      if (path === "/pack/cobranza/summary") {
        return Promise.resolve({ kpis: [{ label: "Caja actual", value: "1.200.000" }] });
      }
      if (path === "/pack/cobranza/clients") {
        return Promise.resolve([
          { id: "c-1", nombre: "Juana", apellido: "Perez", telefono: null, tipo_documento: null, numero_documento: "555", negocio: null, cartera: "Cobranza Demo", cartera_id: null, tope_maximo_deuda: null, color_riesgo: "blanco" },
        ]);
      }
      if (path === "/pack/cobranza/payments") {
        return Promise.resolve([{ id: "pg-1", cliente: "Juana Perez", valor: "100", metodo_pago: "efectivo", registrado_por: null, fecha_hora: "2026-10-06T10:00:00Z" }]);
      }
      if (path === "/pack/cobranza/promises") {
        return Promise.resolve([{ id: "pr-1", cliente: "Juana Perez", fecha_prometida: "2026-10-07", valor_prometido: "50", estado: "pendiente", tipo: null, creado_por: null }]);
      }
      if (path === "/pack/cobranza/devices") {
        return Promise.resolve({ pendientes: 1, dispositivos: [{ id: "d-1", codigo: "D1", gestor: "Gestor Demo", imei: "123", whatsapp: null, estado: "pendiente", vinculado: false }], intentos: [], eventos: [] });
      }
      if (path === "/pack/cobranza/portfolios") {
        return Promise.resolve([{ id: "car-1", nombre: "Cobranza Demo", descripcion: null, gestor: "Gestor Demo", gestor_id: null, tipo_interes: 10, num_cuotas: 4, moneda: "COP", estatus: "activo", costo_cobro: 0 }]);
      }
      if (path === "/pack/cobranza/reports") {
        return Promise.resolve({ filas: [{ cartera: "Cobranza Demo", clientes: 2, prestamos: 1, saldo: 600, vencidas: 0, cobrado: 100, caja: 1200, gastos: 0 }], liquidaciones: [] });
      }
      if (path === "/pack/cobranza/monitoring") {
        return Promise.resolve({ conversaciones: 1, escalaciones: 0, promesas_pendientes: 1, promesas_cumplidas: 0, promesas_incumplidas: 0, ultimas_promesas: [] });
      }
      if (path === "/pack/cobranza/rules") {
        return Promise.resolve({ max_dias_prorroga: 5, min_abono_pct: 10, max_reprogramaciones: 2, umbral_saldo_autonomo: 100 });
      }
      if (path === "/pack/cobranza/alerts") {
        return Promise.resolve({ total: 3, denegados: 1, items: [{ fecha: "2026-10-06T00:00:00Z", gestor: "Gestor Demo", resultado: "denegado", motivo: "dispositivo no autorizado", imei: "123", critico: true }] });
      }
      if (path === "/pack/cobranza/audit") {
        return Promise.resolve({ entidades: [], operaciones: [], filas: [{ fecha: "2026-10-06", entidad: "cuota", entidad_id: null, operacion: "editar", antes: null, despues: null, actor: null, motivo: null }] });
      }
      return Promise.reject(new Error("no mockeado"));
    });
  });

  it("muestra el resumen con los KPIs del pack", async () => {
    const { getByTestId, getByText } = await render(<CobranzaAdminScreen />);
    await waitFor(() => expect(getByText("Caja actual")).toBeTruthy());
    expect(getByText("1.200.000")).toBeTruthy();
  });

  it("lista clientes con búsqueda", async () => {
    const { getByTestId, getByText } = await render(<CobranzaAdminScreen />);
    await waitFor(() => expect(getByTestId("cobranza-clientes")).toBeTruthy());

    await fireEvent.press(getByTestId("cobranza-clientes"));
    await waitFor(() => expect(getByText("Juana Perez")).toBeTruthy());
  });

  it("cambia el estado de una promesa con confirmación", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, botones) => {
      botones?.find((b) => b.text === "cumplida")?.onPress?.();
    });

    const { getByTestId, getByText } = await render(<CobranzaAdminScreen />);
    await waitFor(() => expect(getByTestId("cobranza-promesas")).toBeTruthy());

    await fireEvent.press(getByTestId("cobranza-promesas"));
    await waitFor(() => expect(getByText("pendiente ›")).toBeTruthy());
    await fireEvent.press(getByText("pendiente ›"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/pack/cobranza/promises/pr-1/status", {
        estado: "cumplida",
      }),
    );
    alertSpy.mockRestore();
  });

  it("aprueba un dispositivo pendiente", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, botones) => {
      botones?.find((b) => b.text === "Aprobar")?.onPress?.();
    });

    const { getByTestId, getByText } = await render(<CobranzaAdminScreen />);
    await waitFor(() => expect(getByTestId("cobranza-dispositivos")).toBeTruthy());

    await fireEvent.press(getByTestId("cobranza-dispositivos"));
    await waitFor(() => expect(getByText("Gestor Demo")).toBeTruthy());
    await fireEvent.press(getByText("pendiente"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/pack/cobranza/devices/d-1/status", {
        estado: "activo",
      }),
    );
    alertSpy.mockRestore();
  });

  it("lista carteras y abre su detalle", async () => {
    const { getByTestId, getByText } = await render(<CobranzaAdminScreen />);
    await waitFor(() => expect(getByTestId("cobranza-carteras")).toBeTruthy());

    await fireEvent.press(getByTestId("cobranza-carteras"));
    await waitFor(() => expect(getByText("Cobranza Demo")).toBeTruthy());
  });

  it("muestra reportes y alertas con sus KPIs", async () => {
    const { getByTestId, getByText } = await render(<CobranzaAdminScreen />);
    await waitFor(() => expect(getByTestId("cobranza-reportes")).toBeTruthy());

    await fireEvent.press(getByTestId("cobranza-reportes"));
    await waitFor(() => expect(getByText("2 clientes · 1 préstamos · saldo $600")).toBeTruthy());

    await fireEvent.press(getByTestId("cobranza-alertas"));
    await waitFor(() => expect(getByText("3 intentos · 1 denegados")).toBeTruthy());
  });

  it("edita y guarda las reglas de negociación", async () => {
    const { getByTestId } = await render(<CobranzaAdminScreen />);
    await waitFor(() => expect(getByTestId("cobranza-reglas")).toBeTruthy());

    await fireEvent.press(getByTestId("cobranza-reglas"));
    await waitFor(() => expect(getByTestId("regla-Máx. días de prórroga")).toBeTruthy());

    await fireEvent.changeText(getByTestId("regla-Máx. días de prórroga"), "7");
    await fireEvent.press(getByTestId("reglas-guardar"));
    await waitFor(() =>
      expect(mockPut).toHaveBeenCalledWith("/pack/cobranza/rules", expect.objectContaining({ max_dias_prorroga: 7 })),
    );
  });

  it("muestra la auditoría del pack", async () => {
    const { getByTestId, getByText } = await render(<CobranzaAdminScreen />);
    await waitFor(() => expect(getByTestId("cobranza-auditoria")).toBeTruthy());

    await fireEvent.press(getByTestId("cobranza-auditoria"));
    await waitFor(() => expect(getByText("cuota · editar")).toBeTruthy());
  });
});
