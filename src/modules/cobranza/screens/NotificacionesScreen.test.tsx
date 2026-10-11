import { fireEvent, render } from "@testing-library/react-native";
import { NotificacionesScreen } from "./NotificacionesScreen";

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
}));

const mockDescartar = jest.fn();
const mockCargar = jest.fn();
let mockItems: unknown[] = [];

jest.mock("../session/notificaciones-context", () => ({
  useNotificaciones: () => ({
    items: mockItems,
    cargando: false,
    cargar: mockCargar,
    marcarVistas: jest.fn(),
    descartar: mockDescartar,
  }),
}));

const notificacion = {
  id: "pago-1",
  tipo: "pago",
  mensaje: "Pago registrado de Juan",
  carteraId: "1",
  carteraNombre: "Cartera Centro",
  clienteId: "1",
  monto: 100,
  fecha: "2026-09-01T00:00:00.000Z",
};

describe("NotificacionesScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockItems = [notificacion];
  });

  it("permite descartar una notificación con la X", async () => {
    const { getByTestId } = await render(<NotificacionesScreen />);

    await fireEvent.press(getByTestId("notif-cerrar-pago-1"));

    expect(mockDescartar).toHaveBeenCalledWith("pago-1");
  });

  it("cada notificación es una fila del kit con su descarte de 48 dp (HU-DS-10)", async () => {
    const { getByTestId, getByText } = await render(<NotificacionesScreen />);

    expect(getByText("Pago registrado de Juan")).toBeTruthy();
    expect(getByTestId("notif-cerrar-pago-1")).toHaveStyle({ minWidth: 48, minHeight: 48 });
  });

  it("sin notificaciones muestra el EmptyState con la acción Actualizar (HU-DS-10)", async () => {
    mockItems = [];
    const { getByText } = await render(<NotificacionesScreen />);
    mockCargar.mockClear();

    expect(getByText("Sin notificaciones.")).toBeTruthy();
    await fireEvent.press(getByText("Actualizar"));
    expect(mockCargar).toHaveBeenCalled();
  });
});
