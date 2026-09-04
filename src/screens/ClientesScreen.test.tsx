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
  return render(
    <PantallaActivaProvider>
      <OfflineContext.Provider value={offline}>
      <SessionContext.Provider value={valor}>
        <RutaActivaContext.Provider
          value={{ rutaActiva, setRutaActiva: jest.fn() }}
        >
          <ContenidoTab>
            <ClientesScreen />
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

  it("'+ Cliente' abre el modal de nuevo cliente con el formulario", async () => {
    const { getByTestId, getByText } = await renderConRutaActiva({
      listarClientesDeRuta: jest.fn().mockResolvedValue([cliente]),
    });

    await waitFor(() => expect(getByTestId("btn-nuevo-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-nuevo-cliente"));

    expect(getByText("Nuevo cliente")).toBeTruthy();
    expect(getByTestId("cliente-nombre")).toBeTruthy();
    expect(getByTestId("cliente-apellido")).toBeTruthy();
    expect(getByTestId("cliente-negocio")).toBeTruthy();
    expect(getByTestId("cliente-telefono-numero")).toBeTruthy();
    expect(getByTestId("cliente-tope")).toBeTruthy();
    expect(getByTestId("mapa-pin-cliente")).toBeTruthy();
  });

  it("guardar crea el cliente vía crearCliente y refresca la lista", async () => {
    const crearCliente = jest.fn().mockResolvedValue({ id: 50 });
    const listarClientesDeRuta = jest
      .fn()
      .mockResolvedValueOnce([cliente])
      .mockResolvedValueOnce([cliente, { ...cliente, id: 50, nombre: "Ana", apellido: "Ríos" }]);
    const { getByTestId, getByText } = await renderConRutaActiva({
      listarClientesDeRuta,
      crearCliente,
    });

    await waitFor(() => expect(getByTestId("btn-nuevo-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-nuevo-cliente"));

    await fireEvent.changeText(getByTestId("cliente-nombre"), "Ana");
    await fireEvent.changeText(getByTestId("cliente-apellido"), "Ríos");
    await fireEvent.changeText(getByTestId("cliente-negocio"), "Tienda");
    await fireEvent.changeText(getByTestId("cliente-telefono-numero"), "7000111");
    await fireEvent.changeText(getByTestId("cliente-tope"), "1500");
    await fireEvent.changeText(getByTestId("cliente-latitud"), "-17.79");
    await fireEvent.changeText(getByTestId("cliente-longitud"), "-63.19");

    await fireEvent.press(getByTestId("cliente-guardar"));

    await waitFor(() =>
      expect(crearCliente).toHaveBeenCalledWith(
        6,
        {
          nombre: "Ana",
          apellido: "Ríos",
          negocio: "Tienda",
          telefonoWhatsapp: "+5917000111",
          latitud: -17.79,
          longitud: -63.19,
          topeMaximoDeuda: 1500,
        },
        [],
      ),
    );
    await waitFor(() => expect(getByText("Ana Ríos")).toBeTruthy());
  });

  it("el botón '+ Cliente' solo se muestra con ruta activa", async () => {
    const { queryByTestId } = await renderConRutaActiva(
      { listarClientesDeRuta: jest.fn() },
      null,
    );

    expect(queryByTestId("btn-nuevo-cliente")).toBeNull();
  });

  it("NO envía coordenadas 0,0 si el usuario deja vacío el campo latitud/longitud", async () => {
    const crearCliente = jest.fn().mockResolvedValue({ id: 50 });
    const { getByTestId, getByText } = await renderConRutaActiva({
      listarClientesDeRuta: jest.fn().mockResolvedValue([cliente]),
      crearCliente,
    });

    await waitFor(() => expect(getByTestId("btn-nuevo-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-nuevo-cliente"));

    await fireEvent.changeText(getByTestId("cliente-nombre"), "Ana");
    await fireEvent.changeText(getByTestId("cliente-apellido"), "Ríos");
    await fireEvent.changeText(getByTestId("cliente-telefono-numero"), "7000111");
    await fireEvent.changeText(getByTestId("cliente-latitud"), "");
    await fireEvent.changeText(getByTestId("cliente-longitud"), "");

    await fireEvent.press(getByTestId("cliente-guardar"));

    expect(crearCliente).not.toHaveBeenCalled();
    expect(getByText("Las coordenadas no son válidas.")).toBeTruthy();
  });

  it("NO envía un tope de deuda NaN ni negativo", async () => {
    const crearCliente = jest.fn().mockResolvedValue({ id: 50 });
    const { getByTestId, getByText } = await renderConRutaActiva({
      listarClientesDeRuta: jest.fn().mockResolvedValue([cliente]),
      crearCliente,
    });

    await waitFor(() => expect(getByTestId("btn-nuevo-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-nuevo-cliente"));

    await fireEvent.changeText(getByTestId("cliente-nombre"), "Ana");
    await fireEvent.changeText(getByTestId("cliente-apellido"), "Ríos");
    await fireEvent.changeText(getByTestId("cliente-telefono-numero"), "7000111");
    await fireEvent.changeText(getByTestId("cliente-tope"), "-100");

    await fireEvent.press(getByTestId("cliente-guardar"));

    expect(crearCliente).not.toHaveBeenCalled();
    expect(getByText("El tope de deuda debe ser un número válido.")).toBeTruthy();
  });

  it("pre-llena el tope máximo con el cupoDefault de la ruta activa", async () => {
    const crearCliente = jest.fn().mockResolvedValue({ id: 50 });
    const { getByTestId } = await renderConRutaActiva(
      {
        listarClientesDeRuta: jest.fn().mockResolvedValue([cliente]),
        crearCliente,
      },
      {
        rutaId: 6,
        rutaNombre: "Ruta Centro",
        tipoInteres: 20,
        numCuotas: 8,
        config: { cupoDefault: 1500 } as never,
      },
    );

    await waitFor(() => expect(getByTestId("btn-nuevo-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-nuevo-cliente"));

    expect(getByTestId("cliente-tope").props.value).toBe("1500");
  });

  it("muestra el avatar editable y los botones de documento frente/reverso en el modal", async () => {
    const { getByTestId, getByText } = await renderConRutaActiva({
      listarClientesDeRuta: jest.fn().mockResolvedValue([cliente]),
    });

    await waitFor(() => expect(getByTestId("btn-nuevo-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-nuevo-cliente"));

    expect(getByTestId("cliente-avatar-btn")).toBeTruthy();
    expect(getByTestId("cliente-doc-frente")).toBeTruthy();
    expect(getByTestId("cliente-doc-reverso")).toBeTruthy();
    expect(getByText("Documento")).toBeTruthy();
  });

  it("muestra el check verde de éxito tras crear el cliente", async () => {
    const crearCliente = jest.fn().mockResolvedValue({ id: 50 });
    const listarClientesDeRuta = jest
      .fn()
      .mockResolvedValueOnce([cliente])
      .mockResolvedValueOnce([cliente, { ...cliente, id: 50 }]);
    const { getByTestId } = await renderConRutaActiva({
      listarClientesDeRuta,
      crearCliente,
    });

    await waitFor(() => expect(getByTestId("btn-nuevo-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-nuevo-cliente"));

    await fireEvent.changeText(getByTestId("cliente-nombre"), "Ana");
    await fireEvent.changeText(getByTestId("cliente-apellido"), "Ríos");
    await fireEvent.changeText(getByTestId("cliente-telefono-numero"), "7000111");
    await fireEvent.press(getByTestId("cliente-guardar"));

    await waitFor(() => expect(getByTestId("cliente-creado-ok")).toBeTruthy());
  });

  it("busca por dirección y mueve el marker (geocodeAsync)", async () => {
    const Location = require("expo-location");
    (Location.geocodeAsync as jest.Mock).mockResolvedValue([
      { latitude: -17.4, longitude: -66.1 },
    ]);
    const { getByTestId } = await renderConRutaActiva({
      listarClientesDeRuta: jest.fn().mockResolvedValue([cliente]),
    });

    await waitFor(() => expect(getByTestId("btn-nuevo-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-nuevo-cliente"));

    await fireEvent.changeText(getByTestId("cliente-direccion"), "Av. Pando, Cochabamba");
    await fireEvent.press(getByTestId("cliente-buscar"));

    await waitFor(() =>
      expect(Location.geocodeAsync).toHaveBeenCalledWith("Av. Pando, Cochabamba"),
    );
    expect(getByTestId("cliente-latitud").props.value).toBe("-17.4");
    expect(getByTestId("cliente-longitud").props.value).toBe("-66.1");
  });

  it("ofrece cámara y librería para la foto del avatar en el nuevo cliente", async () => {
    const { getByTestId } = await renderConRutaActiva({
      listarClientesDeRuta: jest.fn().mockResolvedValue([cliente]),
    });

    await waitFor(() => expect(getByTestId("btn-nuevo-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-nuevo-cliente"));

    expect(getByTestId("cliente-avatar-libreria")).toBeTruthy();
    expect(getByTestId("cliente-avatar-camara")).toBeTruthy();
  });

  it("ofrece cámara para el documento frente y reverso", async () => {
    const { getByTestId } = await renderConRutaActiva({
      listarClientesDeRuta: jest.fn().mockResolvedValue([cliente]),
    });

    await waitFor(() => expect(getByTestId("btn-nuevo-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-nuevo-cliente"));

    expect(getByTestId("cliente-doc-frente-camara")).toBeTruthy();
    expect(getByTestId("cliente-doc-reverso-camara")).toBeTruthy();
  });

  it("avisa que la ruta exige foto y documento antes de crear si faltan", async () => {
    const crearCliente = jest.fn().mockResolvedValue({ id: 50 });
    const { getByTestId, getByText } = await renderConRutaActiva(
      {
        listarClientesDeRuta: jest.fn().mockResolvedValue([cliente]),
        crearCliente,
      },
      {
        rutaId: 6,
        rutaNombre: "Ruta Centro",
        tipoInteres: 20,
        numCuotas: 8,
        config: {
          reconocimientoFacialActivo: true,
          registroDocumentoCliente: true,
        } as never,
      },
    );

    await waitFor(() => expect(getByTestId("btn-nuevo-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-nuevo-cliente"));

    await fireEvent.changeText(getByTestId("cliente-nombre"), "Ana");
    await fireEvent.changeText(getByTestId("cliente-apellido"), "Ríos");
    await fireEvent.changeText(getByTestId("cliente-telefono-numero"), "7000111");
    await fireEvent.press(getByTestId("cliente-guardar"));

    expect(crearCliente).not.toHaveBeenCalled();
    expect(getByText("Esta ruta exige la foto del cliente (foto facial).")).toBeTruthy();
  });
});