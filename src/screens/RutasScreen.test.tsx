import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { RutasScreen } from "./RutasScreen";
import { OfflineContext, OfflineValue } from "../offline/offline-context";
import { SessionContext, SessionValue } from "../session/session-context";

const ruta = {
  id: 6,
  nombre: "Ruta Centro",
  estatus: "activo",
  config: { rutaId: 6, periodoLiquidacion: "diario" },
  permisos: [
    { permiso: "ver_cartera", habilitado: true },
    { permiso: "registrar_pago", habilitado: true },
  ],
};

async function renderConRutas(
  api: Partial<SessionValue["api"]>,
  navigate: jest.Mock = jest.fn(),
  offline: OfflineValue = {
    isOnline: true,
    sinSubir: 0,
    encolar: jest.fn(),
    sincronizar: jest.fn(),
  },
) {
  const valor: SessionValue = {
    cobrador: { id: 20, usuario: "cobrador1", nombre: "Carlos", apellido: "López" },
    loading: false,
    api: api as SessionValue["api"],
    login: jest.fn(),
    logout: jest.fn(),
  };
  const navigation = { navigate } as never;
  return render(
    <OfflineContext.Provider value={offline}>
      <SessionContext.Provider value={valor}>
        <RutasScreen navigation={navigation} route={{ key: "rutas", name: "Rutas" }} />
      </SessionContext.Provider>
    </OfflineContext.Provider>,
  );
}

describe("RutasScreen", () => {
  it("muestra las rutas del cobrador y navega al día", async () => {
    const navigate = jest.fn();
    const { getByTestId, getByText } = await renderConRutas(
      { misRutas: jest.fn().mockResolvedValue([ruta]) },
      navigate,
    );

    await waitFor(() => expect(getByText("Ruta Centro")).toBeTruthy());

    await fireEvent.press(getByTestId("ruta-6"));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("Dia", {
        rutaId: 6,
        rutaNombre: "Ruta Centro",
      }),
    );
  });

  it("muestra el estado vacío si no hay rutas", async () => {
    const { getByText } = await renderConRutas({
      misRutas: jest.fn().mockResolvedValue([]),
    });

    await waitFor(() =>
      expect(getByText("No tienes rutas asignadas.")).toBeTruthy(),
    );
  });

  it("muestra el badge de eventos sin subir", async () => {
    const { getByTestId } = await renderConRutas(
      { misRutas: jest.fn().mockResolvedValue([ruta]) },
      jest.fn(),
      { isOnline: false, sinSubir: 2, encolar: jest.fn(), sincronizar: jest.fn() },
    );

    await waitFor(() => expect(getByTestId("badge-sin-subir")).toBeTruthy());
  });
});