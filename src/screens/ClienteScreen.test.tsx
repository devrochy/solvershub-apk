import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { ClienteScreen } from "./ClienteScreen";
import * as cache from "../offline/cache";
import { OfflineContext, OfflineValue } from "../offline/offline-context";
import { SessionContext, SessionValue } from "../session/session-context";

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
  const navigation = { navigate: jest.fn() } as never;
  return render(
    <OfflineContext.Provider value={offline}>
      <SessionContext.Provider value={valor}>
        <ClienteScreen
          navigation={navigation}
          route={{
            key: "cliente",
            name: "Cliente",
            params: { rutaId: 6, clienteId: 2, nombre: "Juan" },
          }}
        />
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