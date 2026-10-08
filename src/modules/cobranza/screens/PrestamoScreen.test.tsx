import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";
import { PrestamoScreen } from "./PrestamoScreen";
import { SessionContext, SessionValue } from "../session/session-context";
import { OfflineContext, OfflineValue } from "../offline/offline-context";

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

const estadoCuenta = {
  prestamoId: "200",
  carteraId: "6",
  clienteId: "11",
  nombreCliente: "Juan Perez",
  valor: 1000,
  numCuotas: 8,
  tipoInteres: 20,
  estatus: "vigente",
  moneda: "Bs",
  cuotas: [
    { cuotaId: "1", numeroCuota: 1, valorEsperado: 150, fechaVencimiento: "2026-08-01", estatus: "pagada", abonosAcumulados: 0, saldoPendiente: 0 },
    { cuotaId: "2", numeroCuota: 2, valorEsperado: 150, fechaVencimiento: "2026-08-08", estatus: "atrasada", abonosAcumulados: 40, saldoPendiente: 110 },
    { cuotaId: "3", numeroCuota: 3, valorEsperado: 150, fechaVencimiento: "2026-08-15", estatus: "atrasada", abonosAcumulados: 0, saldoPendiente: 150 },
    { cuotaId: "4", numeroCuota: 4, valorEsperado: 150, fechaVencimiento: "2026-08-22", estatus: "pendiente", abonosAcumulados: 0, saldoPendiente: 150 },
  ],
  totalAbonos: 40,
  saldoPendiente: 410,
  proximoVencimiento: "2026-08-08",
};

async function renderConEstado(
  api: Partial<SessionValue["api"]>,
  route: Partial<{
    carteraId: string;
    prestamoId: string;
    clienteNombre: string;
    telefonoWhatsapp: string;
    valor: number;
    numCuotas: number;
  }> = {},
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
    negociosPendientes: [],
    membresiaToken: null,
    invitaciones: [],
    seleccionarNegocio: jest.fn(),
    resolverInvitacion: jest.fn(),
  };
  return render(
    <OfflineContext.Provider value={offline}>
      <SessionContext.Provider value={valor}>
        <PrestamoScreen
          navigation={{ goBack: jest.fn() } as never}
          route={{
            key: "prestamo",
            name: "Prestamo",
            params: {
              carteraId: "6",
              prestamoId: "200",
              clienteNombre: "Juan Perez",
              telefonoWhatsapp: "+59170000000",
              valor: 1000,
              numCuotas: 8,
              ...route,
            },
          }}
        />
      </SessionContext.Provider>
    </OfflineContext.Provider>,
  );
}

describe("PrestamoScreen", () => {
  it("muestra el préstamo y el canvas de cuotas clasificadas", async () => {
    const { getByText, getByTestId } = await renderConEstado({
      obtenerEstadoCuentaPrestamo: jest.fn().mockResolvedValue(estadoCuenta),
    });

    await waitFor(() => expect(getByText("Juan Perez")).toBeTruthy());
    expect(getByTestId("cuota-1")).toBeTruthy();
    expect(getByTestId("cuota-2")).toBeTruthy();
    expect(getByTestId("cuota-4")).toBeTruthy();
    expect(getByText(/Abonos totales: 40/)).toBeTruthy();
    expect(getByText(/Saldo: 410/)).toBeTruthy();
  });

  it("muestra la leyenda con los estados del canvas", async () => {
    const { getAllByText } = await renderConEstado({
      obtenerEstadoCuentaPrestamo: jest.fn().mockResolvedValue(estadoCuenta),
    });

    await waitFor(() =>
      expect(getAllByText("Pagada").length).toBeGreaterThan(0),
    );
    expect(getAllByText(/Cuota actual/).length).toBeGreaterThan(0);
    expect(getAllByText("En mora").length).toBeGreaterThan(0);
    expect(getAllByText("Futura").length).toBeGreaterThan(0);
  });

  it("muestra el monto abonado dentro de la cuota con abono", async () => {
    const { getByText } = await renderConEstado({
      obtenerEstadoCuentaPrestamo: jest.fn().mockResolvedValue(estadoCuenta),
    });

    await waitFor(() => expect(getByText(/Abonado: 40/)).toBeTruthy());
  });

  it("muestra error y permite reintentar", async () => {
    const obtener = jest
      .fn()
      .mockRejectedValueOnce(new Error("red"))
      .mockResolvedValueOnce(estadoCuenta);
    const { getByTestId, getByText } = await renderConEstado({
      obtenerEstadoCuentaPrestamo: obtener,
    });

    await waitFor(() => expect(getByText("Reintentar")).toBeTruthy());
    await fireEvent.press(getByTestId("reintentar"));

    await waitFor(() => expect(getByText(/Saldo: 410/)).toBeTruthy());
  });

  it("envía por WhatsApp el estado de cuenta al tocar el botón", async () => {
    const openSpy = jest.spyOn(Linking, "openURL").mockResolvedValue(true as never);
    const { getByTestId } = await renderConEstado({
      obtenerEstadoCuentaPrestamo: jest.fn().mockResolvedValue(estadoCuenta),
    });

    await waitFor(() => expect(getByTestId("btn-whatsapp-canvas")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-whatsapp-canvas"));

    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining("wa.me/59170000000"));
    expect(openSpy.mock.calls[0][0]).toContain(encodeURIComponent("Estado de cuenta de Juan Perez"));
    openSpy.mockRestore();
  });
});
