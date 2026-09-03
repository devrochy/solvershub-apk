import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { RutasScreen } from "./RutasScreen";
import { OfflineContext, OfflineValue } from "../offline/offline-context";
import { SessionContext, SessionValue } from "../session/session-context";
import { RutaActivaContext } from "../session/ruta-activa-context";

const ruta = {
  id: 6,
  nombre: "Ruta Centro",
  estatus: "activo",
  tipoInteres: 20,
  numCuotas: 8,
  config: { rutaId: 6, periodoLiquidacion: "diario", cupoDefault: 1500 },
  permisos: [
    { permiso: "ver_cartera", habilitado: true },
    { permiso: "registrar_pago", habilitado: true },
  ],
};

async function renderConRutas(
  api: Partial<SessionValue["api"]>,
  navigate: jest.Mock = jest.fn(),
  setRutaActiva: jest.Mock = jest.fn(),
  offline: OfflineValue = {
    isOnline: true,
    sinSubir: 0,
    errorSync: null,
    encolar: jest.fn(),
    encolarSiNoExiste: jest.fn().mockResolvedValue(true),
    sincronizar: jest.fn(),
  },
) {
  const valor: SessionValue = {
    cobrador: { id: 20, usuario: "cobrador1", nombre: "Carlos", apellido: "López", rol: "cobrador" },
    loading: false,
    api: api as SessionValue["api"],
    login: jest.fn(),
    logout: jest.fn(),
  };
  const navigation = { navigate } as never;
  return render(
    <OfflineContext.Provider value={offline}>
      <SessionContext.Provider value={valor}>
        <RutaActivaContext.Provider value={{ rutaActiva: null, setRutaActiva }}>
          <RutasScreen navigation={navigation} />
        </RutaActivaContext.Provider>
      </SessionContext.Provider>
    </OfflineContext.Provider>,
  );
}

describe("RutasScreen", () => {
  it("muestra el nombre de la APK en el encabezado", async () => {
    const { getByText } = await renderConRutas({
      misRutas: jest.fn().mockResolvedValue([]),
    });

    await waitFor(() => expect(getByText("CobraIA")).toBeTruthy());
  });

  it("muestra las rutas del cobrador, fija la ruta activa y navega al tab Clientes", async () => {
    const navigate = jest.fn();
    const setRutaActiva = jest.fn();
    const { getByTestId, getByText } = await renderConRutas(
      { misRutas: jest.fn().mockResolvedValue([ruta]) },
      navigate,
      setRutaActiva,
    );

    await waitFor(() => expect(getByText("Ruta Centro")).toBeTruthy());

    await fireEvent.press(getByTestId("ruta-6"));

    await waitFor(() =>
      expect(setRutaActiva).toHaveBeenCalledWith({
        rutaId: 6,
        rutaNombre: "Ruta Centro",
        tipoInteres: 20,
        numCuotas: 8,
        config: { rutaId: 6, periodoLiquidacion: "diario", cupoDefault: 1500 },
      }),
    );
    expect(navigate).toHaveBeenCalledWith("Clientes");
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
      jest.fn(),
      { isOnline: false, sinSubir: 2, errorSync: null, encolar: jest.fn(), encolarSiNoExiste: jest.fn().mockResolvedValue(true), sincronizar: jest.fn() },
    );

    await waitFor(() => expect(getByTestId("badge-sin-subir")).toBeTruthy());
  });

  it("muestra el aviso de error de sincronización (device key inválida)", async () => {
    const { getByTestId, getByText } = await renderConRutas(
      { misRutas: jest.fn().mockResolvedValue([ruta]) },
      jest.fn(),
      jest.fn(),
      {
        isOnline: true,
        sinSubir: 1,
        errorSync: "No se pudo sincronizar. Verifica la conexión y la clave del dispositivo.",
        encolar: jest.fn(),
        encolarSiNoExiste: jest.fn().mockResolvedValue(true),
        sincronizar: jest.fn(),
      },
    );

    await waitFor(() => expect(getByTestId("aviso-error-sync")).toBeTruthy());
    expect(
      getByText(/No se pudo sincronizar/),
    ).toBeTruthy();
  });

  it("no muestra el aviso de error de sync cuando no hay error", async () => {
    const { queryByTestId } = await renderConRutas({
      misRutas: jest.fn().mockResolvedValue([ruta]),
    });

    await waitFor(() => expect(queryByTestId("ruta-6")).toBeTruthy());
    expect(queryByTestId("aviso-error-sync")).toBeNull();
  });
});