jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { CobranzaAdminScreen } from "./CobranzaAdminScreen";

const mockUseAdminApi = useAdminApi as jest.Mock;
const mockGet = jest.fn();
const mockPost = jest.fn();
const cliente = { get: mockGet, post: mockPost, put: jest.fn(), patch: jest.fn(), del: jest.fn() };

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

  it("muestra la auditoría del pack", async () => {
    const { getByTestId, getByText } = await render(<CobranzaAdminScreen />);
    await waitFor(() => expect(getByTestId("cobranza-auditoria")).toBeTruthy());

    await fireEvent.press(getByTestId("cobranza-auditoria"));
    await waitFor(() => expect(getByText("cuota · editar")).toBeTruthy());
  });
});
