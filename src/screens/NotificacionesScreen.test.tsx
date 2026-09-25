import { fireEvent, render } from "@testing-library/react-native";
import { NotificacionesScreen } from "./NotificacionesScreen";

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
}));

const mockDescartar = jest.fn();
const mockCargar = jest.fn();

jest.mock("../session/notificaciones-context", () => ({
  useNotificaciones: () => ({
    items: [
      {
        id: "pago-1",
        tipo: "pago",
        mensaje: "Pago registrado de Juan",
        carteraId: "1",
        carteraNombre: "Cartera Centro",
        clienteId: "1",
        monto: 100,
        fecha: "2026-09-01T00:00:00.000Z",
      },
    ],
    cargando: false,
    cargar: mockCargar,
    marcarVistas: jest.fn(),
    descartar: mockDescartar,
  }),
}));

describe("NotificacionesScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("permite descartar una notificación con la X", async () => {
    const { getByTestId } = await render(<NotificacionesScreen />);

    await fireEvent.press(getByTestId("notif-cerrar-pago-1"));

    expect(mockDescartar).toHaveBeenCalledWith("pago-1");
  });
});
