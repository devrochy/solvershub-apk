import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { shColor } from "../theme/tokens";
import { Linking } from "react-native";
import { ClientesScreen } from "./ClientesScreen";
import { ApiError } from "../api/client";
import { SessionContext, SessionValue } from "../session/session-context";
import { CarteraActivaContext } from "../session/cartera-activa-context";
import { OfflineContext, OfflineValue } from "../offline/offline-context";
import { PantallaActivaProvider } from "../navigation/pantalla-activa-context";
import { OverlaysActivos } from "../navigation/OverlaysActivos";
import { TrayectosOverlayProvider } from "../navigation/trayectos-overlay-context";
import type { FiltroClientes } from "../domain/filtro-clientes";

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
  ultimaSincronizacion: null,
  versionRecarga: 0,
  eventosError: [],
  reintentarEvento: jest.fn(),
  descartarEvento: jest.fn(),
  sincronizarGeneral: jest.fn().mockResolvedValue(undefined),
  encolar: jest.fn(),
  encolarSiNoExiste: jest.fn().mockResolvedValue(true),
  sincronizar: jest.fn(),
};

const cliente = {
  id: "11",
  carteraId: "6",
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
  numPrestamos: 1,
  diasMora: 0,
  createdAt: "2026-08-01T00:00:00.000Z",
};

async function renderConCarteraActiva(
  api: Partial<SessionValue["api"]>,
  carteraActiva: {
    carteraId: string;
    carteraNombre: string;
    tipoInteres: number;
    numCuotas: number;
    config: never;
  } | null = {
    carteraId: "6",
    carteraNombre: "Cartera Centro",
    tipoInteres: 20,
    numCuotas: 8,
    config: {} as never,
  },
  filtro: FiltroClientes = "todos",
) {
  const valor: SessionValue = {
    gestor: { id: "20", usuario: "gestor1", nombre: "Carlos", apellido: "López", rol: "gestor" },
    loading: false,
    api: api as SessionValue["api"],
    login: jest.fn(),
    logout: jest.fn(),
    actualizarPerfil: jest.fn(),
    requiereVinculacion: false,
    marcarDispositivoVinculado: jest.fn(),
  };
  return render(
    <PantallaActivaProvider>
      <TrayectosOverlayProvider>
        <OfflineContext.Provider value={offline}>
          <SessionContext.Provider value={valor}>
            <CarteraActivaContext.Provider
              value={{ carteraActiva, setCarteraActiva: jest.fn() }}
            >
              <ClientesScreen filtro={filtro} onFiltroChange={jest.fn()} />
              <OverlaysActivos />
            </CarteraActivaContext.Provider>
          </SessionContext.Provider>
        </OfflineContext.Provider>
      </TrayectosOverlayProvider>
    </PantallaActivaProvider>,
  );
}

describe("ClientesScreen", () => {
  it("muestra la lista de clientes de la cartera activa", async () => {
    const { getByText } = await renderConCarteraActiva({
      listarClientesDeCartera: jest.fn().mockResolvedValue([cliente]),
    });

    await waitFor(() => expect(getByText("Juan Perez")).toBeTruthy());
    expect(getByText("Tienda Central")).toBeTruthy();
  });

  it("muestra el breadcrumb Inicio / Clientes", async () => {
    const { getByTestId } = await renderConCarteraActiva({
      listarClientesDeCartera: jest.fn().mockResolvedValue([cliente]),
    });

    await waitFor(() => expect(getByTestId("breadcrumb")).toBeTruthy());
    expect(getByTestId("breadcrumb-inicio")).toBeTruthy();
    expect(getByTestId("breadcrumb-clientes")).toBeTruthy();
  });

  it("colorea barra y borde de la tarjeta según el estado (al día = verde)", async () => {
    const { getByTestId } = await renderConCarteraActiva({
      listarClientesDeCartera: jest
        .fn()
        .mockResolvedValue([{ ...cliente, numPrestamos: 1, diasMora: 0 }]),
    });

    await waitFor(() => expect(getByTestId("cliente-11")).toBeTruthy());
    expect(getByTestId("cliente-acento-11")).toHaveStyle({ backgroundColor: shColor.success });
    expect(getByTestId("cliente-11")).toHaveStyle({ borderColor: shColor.success });
  });

  it("colorea en mora en rojo (barra y borde)", async () => {
    const { getByTestId } = await renderConCarteraActiva({
      listarClientesDeCartera: jest
        .fn()
        .mockResolvedValue([{ ...cliente, id: 21, numPrestamos: 2, diasMora: 5 }]),
    });

    await waitFor(() => expect(getByTestId("cliente-acento-21")).toBeTruthy());
    expect(getByTestId("cliente-acento-21")).toHaveStyle({ backgroundColor: shColor.danger });
    expect(getByTestId("cliente-21")).toHaveStyle({ borderColor: shColor.danger });
  });

  it("colorea sin préstamos en gris (barra y borde)", async () => {
    const { getByTestId } = await renderConCarteraActiva({
      listarClientesDeCartera: jest
        .fn()
        .mockResolvedValue([{ ...cliente, id: 22, numPrestamos: 0, diasMora: 0 }]),
    });

    await waitFor(() => expect(getByTestId("cliente-acento-22")).toBeTruthy());
    expect(getByTestId("cliente-acento-22")).toHaveStyle({ backgroundColor: shColor.slate["400"] });
    expect(getByTestId("cliente-22")).toHaveStyle({ borderColor: shColor.slate["400"] });
  });

  it("muestra avatar con iniciales si el cliente no tiene foto", async () => {
    const { getAllByTestId } = await renderConCarteraActiva({
      listarClientesDeCartera: jest.fn().mockResolvedValue([cliente]),
    });

    await waitFor(() => expect(getAllByTestId("avatar-icono").length).toBeGreaterThan(0));
  });

  it("la tarjeta tiene botones de llamar y mensaje", async () => {
    const openSpy = jest.spyOn(Linking, "openURL").mockResolvedValue(true as never);
    const { getByTestId } = await renderConCarteraActiva({
      listarClientesDeCartera: jest.fn().mockResolvedValue([cliente]),
    });

    await waitFor(() => expect(getByTestId("cliente-llamar-11")).toBeTruthy());
    await fireEvent.press(getByTestId("cliente-llamar-11"));
    expect(openSpy).toHaveBeenCalledWith("tel:+5917000111");

    await fireEvent.press(getByTestId("cliente-mensaje-11"));
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining("wa.me/5917000111"));

    openSpy.mockRestore();
  });

  it("navega al cliente al tocarlo (abre el detalle como pantalla activa)", async () => {
    const { getByText, getByTestId } = await renderConCarteraActiva({
      listarClientesDeCartera: jest.fn().mockResolvedValue([cliente]),
    });

    await waitFor(() => expect(getByText("Juan Perez")).toBeTruthy());
    await fireEvent.press(getByText("Juan Perez"));

    // El detalle se abre como overlay (OverlayDetalle monta ClienteScreen).
    await waitFor(() => expect(getByTestId("mock-cliente")).toBeTruthy());
  });

  it("muestra mensaje si no hay cartera activa", async () => {
    const { getByText } = await renderConCarteraActiva(
      { listarClientesDeCartera: jest.fn() },
      null,
    );

    expect(getByText(/Selecciona una cartera/)).toBeTruthy();
  });

  it("muestra error y permite reintentar", async () => {
    const listar = jest
      .fn()
      .mockRejectedValueOnce(new Error("red"))
      .mockResolvedValueOnce([cliente]);
    const { getByText, getByTestId } = await renderConCarteraActiva({
      listarClientesDeCartera: listar,
    });

    await waitFor(() => expect(getByText("Reintentar")).toBeTruthy());
    await fireEvent.press(getByTestId("reintentar"));

    await waitFor(() => expect(getByText("Juan Perez")).toBeTruthy());
  });

  it("no muestra '+ Cliente' en el header: el alta es un FAB", async () => {
    const { getByTestId, queryByText, getByLabelText } = await renderConCarteraActiva({
      listarClientesDeCartera: jest.fn().mockResolvedValue([cliente]),
    });

    await waitFor(() => expect(getByTestId("btn-nuevo-cliente")).toBeTruthy());
    expect(queryByText("+ Cliente")).toBeNull();
    expect(getByLabelText("Nuevo cliente")).toBeTruthy();
  });

  it("'+ Cliente' abre el modal de nuevo cliente con el formulario", async () => {
    const { getByTestId, getByText } = await renderConCarteraActiva({
      listarClientesDeCartera: jest.fn().mockResolvedValue([cliente]),
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
    const crearCliente = jest.fn().mockResolvedValue({ id: "50" });
    const listarClientesDeCartera = jest
      .fn()
      .mockResolvedValueOnce([cliente])
      .mockResolvedValueOnce([cliente, { ...cliente, id: "50", nombre: "Ana", apellido: "Ríos" }]);
    const { getByTestId, getByText } = await renderConCarteraActiva({
      listarClientesDeCartera,
      crearCliente,
    });

    await waitFor(() => expect(getByTestId("btn-nuevo-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-nuevo-cliente"));

    await fireEvent.changeText(getByTestId("cliente-nombre"), "Ana");
    await fireEvent.changeText(getByTestId("cliente-apellido"), "Ríos");
    await fireEvent.changeText(getByTestId("cliente-negocio"), "Tienda");
    await fireEvent.changeText(getByTestId("cliente-telefono-numero"), "7000111");
    await fireEvent.changeText(getByTestId("cliente-doc-numero"), "1234567");
    await fireEvent.changeText(getByTestId("cliente-tope"), "1500");
    await fireEvent.changeText(getByTestId("cliente-latitud"), "-17.79");
    await fireEvent.changeText(getByTestId("cliente-longitud"), "-63.19");

    await fireEvent.press(getByTestId("cliente-guardar"));

    await waitFor(() =>
      expect(crearCliente).toHaveBeenCalledWith("6",
        {
          nombre: "Ana",
          apellido: "Ríos",
          negocio: "Tienda",
          telefonoWhatsapp: "+5917000111",
          latitud: -17.79,
          longitud: -63.19,
          topeMaximoDeuda: 1500,
          tipoDocumento: "ci",
          numeroDocumento: "1234567",
        },
        [],
      ),
    );
    await waitFor(() => expect(getByText("Ana Ríos")).toBeTruthy());
  });

  it("bloquea el alta si el documento no es válido para el tipo", async () => {
    const crearCliente = jest.fn().mockResolvedValue({ id: "50" });
    const { getByTestId, getByText } = await renderConCarteraActiva({
      listarClientesDeCartera: jest.fn().mockResolvedValue([cliente]),
      crearCliente,
    });

    await waitFor(() => expect(getByTestId("btn-nuevo-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-nuevo-cliente"));

    await fireEvent.changeText(getByTestId("cliente-nombre"), "Ana");
    await fireEvent.changeText(getByTestId("cliente-apellido"), "Ríos");
    await fireEvent.changeText(getByTestId("cliente-telefono-numero"), "7000111");
    await fireEvent.changeText(getByTestId("cliente-doc-numero"), "ABC");
    await fireEvent.press(getByTestId("cliente-guardar"));

    expect(
      getByText("El número de documento no es válido para el tipo seleccionado."),
    ).toBeTruthy();
    expect(crearCliente).not.toHaveBeenCalled();
  });

  it("permite elegir el tipo de documento y lo envía al crear", async () => {
    const crearCliente = jest.fn().mockResolvedValue({ id: "50" });
    const { getByTestId } = await renderConCarteraActiva({
      listarClientesDeCartera: jest.fn().mockResolvedValue([cliente]),
      crearCliente,
    });

    await waitFor(() => expect(getByTestId("btn-nuevo-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-nuevo-cliente"));

    await fireEvent.press(getByTestId("cliente-doc-tipo-nit"));
    await fireEvent.changeText(getByTestId("cliente-nombre"), "Ana");
    await fireEvent.changeText(getByTestId("cliente-apellido"), "Ríos");
    await fireEvent.changeText(getByTestId("cliente-telefono-numero"), "7000111");
    await fireEvent.changeText(getByTestId("cliente-doc-numero"), "1234567890");
    await fireEvent.press(getByTestId("cliente-guardar"));

    await waitFor(() =>
      expect(crearCliente).toHaveBeenCalledWith("6",
        expect.objectContaining({
          tipoDocumento: "nit",
          numeroDocumento: "1234567890",
        }),
        expect.any(Array),
      ),
    );
  });

  it("permite registrar el domicilio (opcional) junto con la ubicación del negocio", async () => {
    const crearCliente = jest.fn().mockResolvedValue({ id: "50" });
    const { getByTestId } = await renderConCarteraActiva({
      listarClientesDeCartera: jest.fn().mockResolvedValue([cliente]),
      crearCliente,
    });

    await waitFor(() => expect(getByTestId("btn-nuevo-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-nuevo-cliente"));

    await fireEvent.changeText(getByTestId("cliente-nombre"), "Ana");
    await fireEvent.changeText(getByTestId("cliente-apellido"), "Ríos");
    await fireEvent.changeText(getByTestId("cliente-telefono-numero"), "7000111");
    await fireEvent.changeText(getByTestId("cliente-doc-numero"), "1234567");

    // Negocio (campo por defecto).
    await fireEvent.changeText(getByTestId("cliente-latitud"), "-17.79");
    await fireEvent.changeText(getByTestId("cliente-longitud"), "-63.19");

    // Cambiar a domicilio y fijar sus coordenadas.
    await fireEvent.press(getByTestId("cliente-ubicacion-domicilio"));
    await fireEvent.changeText(getByTestId("cliente-latitud"), "-17.8");
    await fireEvent.changeText(getByTestId("cliente-longitud"), "-63.2");

    await fireEvent.press(getByTestId("cliente-guardar"));

    await waitFor(() =>
      expect(crearCliente).toHaveBeenCalledWith("6",
        expect.objectContaining({
          latitud: -17.79,
          longitud: -63.19,
          latitudDomicilio: -17.8,
          longitudDomicilio: -63.2,
        }),
        expect.any(Array),
      ),
    );
  });

  it("el campo de búsqueda filtra la lista por texto", async () => {
    const { getByTestId, getByText, queryByText } = await renderConCarteraActiva({
      listarClientesDeCartera: jest.fn().mockResolvedValue([
        { ...cliente, id: "11", nombre: "Juan", apellido: "Perez" },
        { ...cliente, id: "12", nombre: "Ana", apellido: "Ríos" },
      ]),
    });

    await waitFor(() => expect(getByText("Juan Perez")).toBeTruthy());
    expect(getByText("Ana Ríos")).toBeTruthy();

    await fireEvent.changeText(getByTestId("busqueda-clientes"), "ana");

    await waitFor(() => expect(getByText("Ana Ríos")).toBeTruthy());
    expect(queryByText("Juan Perez")).toBeNull();
  });

  it("colorea 'En mora' en rojo", async () => {
    const { getByTestId } = await renderConCarteraActiva(
      { listarClientesDeCartera: jest.fn().mockResolvedValue([cliente]) },
      undefined,
      "en_mora",
    );

    await waitFor(() => expect(getByTestId("filtro-chip-en_mora")).toBeTruthy());
    expect(getByTestId("filtro-chip-en_mora")).toHaveStyle({
      backgroundColor: shColor.danger,
    });
  });

  it("colorea 'Al día' en verde", async () => {
    const { getByTestId } = await renderConCarteraActiva(
      { listarClientesDeCartera: jest.fn().mockResolvedValue([cliente]) },
      undefined,
      "al_dia",
    );

    await waitFor(() => expect(getByTestId("filtro-chip-al_dia")).toBeTruthy());
    expect(getByTestId("filtro-chip-al_dia")).toHaveStyle({
      backgroundColor: shColor.success,
    });
  });

  it("el botón '+ Cliente' solo se muestra con cartera activa", async () => {
    const { queryByTestId } = await renderConCarteraActiva(
      { listarClientesDeCartera: jest.fn() },
      null,
    );

    expect(queryByTestId("btn-nuevo-cliente")).toBeNull();
  });

  it("NO envía coordenadas 0,0 si el usuario deja vacío el campo latitud/longitud", async () => {
    const crearCliente = jest.fn().mockResolvedValue({ id: "50" });
    const { getByTestId, getByText } = await renderConCarteraActiva({
      listarClientesDeCartera: jest.fn().mockResolvedValue([cliente]),
      crearCliente,
    });

    await waitFor(() => expect(getByTestId("btn-nuevo-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-nuevo-cliente"));

    await fireEvent.changeText(getByTestId("cliente-nombre"), "Ana");
    await fireEvent.changeText(getByTestId("cliente-apellido"), "Ríos");
    await fireEvent.changeText(getByTestId("cliente-telefono-numero"), "7000111");
    await fireEvent.changeText(getByTestId("cliente-doc-numero"), "1234567");
    await fireEvent.changeText(getByTestId("cliente-latitud"), "");
    await fireEvent.changeText(getByTestId("cliente-longitud"), "");

    await fireEvent.press(getByTestId("cliente-guardar"));

    expect(crearCliente).not.toHaveBeenCalled();
    expect(getByText("Las coordenadas no son válidas.")).toBeTruthy();
  });

  it("NO envía un tope de deuda NaN ni negativo", async () => {
    const crearCliente = jest.fn().mockResolvedValue({ id: "50" });
    const { getByTestId, getByText } = await renderConCarteraActiva({
      listarClientesDeCartera: jest.fn().mockResolvedValue([cliente]),
      crearCliente,
    });

    await waitFor(() => expect(getByTestId("btn-nuevo-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-nuevo-cliente"));

    await fireEvent.changeText(getByTestId("cliente-nombre"), "Ana");
    await fireEvent.changeText(getByTestId("cliente-apellido"), "Ríos");
    await fireEvent.changeText(getByTestId("cliente-telefono-numero"), "7000111");
    await fireEvent.changeText(getByTestId("cliente-doc-numero"), "1234567");
    await fireEvent.changeText(getByTestId("cliente-tope"), "-100");

    await fireEvent.press(getByTestId("cliente-guardar"));

    expect(crearCliente).not.toHaveBeenCalled();
    expect(getByText("El tope de deuda debe ser un número válido.")).toBeTruthy();
  });

  it("pre-llena el tope máximo con el cupoDefault de la cartera activa", async () => {
    const crearCliente = jest.fn().mockResolvedValue({ id: "50" });
    const { getByTestId } = await renderConCarteraActiva(
      {
        listarClientesDeCartera: jest.fn().mockResolvedValue([cliente]),
        crearCliente,
      },
      {
        carteraId: "6",
        carteraNombre: "Cartera Centro",
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
    const { getByTestId, getByText } = await renderConCarteraActiva({
      listarClientesDeCartera: jest.fn().mockResolvedValue([cliente]),
    });

    await waitFor(() => expect(getByTestId("btn-nuevo-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-nuevo-cliente"));

    expect(getByTestId("cliente-avatar-btn")).toBeTruthy();
    expect(getByTestId("cliente-doc-frente")).toBeTruthy();
    expect(getByTestId("cliente-doc-reverso")).toBeTruthy();
    expect(getByText("Documento")).toBeTruthy();
  });

  it("muestra el check verde de éxito tras crear el cliente", async () => {
    const crearCliente = jest.fn().mockResolvedValue({ id: "50" });
    const listarClientesDeCartera = jest
      .fn()
      .mockResolvedValueOnce([cliente])
      .mockResolvedValueOnce([cliente, { ...cliente, id: "50" }]);
    const { getByTestId } = await renderConCarteraActiva({
      listarClientesDeCartera,
      crearCliente,
    });

    await waitFor(() => expect(getByTestId("btn-nuevo-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-nuevo-cliente"));

    await fireEvent.changeText(getByTestId("cliente-nombre"), "Ana");
    await fireEvent.changeText(getByTestId("cliente-apellido"), "Ríos");
    await fireEvent.changeText(getByTestId("cliente-telefono-numero"), "7000111");
    await fireEvent.changeText(getByTestId("cliente-doc-numero"), "1234567");
    await fireEvent.press(getByTestId("cliente-guardar"));

    await waitFor(() => expect(getByTestId("cliente-creado-ok")).toBeTruthy());
  });

  it("busca por dirección y mueve el marker (geocodeAsync)", async () => {
    const Location = require("expo-location");
    (Location.geocodeAsync as jest.Mock).mockResolvedValue([
      { latitude: -17.4, longitude: -66.1 },
    ]);
    const { getByTestId } = await renderConCarteraActiva({
      listarClientesDeCartera: jest.fn().mockResolvedValue([cliente]),
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
    const { getByTestId } = await renderConCarteraActiva({
      listarClientesDeCartera: jest.fn().mockResolvedValue([cliente]),
    });

    await waitFor(() => expect(getByTestId("btn-nuevo-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-nuevo-cliente"));

    expect(getByTestId("cliente-avatar-btn")).toBeTruthy();
    await fireEvent.press(getByTestId("cliente-avatar-btn"));
    expect(getByTestId("fuente-modal")).toBeTruthy();
    expect(getByTestId("fuente-libreria")).toBeTruthy();
    expect(getByTestId("fuente-camara")).toBeTruthy();
  });

  it("un toque en el documento frente abre el modal de fuente (galería/cámara)", async () => {
    const { getByTestId } = await renderConCarteraActiva({
      listarClientesDeCartera: jest.fn().mockResolvedValue([cliente]),
    });

    await waitFor(() => expect(getByTestId("btn-nuevo-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-nuevo-cliente"));

    expect(getByTestId("cliente-doc-frente")).toBeTruthy();
    expect(getByTestId("cliente-doc-reverso")).toBeTruthy();
    await fireEvent.press(getByTestId("cliente-doc-frente"));
    expect(getByTestId("fuente-modal")).toBeTruthy();
  });

  it("avisa que la cartera exige foto y documento antes de crear si faltan", async () => {
    const crearCliente = jest.fn().mockResolvedValue({ id: "50" });
    const { getByTestId, getByText } = await renderConCarteraActiva(
      {
        listarClientesDeCartera: jest.fn().mockResolvedValue([cliente]),
        crearCliente,
      },
      {
        carteraId: "6",
        carteraNombre: "Cartera Centro",
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
    await fireEvent.changeText(getByTestId("cliente-doc-numero"), "1234567");
    await fireEvent.press(getByTestId("cliente-guardar"));

    expect(crearCliente).not.toHaveBeenCalled();
    expect(getByText("Esta cartera exige la foto del cliente (foto facial).")).toBeTruthy();
  });

  it("muestra un mensaje claro si el backend rechaza por fotos demasiado grandes (413)", async () => {
    const crearCliente = jest
      .fn()
      .mockRejectedValue(new ApiError(413, '{"message":"File too large"}'));
    const { getByTestId, getByText } = await renderConCarteraActiva({
      listarClientesDeCartera: jest.fn().mockResolvedValue([cliente]),
      crearCliente,
    });

    await waitFor(() => expect(getByTestId("btn-nuevo-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-nuevo-cliente"));

    await fireEvent.changeText(getByTestId("cliente-nombre"), "Ana");
    await fireEvent.changeText(getByTestId("cliente-apellido"), "Ríos");
    await fireEvent.changeText(getByTestId("cliente-telefono-numero"), "7000111");
    await fireEvent.changeText(getByTestId("cliente-doc-numero"), "1234567");
    await fireEvent.press(getByTestId("cliente-guardar"));

    await waitFor(() =>
      expect(
        getByText("Las fotos son demasiado grandes (máx. 15MB cada una)."),
      ).toBeTruthy(),
    );
  });

  it("muestra el mensaje del backend si viene en el cuerpo (400 con array)", async () => {
    const crearCliente = jest
      .fn()
      .mockRejectedValue(
        new ApiError(400, '{"message":["El teléfono de WhatsApp no es válido"]}'),
      );
    const { getByTestId, getByText } = await renderConCarteraActiva({
      listarClientesDeCartera: jest.fn().mockResolvedValue([cliente]),
      crearCliente,
    });

    await waitFor(() => expect(getByTestId("btn-nuevo-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-nuevo-cliente"));

    await fireEvent.changeText(getByTestId("cliente-nombre"), "Ana");
    await fireEvent.changeText(getByTestId("cliente-apellido"), "Ríos");
    await fireEvent.changeText(getByTestId("cliente-telefono-numero"), "7000111");
    await fireEvent.changeText(getByTestId("cliente-doc-numero"), "1234567");
    await fireEvent.press(getByTestId("cliente-guardar"));

    await waitFor(() =>
      expect(getByText("El teléfono de WhatsApp no es válido")).toBeTruthy(),
    );
  });
});