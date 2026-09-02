import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { ClienteScreen } from "./ClienteScreen";
import * as cache from "../offline/cache";
import { OfflineContext, OfflineValue } from "../offline/offline-context";
import { SessionContext, SessionValue } from "../session/session-context";
import { RutaActivaContext } from "../session/ruta-activa-context";

jest.mock("../features/estado-cuenta/estado-cuenta", () => ({
  enlaceWhatsApp: jest.fn(
    (telefono: string, texto: string) =>
      `https://wa.me/${telefono.replace(/[^\d]/g, "")}?text=${encodeURIComponent(texto)}`,
  ),
  textoReportePrestamo: jest.fn(() => "Estado de cuenta de Juan"),
  numeroWhatsApp: jest.fn((t: string) => t.replace(/[^\d]/g, "")),
}));

import { Linking } from "react-native";
import { enlaceWhatsApp } from "../features/estado-cuenta/estado-cuenta";

jest.mock("../offline/cache", () => ({
  guardarCliente: jest.fn().mockResolvedValue(undefined),
  leerCliente: jest.fn().mockResolvedValue(null),
}));

const offlineValor: OfflineValue = {
  isOnline: true,
  sinSubir: 0,
  errorSync: null,
  encolar: jest.fn().mockResolvedValue(undefined),
  encolarSiNoExiste: jest.fn().mockResolvedValue(true),
  sincronizar: jest.fn().mockResolvedValue(undefined),
};

const prestamo = {
  id: 1,
  rutaId: 6,
  clienteId: 2,
  valor: 1000,
  numCuotas: 4,
  tipoInteres: 20,
  diasEntreCuotas: 7,
  fechaOtorgado: "2026-08-01",
  estatus: "vigente" as const,
  cuotas: [
    {
      id: 10,
      numeroCuota: 1,
      valorEsperado: 300,
      fechaVencimiento: "2026-08-08",
      estatus: "pendiente" as const,
    },
  ],
};

const tarjeta = {
  clienteId: 2,
  rutaId: 6,
  nombre: "Juan",
  negocio: null,
  telefonoWhatsapp: "+59170000000",
  color: "azul" as const,
  fotoUrl: null,
  tipoPago: null,
  saldoPendiente: 300,
  diasMora: 0,
};

async function renderConApi(
  api: Partial<SessionValue["api"]>,
  offline = offlineValor,
  params: { latitud?: number; longitud?: number } = {},
  navigate: jest.Mock = jest.fn(),
) {
  const valor: SessionValue = {
    cobrador: { id: 20, usuario: "cobrador1", nombre: "C", apellido: "L" },
    loading: false,
    api: {
      tarjeta: jest.fn().mockResolvedValue(tarjeta),
      listarPrestamosDeCliente: jest.fn().mockResolvedValue([prestamo]),
      ...api,
    } as SessionValue["api"],
    login: jest.fn(),
    logout: jest.fn(),
  };
  const navigation = { navigate } as never;
  return render(
    <OfflineContext.Provider value={offline}>
      <SessionContext.Provider value={valor}>
        <RutaActivaContext.Provider
          value={{
            rutaActiva: {
              rutaId: 6,
              rutaNombre: "Ruta Centro",
              tipoInteres: 20,
              numCuotas: 8,
              config: { rutaId: 6, cupoDefault: 1500, cuotasMinimasPrestamo: 1 } as never,
            },
            setRutaActiva: jest.fn(),
          }}
        >
          <ClienteScreen
            navigation={navigation}
            route={{
              key: "cliente",
              name: "Cliente",
              params: { rutaId: 6, clienteId: 2, nombre: "Juan", ...params },
            }}
          />
        </RutaActivaContext.Provider>
      </SessionContext.Provider>
    </OfflineContext.Provider>,
  );
}

describe("ClienteScreen", () => {
  it("registra un abono parcial con tipoPago abono sin cuotaId", async () => {
    const registrarVisitaPago = jest.fn().mockResolvedValue({ id: 1 });
    const { getByTestId } = await renderConApi({ registrarVisitaPago });

    await waitFor(() => expect(getByTestId("btn-pago")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-pago"));
    await fireEvent.press(getByTestId("tipo-abono"));
    await fireEvent.changeText(getByTestId("pago-valor"), "100");
    await fireEvent.press(getByTestId("guardar-visita"));

    await waitFor(() =>
      expect(registrarVisitaPago).toHaveBeenCalledWith(6, {
        prestamoId: 1,
        clienteId: 2,
        resultado: "pago",
        tipoPago: "abono",
        cuotaId: undefined,
        valor: 100,
        metodoPago: "efectivo",
      }),
    );
  });

  it("registra una visita no-pago con promesa de pago (compromiso_de_pago)", async () => {
    const registrarVisitaNoPago = jest.fn().mockResolvedValue({ id: 1 });
    const { getByTestId, getByText } = await renderConApi({
      registrarVisitaNoPago,
    });

    await waitFor(() => expect(getByTestId("btn-no-pago")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-no-pago"));
    await fireEvent.press(getByText("compromiso_de_pago"));
    const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    await fireEvent.changeText(getByTestId("fecha-prometida"), manana);
    await fireEvent.changeText(getByTestId("valor-prometido"), "150");
    await fireEvent.press(getByTestId("guardar-visita"));

    await waitFor(() =>
      expect(registrarVisitaNoPago).toHaveBeenCalledWith(6, {
        prestamoId: 1,
        clienteId: 2,
        resultado: "no_pago",
        motivoNoPago: "compromiso_de_pago",
        fechaPrometida: manana,
        valorPrometido: 150,
      }),
    );
  });

  it("exige fecha prometida para compromiso de pago", async () => {
    const registrarVisitaNoPago = jest.fn().mockResolvedValue({ id: 1 });
    const { getByTestId, getByText, getByTestId: getByTestId2 } =
      await renderConApi({ registrarVisitaNoPago });

    await waitFor(() => expect(getByTestId("btn-no-pago")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-no-pago"));
    await fireEvent.press(getByText("compromiso_de_pago"));
    await fireEvent.press(getByTestId2("guardar-visita"));

    await waitFor(() =>
      expect(getByText("Para compromiso de pago se requiere la fecha prometida.")).toBeTruthy(),
    );
    expect(registrarVisitaNoPago).not.toHaveBeenCalled();
  });

  it("encola la visita en la cola offline cuando hay error de red", async () => {
    const errorRed = new Error("Network request failed");
    const encolarSiNoExiste = jest.fn().mockResolvedValue(true);
    const offlineConError: OfflineValue = {
      ...offlineValor,
      encolarSiNoExiste,
    };
    const registrarVisitaPago = jest.fn().mockRejectedValue(errorRed);
    const { getByTestId } = await renderConApi(
      { registrarVisitaPago },
      offlineConError,
    );

    await waitFor(() => expect(getByTestId("btn-pago")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-pago"));
    await fireEvent.changeText(getByTestId("pago-valor"), "300");
    await fireEvent.press(getByTestId("guardar-visita"));

    await waitFor(() =>
      expect(encolarSiNoExiste).toHaveBeenCalledWith(
        "visita",
        {
          prestamoId: 1,
          clienteId: 2,
          resultado: "pago",
          tipoPago: "cuota",
          cuotaId: 10,
          valor: 300,
          metodoPago: "efectivo",
        },
        "pago-1-2-10",
      ),
    );
  });

  it("no encola un pago duplicado pendiente (dedupe) y avisa", async () => {
    const errorRed = new Error("Network request failed");
    const encolarSiNoExiste = jest.fn().mockResolvedValue(false);
    const offlineConError: OfflineValue = {
      ...offlineValor,
      encolarSiNoExiste,
    };
    const registrarVisitaPago = jest.fn().mockRejectedValue(errorRed);
    const { getByTestId, getByText } = await renderConApi(
      { registrarVisitaPago },
      offlineConError,
    );

    await waitFor(() => expect(getByTestId("btn-pago")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-pago"));
    await fireEvent.changeText(getByTestId("pago-valor"), "300");
    await fireEvent.press(getByTestId("guardar-visita"));

    await waitFor(() =>
      expect(
        getByText("Ya hay un pago pendiente por sincronizar para este préstamo."),
      ).toBeTruthy(),
    );
  });

  it("dedup de abono usa la clave abono (no colisiona con pagos de cuota)", async () => {
    const errorRed = new Error("Network request failed");
    const encolarSiNoExiste = jest.fn().mockResolvedValue(true);
    const offlineConError: OfflineValue = {
      ...offlineValor,
      encolarSiNoExiste,
    };
    const registrarVisitaPago = jest.fn().mockRejectedValue(errorRed);
    const { getByTestId } = await renderConApi(
      { registrarVisitaPago },
      offlineConError,
    );

    await waitFor(() => expect(getByTestId("btn-pago")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-pago"));
    await fireEvent.press(getByTestId("tipo-abono"));
    await fireEvent.changeText(getByTestId("pago-valor"), "100");
    await fireEvent.press(getByTestId("guardar-visita"));

    await waitFor(() =>
      expect(encolarSiNoExiste).toHaveBeenCalledWith(
        "visita",
        expect.objectContaining({ tipoPago: "abono", cuotaId: undefined }),
        "pago-1-2-abono",
      ),
    );
  });

  it("dedup de no_pago usa la clave préstamo-cliente", async () => {
    const errorRed = new Error("Network request failed");
    const encolarSiNoExiste = jest.fn().mockResolvedValue(true);
    const offlineConError: OfflineValue = {
      ...offlineValor,
      encolarSiNoExiste,
    };
    const registrarVisitaNoPago = jest.fn().mockRejectedValue(errorRed);
    const { getByTestId } = await renderConApi(
      { registrarVisitaNoPago },
      offlineConError,
    );

    await waitFor(() => expect(getByTestId("btn-no-pago")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-no-pago"));
    await fireEvent.press(getByTestId("guardar-visita"));

    await waitFor(() =>
      expect(encolarSiNoExiste).toHaveBeenCalledWith(
        "visita",
        expect.objectContaining({ resultado: "no_pago", motivoNoPago: "no_esta" }),
        "no_pago-1-2",
      ),
    );
  });

  it("no permite pagar una cuota si el préstamo no tiene cuotas pendientes", async () => {
    const prestamoPagado = {
      ...prestamo,
      cuotas: [
        { ...prestamo.cuotas[0], estatus: "pagada" as const },
      ],
    };
    const registrarVisitaPago = jest.fn();
    const { getByTestId, getByText, getAllByText } = await renderConApi({
      listarPrestamosDeCliente: jest.fn().mockResolvedValue([prestamoPagado]),
      registrarVisitaPago,
    });

    await waitFor(() => expect(getByTestId("btn-pago")).toBeTruthy());
    expect(getByText("Sin cuotas pendientes para este préstamo.")).toBeTruthy();

    await fireEvent.press(getByTestId("btn-pago"));
    await fireEvent.changeText(getByTestId("pago-valor"), "300");
    await fireEvent.press(getByTestId("guardar-visita"));

    await waitFor(() =>
      expect(
        getAllByText("Sin cuotas pendientes para este préstamo.").length,
      ).toBeGreaterThan(0),
    );
    expect(registrarVisitaPago).not.toHaveBeenCalled();
  });
});

describe("ClienteScreen — cache offline", () => {
  it("guarda tarjeta + prestamos al cargar online", async () => {
    (cache.guardarCliente as jest.Mock).mockResolvedValue(undefined);
    await renderConApi({});

    await waitFor(() =>
      expect(cache.guardarCliente).toHaveBeenCalledWith(6, 2, {
        tarjeta,
        prestamos: [prestamo],
      }),
    );
  });

  it("lee el cache y muestra la tarjeta en error de red", async () => {
    (cache.leerCliente as jest.Mock).mockResolvedValue({ tarjeta, prestamos: [prestamo] });
    const { getByText } = await renderConApi({
      tarjeta: jest.fn().mockRejectedValue(new Error("Network request failed")),
      listarPrestamosDeCliente: jest.fn().mockRejectedValue(new Error("Network request failed")),
    });

    await waitFor(() => expect(getByText("Juan")).toBeTruthy());
    expect(getByText(/Saldo pendiente: 300/)).toBeTruthy();
  });
});

describe("ClienteScreen — edición de cliente offline", () => {
  it("abre el formulario, prellena la tarjeta y encola cambio_cliente", async () => {
    const encolarSiNoExiste = jest.fn().mockResolvedValue(true);
    const offlineConError: OfflineValue = { ...offlineValor, encolarSiNoExiste };
    const { getByTestId, getByText } = await renderConApi({}, offlineConError);

    await waitFor(() => expect(getByTestId("btn-editar-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-editar-cliente"));

    expect(getByTestId("editar-cliente-form")).toBeTruthy();
    await fireEvent.changeText(getByTestId("editar-nombre"), "Juan Carlos");
    await fireEvent.press(getByTestId("guardar-cambio-cliente"));

    await waitFor(() =>
      expect(encolarSiNoExiste).toHaveBeenCalledWith(
        "cambio_cliente",
        { clienteId: 2, input: { nombre: "Juan Carlos" } },
        "cambio_cliente-2",
      ),
    );
    expect(getByText(/se sincronizará/)).toBeTruthy();
  });

  it("tras editar el teléfono, el WhatsApp usa el número nuevo (no stale)", async () => {
    const encolarSiNoExiste = jest.fn().mockResolvedValue(true);
    const offlineConError: OfflineValue = { ...offlineValor, encolarSiNoExiste };
    jest.spyOn(Linking, "openURL").mockResolvedValue(true as never);
    const { getByTestId } = await renderConApi({}, offlineConError);

    await waitFor(() => expect(getByTestId("btn-editar-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-editar-cliente"));
    await fireEvent.changeText(getByTestId("editar-telefono"), "+59179999999");
    await fireEvent.press(getByTestId("guardar-cambio-cliente"));

    await waitFor(() => expect(getByTestId("btn-whatsapp")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-whatsapp"));

    expect(enlaceWhatsApp).toHaveBeenCalledWith("+59179999999", "Estado de cuenta de Juan");
  });

  it("no vuelve a encolar si ya hay un cambio pendiente del cliente", async () => {
    const encolarSiNoExiste = jest.fn().mockResolvedValue(false);
    const offlineConError: OfflineValue = { ...offlineValor, encolarSiNoExiste };
    const { getByTestId, getByText } = await renderConApi({}, offlineConError);

    await waitFor(() => expect(getByTestId("btn-editar-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-editar-cliente"));
    await fireEvent.changeText(getByTestId("editar-nombre"), "Otro");
    await fireEvent.press(getByTestId("guardar-cambio-cliente"));

    await waitFor(() =>
      expect(encolarSiNoExiste).toHaveBeenCalledWith(
        "cambio_cliente",
        { clienteId: 2, input: { nombre: "Otro" } },
        "cambio_cliente-2",
      ),
    );
    expect(getByText("Ya hay un cambio pendiente por sincronizar.")).toBeTruthy();
  });

  it("no encola si no cambió ningún campo", async () => {
    const encolarSiNoExiste = jest.fn().mockResolvedValue(true);
    const offlineConError: OfflineValue = { ...offlineValor, encolarSiNoExiste };
    const { getByTestId } = await renderConApi({}, offlineConError);

    await waitFor(() => expect(getByTestId("btn-editar-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-editar-cliente"));
    await fireEvent.press(getByTestId("guardar-cambio-cliente"));

    expect(encolarSiNoExiste).not.toHaveBeenCalled();
  });
});

jest.mock("../features/navegacion/navegacion", () => ({
  abrirNavegacion: jest.fn().mockResolvedValue(undefined),
}));

import { abrirNavegacion } from "../features/navegacion/navegacion";

describe("ClienteScreen — navegación externa (maps/waze)", () => {
  it("muestra los botones de navegación cuando llegan coordenadas por params", async () => {
    const { getByTestId } = await renderConApi(
      {},
      offlineValor,
      { latitud: -17.78, longitud: -63.18 },
    );

    await waitFor(() => expect(getByTestId("navegar-maps")).toBeTruthy());
    expect(getByTestId("navegar-waze")).toBeTruthy();
  });

  it("no muestra botones de navegación sin coordenadas", async () => {
    const { queryByTestId } = await renderConApi({});

    await waitFor(() => expect(queryByTestId("btn-pago")).toBeTruthy());
    expect(queryByTestId("navegar-maps")).toBeNull();
    expect(queryByTestId("navegar-waze")).toBeNull();
  });

  it("abre Waze al tocar el botón Waze", async () => {
    const { getByTestId } = await renderConApi(
      {},
      offlineValor,
      { latitud: -17.78, longitud: -63.18 },
    );

    await waitFor(() => expect(getByTestId("navegar-waze")).toBeTruthy());
    await fireEvent.press(getByTestId("navegar-waze"));

    expect(abrirNavegacion).toHaveBeenCalledWith(-17.78, -63.18, "waze");
  });

  it("muestra el mapa del cliente cuando hay coordenadas", async () => {
    const { getByTestId } = await renderConApi(
      {},
      offlineValor,
      { latitud: -17.78, longitud: -63.18 },
    );

    await waitFor(() => expect(getByTestId("mapa-cliente")).toBeTruthy());
  });

  it("no muestra el mapa sin coordenadas", async () => {
    const { queryByTestId } = await renderConApi({});

    await waitFor(() => expect(queryByTestId("btn-pago")).toBeTruthy());
    expect(queryByTestId("mapa-cliente")).toBeNull();
  });
});

describe("ClienteScreen — estado de cuenta y WhatsApp", () => {
  let spyOpenURL: jest.SpyInstance;
  beforeEach(() => {
    spyOpenURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true as never);
  });
  afterEach(() => {
    spyOpenURL.mockRestore();
  });

  it("muestra las cuotas del préstamo y el botón Enviar por WhatsApp", async () => {
    const { getByTestId, getAllByText } = await renderConApi({});

    await waitFor(() => expect(getByTestId("btn-whatsapp")).toBeTruthy());
    expect(getAllByText(/Cuota 1 — 300 \(pendiente\)/).length).toBeGreaterThan(0);
  });

  it("abre wa.me con el reporte al tocar el botón", async () => {
    const { getByTestId } = await renderConApi({});

    await waitFor(() => expect(getByTestId("btn-whatsapp")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-whatsapp"));

    expect(enlaceWhatsApp).toHaveBeenCalledWith(
      "+59170000000",
      "Estado de cuenta de Juan",
    );
    expect(Linking.openURL).toHaveBeenCalledWith(
      "https://wa.me/59170000000?text=Estado%20de%20cuenta%20de%20Juan",
    );
  });
});

describe("ClienteScreen — tarjeta completa (foto, tipoPago, detalle)", () => {
  it("muestra la foto, el tipo de pago y el teléfono cuando vienen en la tarjeta", async () => {
    const tarjetaCompleta = {
      ...tarjeta,
      fotoUrl: "https://cdn.test/foto.jpg",
      tipoPago: "diario",
    };
    const { getByTestId, getByText } = await renderConApi({
      tarjeta: jest.fn().mockResolvedValue(tarjetaCompleta),
    });

    await waitFor(() => expect(getByTestId("avatar-foto")).toBeTruthy());
    expect(getByText(/Tipo de pago: diario/)).toBeTruthy();
    expect(getByText(/WhatsApp: \+59170000000/)).toBeTruthy();
  });

  it("no muestra la foto ni el tipo de pago cuando son null", async () => {
    const { queryByTestId, queryByText } = await renderConApi({});

    await waitFor(() => expect(queryByTestId("btn-pago")).toBeTruthy());
    expect(queryByTestId("avatar-foto")).toBeNull();
    expect(queryByText(/Tipo de pago:/)).toBeNull();
  });

  it("colapsa y expande el detalle de estado de cuenta", async () => {
    const { getByTestId, queryByTestId } = await renderConApi({});

    await waitFor(() => expect(getByTestId("btn-whatsapp")).toBeTruthy());
    // el detalle está visible por defecto
    expect(getByTestId("estado-cuenta").props.accessibilityState.expanded).toBe(true);

    await fireEvent.press(getByTestId("btn-detalle-estado-cuenta"));
    expect(getByTestId("estado-cuenta").props.accessibilityState.expanded).toBe(false);
    expect(queryByTestId("cuota-10")).toBeNull();
  });
});

describe("ClienteScreen — registrar préstamo", () => {
  it("abre el formulario y llama crearPrestamo con los campos", async () => {
    const crearPrestamo = jest.fn().mockResolvedValue({ id: 5 });
    const { getByTestId } = await renderConApi({ crearPrestamo });

    await waitFor(() => expect(getByTestId("btn-nuevo-prestamo")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-nuevo-prestamo"));

    await fireEvent.changeText(getByTestId("prestamo-valor"), "800");
    await fireEvent.changeText(getByTestId("prestamo-cuotas"), "4");
    await fireEvent.changeText(getByTestId("prestamo-dias"), "7");
    await fireEvent.press(getByTestId("guardar-prestamo"));

    await waitFor(() =>
      expect(crearPrestamo).toHaveBeenCalledWith(6, {
        clienteId: 2,
        valor: 800,
        numCuotas: 4,
        diasEntreCuotas: 7,
        tipoInteres: 20,
      }),
    );
  });

  it("no llama crearPrestamo si la validación falla", async () => {
    const crearPrestamo = jest.fn();
    const { getByTestId, getByText } = await renderConApi({ crearPrestamo });

    await waitFor(() => expect(getByTestId("btn-nuevo-prestamo")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-nuevo-prestamo"));
    // Autocompletado: limpiamos el valor para forzar el fallo de validación.
    await fireEvent.changeText(getByTestId("prestamo-valor"), "");
    await fireEvent.press(getByTestId("guardar-prestamo"));

    expect(crearPrestamo).not.toHaveBeenCalled();
    expect(getByText(/Ingresa un valor de préstamo válido/)).toBeTruthy();
  });

  it("autocompleta interés, cuotas y valor desde la ruta activa", async () => {
    const crearPrestamo = jest.fn().mockResolvedValue({ id: 5 });
    const { getByTestId } = await renderConApi({ crearPrestamo });

    await waitFor(() => expect(getByTestId("btn-nuevo-prestamo")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-nuevo-prestamo"));

    // Los defaults de la ruta activa vienen pre-llenados (20% interés, 8 cuotas, cupo 1500).
    expect(getByTestId("prestamo-valor").props.value).toBe("1500");
    expect(getByTestId("prestamo-cuotas").props.value).toBe("8");
    expect(getByTestId("prestamo-interes").props.value).toBe("20");

    await fireEvent.changeText(getByTestId("prestamo-dias"), "7");
    await fireEvent.press(getByTestId("guardar-prestamo"));

    await waitFor(() =>
      expect(crearPrestamo).toHaveBeenCalledWith(6, {
        clienteId: 2,
        valor: 1500,
        numCuotas: 8,
        diasEntreCuotas: 7,
        tipoInteres: 20,
      }),
    );
  });
});

describe("ClienteScreen — editar/eliminar cuota", () => {
  it("abre el diálogo de edición y llama editarCuota con password y motivo", async () => {
    const editarCuota = jest.fn().mockResolvedValue({ id: 10 });
    const { getByTestId } = await renderConApi({ editarCuota });

    await waitFor(() => expect(getByTestId("btn-editar-cuota-10")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-editar-cuota-10"));

    await fireEvent.changeText(getByTestId("cuota-nuevo-valor"), "550");
    await fireEvent.changeText(getByTestId("audit-password"), "secreto");
    await fireEvent.changeText(getByTestId("audit-motivo"), "corrección");
    await fireEvent.press(getByTestId("guardar-cuota"));

    await waitFor(() =>
      expect(editarCuota).toHaveBeenCalledWith(6, 10, {
        valorEsperado: 550,
        password: "secreto",
        motivo: "corrección",
      }),
    );
  });

  it("confirma y llama eliminarCuota con password y motivo", async () => {
    const eliminarCuota = jest.fn().mockResolvedValue({ id: 10 });
    const { getByTestId } = await renderConApi({ eliminarCuota });

    await waitFor(() => expect(getByTestId("btn-eliminar-cuota-10")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-eliminar-cuota-10"));

    await fireEvent.changeText(getByTestId("audit-password"), "secreto");
    await fireEvent.changeText(getByTestId("audit-motivo"), "error de registro");
    await fireEvent.press(getByTestId("guardar-cuota"));

    await waitFor(() =>
      expect(eliminarCuota).toHaveBeenCalledWith(6, 10, {
        password: "secreto",
        motivo: "error de registro",
      }),
    );
  });

  it("navega a la pantalla de préstamo (canvas de cuotas) al tocar el botón", async () => {
    const navigate = jest.fn();
    const { getByTestId } = await renderConApi(
      {},
      offlineValor,
      {},
      navigate,
    );

    await waitFor(() => expect(getByTestId("btn-canvas-prestamo")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-canvas-prestamo"));

    expect(navigate).toHaveBeenCalledWith("Prestamo", {
      rutaId: 6,
      prestamoId: 1,
      clienteNombre: "Juan",
      telefonoWhatsapp: "+59170000000",
      valor: 1000,
      numCuotas: 4,
    });
  });

  it("solo muestra un formulario a la vez (Nuevo préstamo cierra Editar datos)", async () => {
    const { getByTestId, queryByTestId } = await renderConApi({});

    await waitFor(() => expect(getByTestId("btn-editar-cliente")).toBeTruthy());

    await fireEvent.press(getByTestId("btn-editar-cliente"));
    expect(getByTestId("editar-cliente-form")).toBeTruthy();

    await fireEvent.press(getByTestId("btn-nuevo-prestamo"));
    expect(getByTestId("prestamo-form")).toBeTruthy();
    expect(queryByTestId("editar-cliente-form")).toBeNull();
  });

  it("abrir pago cierra el formulario de préstamo", async () => {
    const { getByTestId, queryByTestId } = await renderConApi({});

    await waitFor(() => expect(getByTestId("btn-pago")).toBeTruthy());

    await fireEvent.press(getByTestId("btn-nuevo-prestamo"));
    expect(getByTestId("prestamo-form")).toBeTruthy();

await fireEvent.press(getByTestId("btn-pago"));
    expect(getByTestId("form-pago")).toBeTruthy();
    expect(queryByTestId("prestamo-form")).toBeNull();
  });

  it("abre el formulario de foto/documento y no solapa otros formularios", async () => {
    const { getByTestId, queryByTestId } = await renderConApi({});

    await waitFor(() => expect(getByTestId("btn-evidencias")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-evidencias"));

    expect(getByTestId("evidencias-form")).toBeTruthy();
    expect(queryByTestId("prestamo-form")).toBeNull();
    expect(queryByTestId("editar-cliente-form")).toBeNull();
  });
});

describe("ClienteScreen — lista de préstamos con color", () => {
  it("lista todos los préstamos del cliente con su color de estado", async () => {
    const prestamoCancelado = {
      ...prestamo,
      id: 2,
      estatus: "cancelado" as const,
      cuotas: [],
    };
    const { getByTestId, getAllByTestId } = await renderConApi({
      listarPrestamosDeCliente: jest
        .fn()
        .mockResolvedValue([prestamo, prestamoCancelado]),
    });

    await waitFor(() => expect(getByTestId("prestamo-item-1")).toBeTruthy());
    expect(getByTestId("prestamo-item-2")).toBeTruthy();
    expect(getAllByTestId("color-badge-verde").length).toBeGreaterThan(0);
    expect(getByTestId("color-badge-blanco")).toBeTruthy();
  });
});