import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { ClientesScreen } from "./ClientesScreen";
import { SessionContext, SessionValue } from "../session/session-context";
import { RutaActivaContext } from "../session/ruta-activa-context";
import { OfflineContext, OfflineValue } from "../offline/offline-context";
import { PantallaActivaProvider } from "../navigation/pantalla-activa-context";
import { ContenidoTab } from "../navigation/ContenidoTab";

jest.mock("../screens/ClienteScreen", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ClienteScreen: jest.fn(() => React.createElement(View, { testID: "mock-cliente" })),
  };
});

const offline: OfflineValue = {
  isOnline: true,
  sinSubir: 0,
  errorSync: null,
  encolar: jest.fn(),
  encolarSiNoExiste: jest.fn().mockResolvedValue(true),
  sincronizar: jest.fn(),
};

const cliente = {
  id: 11,
  rutaId: 6,
  nombre: "Juan",
  apellido: "Perez",
  negocio: "Tienda Central",
  telefonoWhatsapp: "+5917000111",
  latitud: -17.78,
  longitud: -63.18,
  latitudDomicilio: null,
  longitudDomicilio: null,
  topeMaximoDeuda: null,
  estatus: "activo",
  colorRiesgo: "azul",
  fotoUrl: null,
  createdAt: "2026-08-01T00:00:00.000Z",
};

async function renderConRutaActiva(
  api: Partial<SessionValue["api"]>,
  navigate: jest.Mock = jest.fn(),
  rutaActiva: {
    rutaId: number;
    rutaNombre: string;
    tipoInteres: number;
    numCuotas: number;
    config: never;
  } | null = {
    rutaId: 6,
    rutaNombre: "Ruta Centro",
    tipoInteres: 20,
    numCuotas: 8,
    config: {} as never,
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
    <PantallaActivaProvider>
      <OfflineContext.Provider value={offline}>
      <SessionContext.Provider value={valor}>
        <RutaActivaContext.Provider
          value={{ rutaActiva, setRutaActiva: jest.fn() }}
        >
          <ContenidoTab>
            <ClientesScreen navigation={navigation} />
          </ContenidoTab>
        </RutaActivaContext.Provider>
      </SessionContext.Provider>
      </OfflineContext.Provider>
    </PantallaActivaProvider>,
  );
}

describe("ClientesScreen", () => {
  it("muestra la lista de clientes de la ruta activa", async () => {
    const { getByText } = await renderConRutaActiva({
      listarClientesDeRuta: jest.fn().mockResolvedValue([cliente]),
    });

    await waitFor(() => expect(getByText("Juan Perez")).toBeTruthy());
    expect(getByText("Tienda Central")).toBeTruthy();
  });

  it("muestra avatar con iniciales si el cliente no tiene foto", async () => {
    const { getByTestId } = await renderConRutaActiva({
      listarClientesDeRuta: jest.fn().mockResolvedValue([cliente]),
    });

    await waitFor(() => expect(getByTestId("avatar-icono")).toBeTruthy());
  });

  it("navega al cliente al tocarlo (abre el detalle como pantalla activa)", async () => {
    const { getByText, getByTestId } = await renderConRutaActiva({
      listarClientesDeRuta: jest.fn().mockResolvedValue([cliente]),
    });

    await waitFor(() => expect(getByText("Juan Perez")).toBeTruthy());
    await fireEvent.press(getByText("Juan Perez"));

    // El detalle se abre como overlay (OverlayDetalle monta ClienteScreen).
    await waitFor(() => expect(getByTestId("mock-cliente")).toBeTruthy());
  });

  it("muestra mensaje si no hay ruta activa", async () => {
    const { getByText } = await renderConRutaActiva(
      { listarClientesDeRuta: jest.fn() },
      jest.fn(),
      null,
    );

    expect(getByText(/Selecciona una ruta/)).toBeTruthy();
  });

  it("muestra error y permite reintentar", async () => {
    const listar = jest
      .fn()
      .mockRejectedValueOnce(new Error("red"))
      .mockResolvedValueOnce([cliente]);
    const { getByText, getByTestId } = await renderConRutaActiva({
      listarClientesDeRuta: listar,
    });

    await waitFor(() => expect(getByText("Reintentar")).toBeTruthy());
    await fireEvent.press(getByTestId("reintentar"));

    await waitFor(() => expect(getByText("Juan Perez")).toBeTruthy());
  });
});