let mockSesion: Record<string, unknown> = {};
jest.mock("@core/session/admin-session-context", () => ({ useAdminSession: () => ({ sesion: mockSesion }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock("../catalogo", () => {
  const { CATALOGO } = jest.requireActual("../testing/fixtures");
  return { ...jest.requireActual("../catalogo"), useCatalogoFeedback: () => ({ estado: "listo", catalogo: CATALOGO }) };
});
jest.mock("../api", () => ({ ...jest.requireActual("../api"), listarReportes: jest.fn(), leerReporte: jest.fn() }));

import { fireEvent, render, screen } from "@testing-library/react-native";
import { leerReporte, listarReportes } from "../api";
import { reporte, resumen } from "../testing/fixtures";
import { MisReportesScreen } from "./MisReportesScreen";
import { ReporteDetalleScreen } from "./ReporteDetalleScreen";

const listarMock = listarReportes as jest.MockedFunction<typeof listarReportes>;
const leerMock = leerReporte as jest.MockedFunction<typeof leerReporte>;
const BASE = { token: "t", adminId: "a-1", email: "a@x.test", role: "admin", tenantId: "t-1", tenantName: "N", permissions: {} };

beforeEach(() => {
  listarMock.mockReset();
  leerMock.mockReset();
});

describe("MisReportesScreen (HU-FB-07)", () => {
  it("lista estado, tipo, área, fecha, créditos y la etiqueta «Duplicado»", async () => {
    mockSesion = { ...BASE, tenantRole: "colaborador" };
    listarMock.mockResolvedValue({
      items: [
        resumen({ id: "r-1", estado: "aprobado", creditos_otorgados: 3000 }),
        resumen({ id: "r-2", estado: "rechazado", motivo_codigo: "duplicado" }),
      ],
      next_cursor: null,
    });
    const onAbrir = jest.fn();
    await render(<MisReportesScreen onBack={jest.fn()} onAbrir={onAbrir} onNuevo={jest.fn()} />);
    expect(await screen.findByText("Aprobado · 3.000 créditos de regalo")).toBeTruthy();
    expect(screen.getByTestId("reporte-r-2-duplicado")).toBeTruthy();
    expect(screen.getAllByText(/Error · Agenda · /).length).toBe(2);
    expect(screen.queryByTestId("reportes-alcance-negocio")).toBeNull();
    expect(listarMock).toHaveBeenCalledWith(expect.anything(), { alcance: "mios", estado: null });
    await fireEvent.press(screen.getByTestId("reporte-r-1"));
    expect(onAbrir).toHaveBeenCalledWith("r-1");
  });

  it("el owner puede ver los del negocio", async () => {
    mockSesion = { ...BASE, tenantRole: "owner" };
    listarMock.mockResolvedValue({ items: [], next_cursor: null });
    await render(<MisReportesScreen onBack={jest.fn()} onAbrir={jest.fn()} onNuevo={jest.fn()} />);
    await screen.findByTestId("mis-reportes-vacio");
    await fireEvent.press(screen.getByTestId("reportes-alcance-negocio"));
    await screen.findByTestId("mis-reportes-vacio");
    expect(listarMock).toHaveBeenLastCalledWith(expect.anything(), { alcance: "negocio", estado: null });
  });
});

describe("ReporteDetalleScreen (HU-FB-07)", () => {
  it("muestra el motivo de rechazo, «Duplicado» y las capturas por URL firmada", async () => {
    mockSesion = BASE;
    leerMock.mockResolvedValue(
      reporte({
        estado: "rechazado",
        motivo_codigo: "duplicado",
        motivo: "Ya lo estamos arreglando.",
        adjuntos: [
          { id: "f-1", mimetype: "image/jpeg", bytes: 10, nombre_original: "c.jpg", url: "https://s3.test/firmada", url_expira_en: "2026-11-27T15:10:00Z" },
        ],
      }),
    );
    await render(<ReporteDetalleScreen id="r-1" onBack={jest.fn()} />);
    expect(await screen.findByText("Ya lo estamos arreglando.")).toBeTruthy();
    expect(screen.getByText("Ya estaba reportado")).toBeTruthy();
    expect(screen.getByTestId("reporte-detalle-duplicado")).toBeTruthy();
    expect(screen.getByTestId("reporte-detalle-imagen-0").props.source).toEqual({ uri: "https://s3.test/firmada" });
  });

  it("un 404 dice que no existe o no es suyo", async () => {
    mockSesion = BASE;
    const { AdminApiError } = jest.requireActual("@core/api/admin");
    leerMock.mockRejectedValue(new AdminApiError(404, "not_found", "No"));
    await render(<ReporteDetalleScreen id="r-x" onBack={jest.fn()} />);
    expect(await screen.findByText("Reporte no encontrado")).toBeTruthy();
  });
});
